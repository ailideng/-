import './render';
import CardGameEngine from './card-game-engine';

const ctx = canvas.getContext('2d');
const DESIGN = {
  ink: '#101817',
  table: '#16352F',
  rail: '#C2A25C',
  paper: '#F7F2E8',
  mutedPaper: '#D9D2C4',
  ruby: '#9D3037',
  jade: '#31A982',
  shadow: 'rgba(0, 0, 0, 0.22)',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function hit(rect, x, y) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

export default class Main {
  constructor() {
    this.scene = 'menu';
    this.engine = null;
    this.buttons = [];
    this.cardHits = [];
    this.botTimer = null;
    this.lastFrameTime = 0;
    this.touchHandler = this.handleTouchStart.bind(this);

    if (wx.offTouchStart) {
      wx.offTouchStart(this.touchHandler);
    }
    wx.onTouchStart(this.touchHandler);

    this.loop = this.loop.bind(this);
    this.loop();
  }

  startGame(mode) {
    this.engine = new CardGameEngine();
    this.engine.start(mode);
    this.scene = 'playing';
    this.scheduleBotMove();
  }

  restart() {
    this.scene = 'menu';
    this.engine = null;
    this.buttons = [];
    this.cardHits = [];
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

    this.botTimer = setTimeout(() => {
      if (!this.engine || this.engine.finished || this.engine.currentPlayerIndex !== 1) {
        return;
      }

      const index = this.engine.chooseBotCardIndex();
      this.engine.playCard(1, index);

      if (this.engine.finished) {
        this.scene = 'over';
      }

      this.scheduleBotMove();
    }, 760);
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

    if (this.scene !== 'playing' || !this.engine || this.engine.finished) {
      return;
    }

    for (let i = 0; i < this.cardHits.length; i++) {
      const cardHit = this.cardHits[i];

      if (hit(cardHit, x, y)) {
        this.playSelectedCard(cardHit.playerIndex, cardHit.cardIndex);
        return;
      }
    }
  }

  playSelectedCard(playerIndex, cardIndex) {
    if (!this.engine || playerIndex !== this.engine.currentPlayerIndex) {
      return;
    }

    if (this.engine.mode === 'bot' && playerIndex === 1) {
      return;
    }

    this.engine.playCard(playerIndex, cardIndex);

    if (this.engine.finished) {
      this.scene = 'over';
      return;
    }

    this.scheduleBotMove();
  }

  loop(timestamp) {
    this.lastFrameTime = timestamp || this.lastFrameTime;
    this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.buttons = [];
    this.cardHits = [];

    this.drawBackground();

    if (this.scene === 'menu') {
      this.drawMenu();
      return;
    }

    this.drawGame();

    if (this.scene === 'over') {
      this.drawResultModal();
    }
  }

  drawBackground() {
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = DESIGN.ink;
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#183F35');
    gradient.addColorStop(0.54, DESIGN.table);
    gradient.addColorStop(1, '#0D1716');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(194, 162, 92, 0.16)';
    ctx.lineWidth = 1;
    for (let y = 38; y < height; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + 18);
      ctx.stroke();
    }
  }

  drawMenu() {
    const width = canvas.width;
    const height = canvas.height;
    const safeTop = 44;
    const panelX = 22;
    const panelY = safeTop + 26;
    const panelW = width - panelX * 2;
    const panelH = Math.min(470, height - panelY - 34);

    this.drawPanel(panelX, panelY, panelW, panelH, 18, 'rgba(247, 242, 232, 0.95)');

    ctx.fillStyle = DESIGN.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 38px serif';
    ctx.fillText('开火车', panelX + 24, panelY + 28);

    ctx.fillStyle = DESIGN.ruby;
    ctx.font = '700 14px sans-serif';
    ctx.fillText('回合制扑克收牌对战', panelX + 28, panelY + 82);

    ctx.fillStyle = '#38413E';
    ctx.font = '15px sans-serif';
    this.drawWrappedText(
      '打出一张牌接到火车尾。若点数撞上序列里最近的一张同点牌，就收走两张牌之间整段车厢。',
      panelX + 28,
      panelY + 118,
      panelW - 56,
      24,
    );

    this.drawRailMark(panelX + 30, panelY + 198, panelW - 60);

    this.drawButton({
      x: panelX + 24,
      y: panelY + panelH - 154,
      w: panelW - 48,
      h: 58,
      label: '匹配 / 人机对战',
      subLabel: '先进入机器人练习，后续接入在线匹配',
      primary: true,
      onTap: () => this.startGame('bot'),
    });

    this.drawButton({
      x: panelX + 24,
      y: panelY + panelH - 82,
      w: panelW - 48,
      h: 58,
      label: '创建房间',
      subLabel: '本机双人轮流点击，后续接邀请好友',
      primary: false,
      onTap: () => this.startGame('local'),
    });
  }

  drawGame() {
    const width = canvas.width;
    const height = canvas.height;
    const topAreaH = 180;
    const bottomAreaH = 178;
    const centerY = topAreaH + 10;
    const centerH = height - topAreaH - bottomAreaH - 16;

    this.drawStatusBar(14, 18, width - 28, 70);
    this.drawPlayerArea(1, 14, 96, width - 28, 86, true);
    this.drawTrainArea(14, centerY, width - 28, centerH);
    this.drawPlayerArea(0, 14, height - bottomAreaH, width - 28, bottomAreaH - 18, false);
  }

  drawStatusBar(x, y, width, height) {
    const current = this.engine.players[this.engine.currentPlayerIndex];
    const badgeW = Math.min(178, width * 0.5);

    this.drawPanel(x, y, width, height, 14, 'rgba(10, 20, 18, 0.62)');

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 18px sans-serif';
    ctx.fillText(`轮到 ${current.name}`, x + 18, y + 22);

    ctx.fillStyle = DESIGN.mutedPaper;
    ctx.font = '12px sans-serif';
    ctx.fillText(this.engine.lastMessage, x + 18, y + 50);

    this.drawMetricPill(x + width - badgeW - 12, y + 12, badgeW, 46, [
      `牌堆 ${this.engine.deck.length}`,
      `车厢 ${this.engine.train.length}`,
    ]);
  }

  drawPlayerArea(playerIndex, x, y, width, height, compact) {
    const player = this.engine.players[playerIndex];
    const isCurrent = playerIndex === this.engine.currentPlayerIndex;
    const labelY = y + 12;
    const cardY = y + (compact ? 32 : 44);
    const cardH = compact ? 54 : 78;
    const cardW = compact ? 38 : 50;
    const gap = compact ? 6 : 8;
    const maxCards = Math.max(1, player.hand.length);
    const fittedGap = maxCards > 1
      ? Math.min(gap, Math.max(2, (width - 28 - cardW * maxCards) / (maxCards - 1)))
      : gap;
    const startX = x + 14;

    this.drawPanel(
      x,
      y,
      width,
      height,
      14,
      isCurrent ? 'rgba(247, 242, 232, 0.18)' : 'rgba(10, 20, 18, 0.38)',
    );

    ctx.fillStyle = isCurrent ? DESIGN.paper : DESIGN.mutedPaper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 14px sans-serif';
    ctx.fillText(`${player.name} 手牌`, x + 14, labelY);

    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillText(`出牌 ${player.playCount} / 赢牌 ${player.won.length}`, x + width - 14, labelY + 1);

    player.hand.forEach((card, index) => {
      const cardX = startX + index * (cardW + fittedGap);
      const disabled = !isCurrent || (this.engine.mode === 'bot' && playerIndex === 1);

      this.drawCard(card, cardX, cardY, cardW, cardH, {
        compact,
        active: isCurrent && !disabled,
      });

      if (!disabled) {
        this.cardHits.push({
          x: cardX,
          y: cardY,
          w: cardW,
          h: cardH,
          playerIndex,
          cardIndex: index,
        });
      }
    });

    if (player.hand.length === 0) {
      ctx.fillStyle = 'rgba(247, 242, 232, 0.56)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '13px sans-serif';
      ctx.fillText('手牌为空', x + width / 2, cardY + cardH / 2);
    }
  }

  drawTrainArea(x, y, width, height) {
    const visibleCards = this.engine.train.slice(-18);
    const hiddenCount = this.engine.train.length - visibleCards.length;
    const cols = 6;
    const gap = 8;
    const cardW = Math.floor((width - 32 - gap * (cols - 1)) / cols);
    const cardH = clamp(Math.floor(cardW * 1.34), 48, 68);
    const startX = x + 16;
    const startY = y + 54;

    this.drawPanel(x, y, width, height, 16, 'rgba(247, 242, 232, 0.1)');

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('公共序列', x + 16, y + 16);

    ctx.fillStyle = DESIGN.mutedPaper;
    ctx.font = '12px sans-serif';
    ctx.fillText(hiddenCount > 0 ? `显示最近 18 张，前方还有 ${hiddenCount} 张` : '火车尾在右下方', x + 104, y + 19);

    this.drawRailLine(startX, startY - 16, width - 32);

    visibleCards.forEach((card, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const cardX = startX + col * (cardW + gap);
      const cardY = startY + row * (cardH + 10);
      const isTail = index === visibleCards.length - 1;

      this.drawCard(card, cardX, cardY, cardW, cardH, {
        compact: true,
        active: isTail,
        tail: isTail,
      });
    });

    if (visibleCards.length === 0) {
      ctx.fillStyle = 'rgba(247, 242, 232, 0.58)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '14px sans-serif';
      ctx.fillText('等待第一张牌驶入', x + width / 2, y + height / 2);
    }
  }

  drawResultModal() {
    const width = canvas.width;
    const height = canvas.height;
    const modalW = width - 44;
    const modalH = 330;
    const x = 22;
    const y = (height - modalH) / 2;
    const scoreA = this.engine.getPlayerTotal(0);
    const scoreB = this.engine.getPlayerTotal(1);
    const winner = scoreA === scoreB ? '平局' : (scoreA > scoreB ? '玩家A 获胜' : `${this.engine.players[1].name} 获胜`);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fillRect(0, 0, width, height);
    this.drawPanel(x, y, modalW, modalH, 18, 'rgba(247, 242, 232, 0.98)');

    ctx.fillStyle = DESIGN.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '700 28px serif';
    ctx.fillText('牌局结算', width / 2, y + 28);

    ctx.fillStyle = DESIGN.ruby;
    ctx.font = '700 16px sans-serif';
    ctx.fillText(winner, width / 2, y + 70);

    this.drawScoreRow(this.engine.players[0], scoreA, x + 28, y + 118, modalW - 56);
    this.drawScoreRow(this.engine.players[1], scoreB, x + 28, y + 176, modalW - 56);

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
    ctx.fillStyle = 'rgba(16, 24, 23, 0.08)';
    roundRect(ctx, x, y, width, 46, 10);
    ctx.fill();

    ctx.fillStyle = DESIGN.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px sans-serif';
    ctx.fillText(player.name, x + 14, y + 23);

    ctx.fillStyle = '#56605C';
    ctx.font = '12px sans-serif';
    ctx.fillText(`配对 ${player.captures.length} 次 / 赢牌 ${player.won.length} 张`, x + 86, y + 23);

    ctx.fillStyle = DESIGN.ruby;
    ctx.textAlign = 'right';
    ctx.font = '700 20px sans-serif';
    ctx.fillText(`${score}`, x + width - 14, y + 23);
  }

  drawCard(card, x, y, width, height, options = {}) {
    const active = options.active;
    const tail = options.tail;
    const radius = Math.min(8, width * 0.18);

    ctx.save();
    ctx.shadowColor = active ? 'rgba(194, 162, 92, 0.34)' : DESIGN.shadow;
    ctx.shadowBlur = active ? 12 : 5;
    ctx.shadowOffsetY = active ? 2 : 3;

    ctx.fillStyle = DESIGN.paper;
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = tail ? DESIGN.rail : 'rgba(16, 24, 23, 0.18)';
    ctx.lineWidth = tail ? 2 : 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
    ctx.stroke();

    ctx.fillStyle = card.color === 'red' ? DESIGN.ruby : (card.color === 'joker' ? DESIGN.jade : DESIGN.ink);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${options.compact ? 13 : 16}px sans-serif`;
    ctx.fillText(card.rank, x + width / 2, y + height * 0.4);

    if (card.suit) {
      ctx.font = `${options.compact ? 14 : 17}px serif`;
      ctx.fillText(card.suit, x + width / 2, y + height * 0.68);
    }
  }

  drawButton({ x, y, w, h, label, subLabel, primary, onTap }) {
    ctx.save();
    ctx.shadowColor = primary ? 'rgba(157, 48, 55, 0.28)' : 'rgba(0, 0, 0, 0.16)';
    ctx.shadowBlur = primary ? 14 : 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = primary ? DESIGN.ruby : '#FFFFFF';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = primary ? 'rgba(255, 255, 255, 0.18)' : 'rgba(16, 24, 23, 0.14)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 12);
    ctx.stroke();

    ctx.fillStyle = primary ? '#FFF7EC' : DESIGN.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 16px sans-serif';
    ctx.fillText(label, x + 18, y + 10);

    ctx.fillStyle = primary ? 'rgba(255, 247, 236, 0.72)' : '#6A716D';
    ctx.font = '12px sans-serif';
    ctx.fillText(subLabel, x + 18, y + 34);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('›', x + w - 18, y + h / 2);

    this.buttons.push({ x, y, w, h, onTap });
  }

  drawPanel(x, y, width, height, radius, fillStyle) {
    ctx.fillStyle = fillStyle;
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(247, 242, 232, 0.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
    ctx.stroke();
  }

  drawRailMark(x, y, width) {
    ctx.strokeStyle = DESIGN.rail;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    for (let i = 0; i <= 5; i++) {
      const railX = x + (width / 5) * i;
      ctx.fillStyle = i % 2 === 0 ? DESIGN.ruby : DESIGN.jade;
      ctx.beginPath();
      ctx.arc(railX, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawRailLine(x, y, width) {
    ctx.strokeStyle = 'rgba(194, 162, 92, 0.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  drawMetricPill(x, y, width, height, lines) {
    ctx.fillStyle = 'rgba(247, 242, 232, 0.12)';
    roundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    ctx.fillStyle = DESIGN.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 13px sans-serif';
    ctx.fillText(lines[0], x + width / 2, y + 15);

    ctx.fillStyle = DESIGN.mutedPaper;
    ctx.font = '12px sans-serif';
    ctx.fillText(lines[1], x + width / 2, y + 32);
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight) {
    let line = '';
    let lineY = y;

    for (let i = 0; i < text.length; i++) {
      const testLine = line + text[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
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
