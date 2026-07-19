const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
  { symbol: '♠', color: 'black' },
  { symbol: '♥', color: 'red' },
  { symbol: '♣', color: 'black' },
  { symbol: '♦', color: 'red' },
];

function createDeck() {
  const deck = [];
  let id = 1;

  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: id++,
        rank,
        label: `${rank}${suit.symbol}`,
        suit: suit.symbol,
        color: suit.color,
        isJoker: false,
      });
    });
  });

  deck.push({
    id: id++,
    rank: '小王',
    label: '小王',
    suit: '',
    color: 'joker',
    isJoker: true,
  });
  deck.push({
    id: id++,
    rank: '大王',
    label: '大王',
    suit: '',
    color: 'joker',
    isJoker: true,
  });

  return deck;
}

function shuffle(cards) {
  const result = cards.slice();

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i];
    result[i] = result[j];
    result[j] = current;
  }

  return result;
}

function createPlayer(name) {
  return {
    name,
    hand: [],
    won: [],
    playCount: 0,
    captures: [],
  };
}

export default class CardGameEngine {
  constructor() {
    this.start('local');
  }

  start(mode) {
    this.mode = mode;
    this.deck = shuffle(createDeck());
    this.train = [];
    this.players = [createPlayer('玩家A'), createPlayer(mode === 'bot' ? '机器人B' : '玩家B')];
    this.currentPlayerIndex = 0;
    this.finished = false;
    this.lastCapture = null;
    this.lastMessage = '玩家A 先手';

    for (let i = 0; i < 5; i++) {
      this.drawCard(0);
      this.drawCard(1);
    }
  }

  drawCard(playerIndex) {
    if (this.deck.length === 0) {
      return null;
    }

    const card = this.deck.pop();
    this.players[playerIndex].hand.push(card);
    return card;
  }

  playCard(playerIndex, cardIndex) {
    if (this.finished || playerIndex !== this.currentPlayerIndex) {
      return null;
    }

    const player = this.players[playerIndex];

    if (!player || cardIndex < 0 || cardIndex >= player.hand.length) {
      return null;
    }

    player.playCount += 1;
    const playedCard = player.hand.splice(cardIndex, 1)[0];
    const matchIndex = this.findNearestMatchIndex(playedCard.rank);

    this.train.push(playedCard);
    this.lastCapture = null;

    if (matchIndex !== -1) {
      const capturedCards = this.train.splice(matchIndex);
      const multiplier = capturedCards.some((card) => card.isJoker) ? 2 : 1;
      const baseScore = capturedCards.length * player.playCount;
      const roundScore = baseScore * multiplier;

      player.won.push(...capturedCards);
      player.captures.push({
        cards: capturedCards,
        cardCount: capturedCards.length,
        playNumber: player.playCount,
        multiplier,
        roundScore,
      });

      this.lastCapture = {
        playerIndex,
        cards: capturedCards,
        cardCount: capturedCards.length,
        playNumber: player.playCount,
        multiplier,
        roundScore,
      };
      this.lastMessage = `${player.name} 配对 ${playedCard.rank}，收走 ${capturedCards.length} 张`;
    } else {
      this.lastMessage = `${player.name} 打出 ${playedCard.label}`;
    }

    this.drawCard(playerIndex);
    this.advanceTurn();

    return {
      playedCard,
      capture: this.lastCapture,
      nextPlayerIndex: this.currentPlayerIndex,
      finished: this.finished,
    };
  }

  findNearestMatchIndex(rank) {
    for (let i = this.train.length - 1; i >= 0; i--) {
      if (this.train[i].rank === rank) {
        return i;
      }
    }

    return -1;
  }

  advanceTurn() {
    if (this.isGameFinished()) {
      this.finished = true;
      this.lastMessage = '牌局结束';
      return;
    }

    const nextPlayerIndex = 1 - this.currentPlayerIndex;
    const nextPlayer = this.players[nextPlayerIndex];

    if (this.deck.length === 0 && nextPlayer.hand.length === 0) {
      this.lastMessage = `${nextPlayer.name} 手牌为空，继续由 ${this.players[this.currentPlayerIndex].name} 出牌`;
      return;
    }

    this.currentPlayerIndex = nextPlayerIndex;
  }

  isGameFinished() {
    return (
      this.deck.length === 0 &&
      this.players[0].hand.length === 0 &&
      this.players[1].hand.length === 0
    );
  }

  chooseBotCardIndex() {
    const player = this.players[this.currentPlayerIndex];

    for (let i = 0; i < player.hand.length; i++) {
      if (this.findNearestMatchIndex(player.hand[i].rank) !== -1) {
        return i;
      }
    }

    return Math.floor(Math.random() * player.hand.length);
  }

  getPlayerTotal(playerIndex) {
    const player = this.players[playerIndex];
    const captureScore = player.captures.reduce((total, capture) => total + capture.roundScore, 0);

    return captureScore + player.won.length;
  }
}
