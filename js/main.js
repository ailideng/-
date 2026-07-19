import './render';
import CardGameEngine from './card-game-engine';
import {
  DESIGN,
  clamp,
  drawCard,
  drawGlassPanel,
  drawIcon,
  drawTableBackground,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  roundRect,
} from './card-visuals';

const ctx = canvas.getContext('2d');

function hit(rect, x, y) {
  return (
    rect &&
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

function nowMs() {
  return Date.now();
}

export default class Main {
  constructor() {
    this.scene = 'menu';
    this.visibilityMode = 'hidden';
    this.engine = null;
    this.buttons = [];
    this.cardHits = [];
    this.animations = [];
    this.hiddenTrainCardIds = {};
    this.scorePileRects = [];
    this.inputLockedUntil = 0;
    this.pendingOver = false;
    this.botTimer = null;
    this.pressedCardId = null;
    this.pressUntil = 0;
    this.touchHandler = this.handleTouchStart.bind(this);
    this.loop = this.loop.bind(this);

    if (wx.offTouchStart) {
      wx.offTouchStart(this.touchHandler);
    }
    wx.onTouchStart(this.touchHandler);
    this.loop();
  }

  startGame(mode) {
    this.engine = new CardGameEngine();
    this.engine.start(mode);
    this.scene = 'playing';
    this.animations = [];
    this.hiddenTrainCardIds = {};
    this.inputLockedUntil = 0;
    this.pendingOver = false;
    this.clearBotTimer();
    this.scheduleBotMove();
  }

  restart() {
    this.scene = 'menu';
    this.engine = null;
    this.buttons = [];
    this.cardHits = [];
    this.animations = [];
    this.hiddenTrainCardIds = {};
    this.pendingOver = false;
    this.clearBotTimer();
  }

  clearBotTimer() {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
  }

  scheduleBotMove() {
    this.clearBotTimer();

    if (
      !this.engine ||
      this.scene !== 'playing' ||
      this.engine.finished ||
      this.engine.mode !== 'bot' ||
      this.engine.currentPlayerIndex !== 1
    ) {
      return;
    }

    const delay = Math.max(500, this.inputLockedUntil - nowMs() + 520);
    this.botTimer = setTimeout(() => {
      if (
        !this.engine ||
        this.scene !== 'playing' ||
        this.engine.finished ||
        this.engine.currentPlayerIndex !== 1 ||
        nowMs() < this.inputLockedUntil
      ) {
        this.scheduleBotMove();
        return;
      }

      const index = this.engine.chooseBotCardIndex();
      const source = this.getHandLayout(1).cards[index];
      this.playCardWithAnimation(1, index, source);
    }, delay);
  }

  handleTouchStart(event) {
    const touch = event.touches && event.touches[0];

    if (!touch) {
      return;
    }

    const x = touch.clientX;
    const y = touch.clientY;

    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];

      if (hit(button, x, y)) {
        button.onTap();
        return;
      }
    }

    if (
      this.scene !== 'playing' ||
      !this.engine ||
      this.engine.finished ||
      nowMs() < this.inputLockedUntil
    ) {
      return;
    }

    for (let i = this.cardHits.length - 1; i >= 0; i--) {
      const cardHit = this.cardHits[i];

      if (hit(cardHit, x, y)) {
        this.playSelectedCard(cardHit);
        return;
      }
    }
  }

  playSelectedCard(cardHit) {
    if (!this.engine || cardHit.playerIndex !== this.engine.currentPlayerIndex) {
      return;
    }

    if (this.engine.mode === 'bot' && cardHit.playerIndex === 1) {
      return;
    }

    this.pressedCardId = cardHit.card.id;
    this.pressUntil = nowMs() + 150;
    this.playCardWithAnimation(cardHit.playerIndex, cardHit.cardIndex, cardHit);
  }

  playCardWithAnimation(playerIndex, cardIndex, sourceRect) {
    if (!this.engine || playerIndex !== this.engine.currentPlayerIndex) {
      return;
    }

    const player = this.engine.players[playerIndex];
    const playedCard = player.hand[cardIndex];

    if (!playedCard) {
      return;
    }

    const sourceFaceUp = this.isCardFaceVisible(playerIndex);
    const trainBefore = this.engine.train.slice();
    const trainAfterInsertion = trainBefore.concat([playedCard]);
    const insertedRects = this.getTrainLayout(trainAfterInsertion).cards;
    const targetRect = insertedRects[insertedRects.length - 1] || this.getFallbackTrainTarget();
    const insertedRectById = {};
    insertedRects.forEach((rect) => {
      insertedRectById[rect.card.id] = rect;
    });

    const result = this.engine.playCard(playerIndex, cardIndex);

    if (!result) {
      return;
    }

    const startedAt = nowMs();
    const hasCapture = !!result.capture;
    const insertDuration = 420;
    const captureDelay = hasCapture ? insertDuration - 40 : 0;
    const captureDuration = hasCapture ? 680 : 0;
    const totalLock = insertDuration + captureDuration + (hasCapture ? 80 : 0);

    this.hiddenTrainCardIds[playedCard.id] = true;
    this.animations.push({
      type: 'play',
      card: playedCard,
      from: sourceRect,
      to: targetRect,
      start: startedAt,
      duration: insertDuration,
      flip: !sourceFaceUp,
      releaseTrainCard: !hasCapture,
    });

    if (hasCapture) {
      const pile = this.scorePileRects[playerIndex] || this.getScorePileRect(playerIndex);
      const cards = result.capture.cards.map((card, index) => ({
        card,
        from: insertedRectById[card.id] || targetRect,
        to: {
          x: pile.x + (index % 3) * 3,
          y: pile.y + (index % 4) * 2,
          w: pile.w,
          h: pile.h,
          rotation: playerIndex === 0 ? -0.1 : 0.1,
        },
      }));

      this.animations.push({
        type: 'capture',
        playerIndex,
        cards,
        start: startedAt + captureDelay,
        duration: captureDuration,
      });
    }

    this.inputLockedUntil = startedAt + totalLock;
    this.pendingOver = this.engine.finished;

    if (!this.pendingOver) {
      this.scheduleBotMove();
    }
  }

  loop() {
    const tick = nowMs();
    this.updateAnimations(tick);
    this.render(tick);
    requestAnimationFrame(this.loop);
  }

  updateAnimations(tick) {
    if (this.pressedCardId && tick > this.pressUntil) {
      this.pressedCardId = null;
    }

    this.animations = this.animations.filter((animation) => {
      const done = tick >= animation.start + animation.duration;

      if (done && animation.type === 'play' && animation.releaseTrainCard) {
        delete this.hiddenTrainCardIds[animation.card.id];
      }

      return !done;
    });

    if (this.pendingOver && tick >= this.inputLockedUntil) {
      this.scene = 'over';
      this.pendingOver = false;
    }
  }

  render(tick) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.buttons = [];
    this.cardHits = [];
    this.scorePileRects = [this.getScorePileRect(0), this.getScorePileRect(1)];

    drawTableBackground(ctx, canvas.width, canvas.height, tick);

    if (this.scene === 'menu') {
      this.drawMenu();
      return;
    }

    this.drawGame(tick);
    this.drawAnimations(tick);

    if (this.scene === 'over') {
      this.drawResultModal();
    }
  }

  drawMenu() {
    const width = canvas.width;
    const height = canvas.height;
    const panelX = 22;
    const panelY = 82;
    const panelW = width - 44;
    const panelH = Math.min(560, height - 120);

    drawGlassPanel(ctx, panelX, panelY, panelW, panelH, 24, true);

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 42px serif';
    ctx.fillText('开火车', panelX + 24, panelY + 24);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.76)';
    ctx.font = '13px sans-serif';
    ctx.fillText('双人回合制扑克收牌对战', panelX + 28, panelY + 78);

    this.drawSampleCards(panelX + 34, panelY + 120);
    this.drawVisibilityToggle(panelX + 24, panelY + 240, panelW - 48);

    this.drawButton({
      x: panelX + 24,
      y: panelY + panelH - 148,
      w: panelW - 48,
      h: 58,
      label: '匹配 / 人机对战',
      subLabel: '先进入机器人练习，后续接入在线匹配',
      primary: true,
      onTap: () => this.startGame('bot'),
    });

    this.drawButton({
      x: panelX + 24,
      y: panelY + panelH - 78,
      w: panelW - 48,
      h: 58,
      label: '创建房间',
      subLabel: '本机双人轮流点击，后续接邀请好友',
      primary: false,
      onTap: () => this.startGame('local'),
    });
  }

  drawSampleCards(x, y) {
    const samples = [
      { id: 901, rank: 'A', suit: '♠', color: 'black' },
      { id: 902, rank: '10', suit: '♥', color: 'red' },
      { id: 903, rank: 'K', suit: '♦', color: 'red' },
    ];

    samples.forEach((card, index) => {
      drawCard(ctx, card, x + index * 54, y + Math.abs(index - 1) * 8, 58, 82, {
        rotation: (index - 1) * 0.12,
        glow: index === 1,
      });
    });

    ctx.fillStyle = 'rgba(252, 250, 244, 0.8)';
    ctx.textAlign = 'left';
    ctx.font = '14px sans-serif';
    this.drawWrappedText(
      '同点相撞即收走整段火车。公共牌池、出牌次数和赢牌堆会实时影响最终分数。',
      x + 176,
      y + 8,
      canvas.width - x - 206,
      22,
    );
  }

  drawVisibilityToggle(x, y, width) {
    drawGlassPanel(ctx, x, y, width, 76, 18, false);
    drawIcon(ctx, 'eye', x + 16, y + 21, 32, DESIGN.brass);

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 15px sans-serif';
    ctx.fillText('手牌可见性', x + 58, y + 14);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.68)';
    ctx.font = '12px sans-serif';
    ctx.fillText(this.visibilityMode === 'hidden' ? '暗牌：仅当前视角可见手牌' : '明牌：双方手牌全程可见', x + 58, y + 40);

    const switchRect = { x: x + width - 84, y: y + 22, w: 58, h: 30 };
    ctx.fillStyle = this.visibilityMode === 'revealed' ? DESIGN.jade : 'rgba(0, 0, 0, 0.32)';
    roundRect(ctx, switchRect.x, switchRect.y, switchRect.w, switchRect.h, 15);
    ctx.fill();

    ctx.fillStyle = DESIGN.paper;
    ctx.beginPath();
    ctx.arc(
      switchRect.x + (this.visibilityMode === 'revealed' ? 42 : 16),
      switchRect.y + 15,
      11,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    this.buttons.push({
      ...switchRect,
      onTap: () => {
        this.visibilityMode = this.visibilityMode === 'hidden' ? 'revealed' : 'hidden';
      },
    });
  }

  drawGame(tick) {
    const areas = this.getAreas();

    this.drawStatusBar(areas.status);
    this.drawPlayerArea(1, areas.opponent, true, tick);
    this.drawTrainArea(areas.train);
    this.drawPlayerArea(0, areas.player, false, tick);
  }

  getAreas() {
    const width = canvas.width;
    const height = canvas.height;
    const bottomH = 192;
    const topH = 120;
    const trainY = 222;
    const trainH = Math.max(190, height - bottomH - trainY - 12);

    return {
      status: { x: 14, y: 18, w: width - 28, h: 74 },
      opponent: { x: 14, y: 102, w: width - 28, h: topH },
      train: { x: 14, y: trainY, w: width - 28, h: trainH },
      player: { x: 14, y: height - bottomH + 12, w: width - 28, h: bottomH - 24 },
    };
  }

  drawStatusBar(area) {
    const current = this.engine.players[this.engine.currentPlayerIndex];
    const scoreA = this.engine.getPlayerTotal(0);
    const scoreB = this.engine.getPlayerTotal(1);

    drawGlassPanel(ctx, area.x, area.y, area.w, area.h, 18, true);

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 16px sans-serif';
    ctx.fillText(`轮到 ${current.name}`, area.x + 16, area.y + 12);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.62)';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.engine.lastMessage, area.x + 16, area.y + 38);

    this.drawInfoChip(area.x + area.w - 206, area.y + 12, 58, 'deck', `${this.engine.deck.length}`, '牌堆');
    this.drawInfoChip(area.x + area.w - 140, area.y + 12, 62, 'plays', `${this.engine.players[0].playCount}/${this.engine.players[1].playCount}`, '出牌');
    this.drawInfoChip(area.x + area.w - 70, area.y + 12, 58, 'score', `${scoreA}:${scoreB}`, '分数');
  }

  drawInfoChip(x, y, width, icon, value, label) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    roundRect(ctx, x, y, width, 50, 14);
    ctx.fill();
    drawIcon(ctx, icon, x + 8, y + 12, 26, DESIGN.brass);

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 13px sans-serif';
    ctx.fillText(value, x + 38, y + 9);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.58)';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, x + 38, y + 29);
  }

  drawPlayerArea(playerIndex, area, compact, tick) {
    const player = this.engine.players[playerIndex];
    const active = playerIndex === this.engine.currentPlayerIndex;
    const layout = this.getHandLayout(playerIndex);
    const pile = this.scorePileRects[playerIndex];

    drawGlassPanel(ctx, area.x, area.y, area.w, area.h, 18, active);

    ctx.fillStyle = active ? DESIGN.paper : 'rgba(252, 250, 244, 0.72)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 14px sans-serif';
    ctx.fillText(player.name, area.x + 14, area.y + 12);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.62)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`出牌 ${player.playCount} · 赢牌 ${player.won.length}`, area.x + 14, area.y + 34);

    this.drawScorePile(playerIndex, pile);

    player.hand.forEach((card, index) => {
      const rect = layout.cards[index];
      const disabled = !active || (this.engine.mode === 'bot' && playerIndex === 1) || nowMs() < this.inputLockedUntil;
      const faceUp = this.isCardFaceVisible(playerIndex);
      const pressed = this.pressedCardId === card.id && tick < this.pressUntil;

      drawCard(ctx, card, rect.x, rect.y, rect.w, rect.h, {
        faceUp,
        rotation: rect.rotation,
        pressed,
        glow: active && !disabled,
      });

      if (!disabled) {
        this.cardHits.push({
          ...rect,
          playerIndex,
          cardIndex: index,
          card,
        });
      }
    });

    if (player.hand.length === 0) {
      ctx.fillStyle = 'rgba(252, 250, 244, 0.56)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '13px sans-serif';
      ctx.fillText('手牌为空', area.x + area.w / 2, area.y + area.h / 2 + (compact ? 8 : 0));
    }
  }

  drawScorePile(playerIndex, pile) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    drawCard(ctx, { id: -playerIndex, rank: '', suit: '', color: 'black' }, pile.x, pile.y, pile.w, pile.h, {
      faceUp: false,
      rotation: playerIndex === 0 ? -0.08 : 0.08,
    });
    ctx.restore();

    ctx.fillStyle = DESIGN.brass;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px sans-serif';
    ctx.fillText(`${this.engine.players[playerIndex].won.length}`, pile.x + pile.w / 2, pile.y + pile.h + 12);
  }

  drawTrainArea(area) {
    const layout = this.getTrainLayout(this.engine.train);
    const hiddenCount = Math.max(0, this.engine.train.length - layout.cards.length);

    drawGlassPanel(ctx, area.x, area.y, area.w, area.h, 20, false);

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('公共牌池', area.x + 16, area.y + 14);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.58)';
    ctx.font = '11px sans-serif';
    ctx.fillText(hiddenCount ? `最近 18 张 · 前方 ${hiddenCount} 张` : '火车尾在右下角，配对时收走中间整段', area.x + 98, area.y + 18);

    this.drawTrainTrack(area.x + 18, area.y + 52, area.w - 36, area.h - 72);

    layout.cards.forEach((rect, index) => {
      if (this.hiddenTrainCardIds[rect.card.id]) {
        return;
      }

      drawCard(ctx, rect.card, rect.x, rect.y, rect.w, rect.h, {
        faceUp: true,
        rotation: rect.rotation,
        glow: index === layout.cards.length - 1,
      });
    });

    if (layout.cards.length === 0 && this.animations.length === 0) {
      ctx.fillStyle = 'rgba(252, 250, 244, 0.58)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '14px sans-serif';
      ctx.fillText('等待第一张牌驶入', area.x + area.w / 2, area.y + area.h / 2);
    }
  }

  drawTrainTrack(x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(208, 168, 92, 0.52)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      const railY = y + row * ((height - 36) / 2) + 20;
      ctx.beginPath();
      ctx.moveTo(x, railY);
      ctx.lineTo(x + width, railY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(208, 168, 92, 0.28)';
      for (let i = 0; i < 7; i++) {
        const sleeperX = x + i * (width / 6);
        ctx.beginPath();
        ctx.moveTo(sleeperX - 8, railY - 7);
        ctx.lineTo(sleeperX + 8, railY + 7);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(208, 168, 92, 0.52)';
    }
    ctx.restore();
  }

  drawAnimations(tick) {
    this.animations.forEach((animation) => {
      if (animation.type === 'play') {
        this.drawPlayAnimation(animation, tick);
      } else if (animation.type === 'capture') {
        this.drawCaptureAnimation(animation, tick);
      }
    });
  }

  drawPlayAnimation(animation, tick) {
    const raw = clamp((tick - animation.start) / animation.duration, 0, 1);
    const p = easeOutCubic(raw);
    const x = lerp(animation.from.x, animation.to.x, p);
    const y = lerp(animation.from.y, animation.to.y, p) - Math.sin(p * Math.PI) * 26;
    const w = lerp(animation.from.w, animation.to.w, p);
    const h = lerp(animation.from.h, animation.to.h, p);
    const rotation = lerp(animation.from.rotation || 0, animation.to.rotation || 0, p) + Math.sin(p * Math.PI) * 0.06;
    const flipScale = animation.flip ? Math.max(0.08, Math.abs(raw * 2 - 1)) : 1;
    const faceUp = !animation.flip || raw > 0.48;

    drawCard(ctx, animation.card, x, y, w, h, {
      faceUp,
      rotation,
      scaleX: flipScale,
      glow: true,
    });
  }

  drawCaptureAnimation(animation, tick) {
    const raw = clamp((tick - animation.start) / animation.duration, 0, 1);

    animation.cards.forEach((item, index) => {
      const offset = index * 0.035;
      const p = easeInOutCubic(clamp((raw - offset) / (1 - offset), 0, 1));
      const lift = Math.sin(p * Math.PI) * 34;
      const x = lerp(item.from.x, item.to.x, p);
      const y = lerp(item.from.y, item.to.y, p) - lift;
      const w = lerp(item.from.w, item.to.w, p);
      const h = lerp(item.from.h, item.to.h, p);
      const rotation = lerp(item.from.rotation || 0, item.to.rotation || 0, p) + (index - animation.cards.length / 2) * 0.012;

      drawCard(ctx, item.card, x, y, w, h, {
        faceUp: true,
        rotation,
        alpha: 1 - Math.max(0, p - 0.86) * 2.5,
        glow: true,
      });
    });
  }

  drawResultModal() {
    const width = canvas.width;
    const height = canvas.height;
    const modalW = width - 44;
    const modalH = 350;
    const x = 22;
    const y = (height - modalH) / 2;
    const scoreA = this.engine.getPlayerTotal(0);
    const scoreB = this.engine.getPlayerTotal(1);
    const winner = scoreA === scoreB ? '平局' : (scoreA > scoreB ? '玩家A 获胜' : `${this.engine.players[1].name} 获胜`);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.fillRect(0, 0, width, height);
    drawGlassPanel(ctx, x, y, modalW, modalH, 24, true);

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '700 30px serif';
    ctx.fillText('牌局结算', width / 2, y + 28);

    ctx.fillStyle = DESIGN.brass;
    ctx.font = '700 16px sans-serif';
    ctx.fillText(winner, width / 2, y + 70);

    this.drawScoreRow(this.engine.players[0], scoreA, x + 26, y + 118, modalW - 52);
    this.drawScoreRow(this.engine.players[1], scoreB, x + 26, y + 178, modalW - 52);

    this.drawButton({
      x: x + 26,
      y: y + modalH - 78,
      w: modalW - 52,
      h: 54,
      label: '返回初始界面',
      subLabel: '重新选择对战方式',
      primary: true,
      onTap: () => this.restart(),
    });
  }

  drawScoreRow(player, score, x, y, width) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    roundRect(ctx, x, y, width, 48, 14);
    ctx.fill();

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px sans-serif';
    ctx.fillText(player.name, x + 14, y + 24);

    ctx.fillStyle = 'rgba(252, 250, 244, 0.62)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`配对 ${player.captures.length} 次 · 赢牌 ${player.won.length} 张`, x + 92, y + 24);

    ctx.fillStyle = DESIGN.brass;
    ctx.textAlign = 'right';
    ctx.font = '700 22px sans-serif';
    ctx.fillText(`${score}`, x + width - 14, y + 24);
  }

  drawButton({ x, y, w, h, label, subLabel, primary, onTap }) {
    ctx.save();
    ctx.shadowColor = primary ? 'rgba(208, 168, 92, 0.38)' : 'rgba(0, 0, 0, 0.24)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 7;
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, primary ? '#BE3A43' : 'rgba(252, 250, 244, 0.96)');
    gradient.addColorStop(1, primary ? '#7F2029' : 'rgba(232, 224, 209, 0.94)');
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = primary ? 'rgba(252, 250, 244, 0.26)' : 'rgba(17, 23, 22, 0.16)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16);
    ctx.stroke();

    ctx.fillStyle = primary ? DESIGN.paper : DESIGN.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 16px sans-serif';
    ctx.fillText(label, x + 18, y + 9);

    ctx.fillStyle = primary ? 'rgba(252, 250, 244, 0.72)' : 'rgba(17, 23, 22, 0.58)';
    ctx.font = '12px sans-serif';
    ctx.fillText(subLabel, x + 18, y + 33);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('›', x + w - 18, y + h / 2);
    this.buttons.push({ x, y, w, h, onTap });
  }

  getHandLayout(playerIndex) {
    const areas = this.getAreas();
    const area = playerIndex === 0 ? areas.player : areas.opponent;
    const player = this.engine.players[playerIndex];
    const compact = playerIndex === 1;
    const cardW = compact ? 44 : 56;
    const cardH = compact ? 64 : 82;
    const count = player.hand.length;
    const usableW = area.w - 96;
    const step = count > 1 ? Math.min(cardW * 0.72, usableW / (count - 1)) : 0;
    const totalW = cardW + step * Math.max(0, count - 1);
    const startX = area.x + (area.w - totalW) / 2 - (compact ? 4 : 0);
    const baseY = compact ? area.y + 48 : area.y + 60;
    const angleStep = count > 1 ? Math.min(0.085, 0.36 / (count - 1)) : 0;
    const center = (count - 1) / 2;

    return {
      cards: player.hand.map((card, index) => {
        const offset = index - center;
        const rotation = offset * angleStep * (playerIndex === 0 ? 1 : -1);
        const fanLift = Math.abs(offset) * (compact ? 1.8 : 2.5);

        return {
          x: startX + index * step,
          y: baseY + fanLift,
          w: cardW,
          h: cardH,
          rotation,
          card,
        };
      }),
    };
  }

  getTrainLayout(cards) {
    const area = this.getAreas().train;
    const visible = cards.slice(-18);
    const cols = 6;
    const gap = 8;
    const cardW = Math.floor((area.w - 34 - gap * (cols - 1)) / cols);
    const cardH = clamp(Math.floor(cardW * 1.38), 54, 76);
    const startX = area.x + 17;
    const startY = area.y + 62;

    return {
      cards: visible.map((card, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        return {
          x: startX + col * (cardW + gap),
          y: startY + row * (cardH + 12),
          w: cardW,
          h: cardH,
          rotation: (index % 2 === 0 ? -0.012 : 0.012),
          card,
        };
      }),
    };
  }

  getFallbackTrainTarget() {
    const area = this.getAreas().train;
    return {
      x: area.x + area.w - 78,
      y: area.y + area.h - 86,
      w: 54,
      h: 74,
      rotation: 0,
    };
  }

  getScorePileRect(playerIndex) {
    const areas = this.getAreas();
    const area = playerIndex === 0 ? areas.player : areas.opponent;
    return {
      x: area.x + area.w - 68,
      y: area.y + (playerIndex === 0 ? 52 : 44),
      w: playerIndex === 0 ? 44 : 36,
      h: playerIndex === 0 ? 62 : 52,
    };
  }

  isCardFaceVisible(playerIndex) {
    if (this.visibilityMode === 'revealed') {
      return true;
    }

    if (this.engine.mode === 'bot') {
      return playerIndex === 0;
    }

    return playerIndex === this.engine.currentPlayerIndex;
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight) {
    let line = '';
    let lineY = y;

    for (let i = 0; i < text.length; i++) {
      const testLine = line + text[i];

      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = text[i];
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ctx.fillText(line, x, lineY);
    }
  }
}
