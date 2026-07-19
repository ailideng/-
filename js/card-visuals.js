export const DESIGN = {
  ink: '#111716',
  feltDeep: '#12362F',
  felt: '#1E5144',
  feltLight: '#2C6B5B',
  woodDark: '#3B2318',
  wood: '#7A4A2A',
  woodLight: '#B87B45',
  brass: '#D0A85C',
  paper: '#FCFAF4',
  paperShade: '#E8E0D1',
  glass: 'rgba(255, 255, 255, 0.13)',
  glassStrong: 'rgba(255, 255, 255, 0.2)',
  ruby: '#B32632',
  blackSuit: '#171717',
  blueBack: '#224F91',
  blueBackDark: '#15386D',
  jade: '#28B487',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

const FACE_CARD_NAMES = {
  J: '侍从',
  Q: '皇后',
  K: '国王',
};

const PIP_MAP = {
  A: [[0.5, 0.5]],
  2: [[0.5, 0.28], [0.5, 0.72]],
  3: [[0.5, 0.25], [0.5, 0.5], [0.5, 0.75]],
  4: [[0.32, 0.28], [0.68, 0.28], [0.32, 0.72], [0.68, 0.72]],
  5: [[0.32, 0.26], [0.68, 0.26], [0.5, 0.5], [0.32, 0.74], [0.68, 0.74]],
  6: [[0.32, 0.24], [0.68, 0.24], [0.32, 0.5], [0.68, 0.5], [0.32, 0.76], [0.68, 0.76]],
  7: [[0.32, 0.22], [0.68, 0.22], [0.5, 0.36], [0.32, 0.5], [0.68, 0.5], [0.32, 0.76], [0.68, 0.76]],
  8: [[0.32, 0.22], [0.68, 0.22], [0.5, 0.34], [0.32, 0.48], [0.68, 0.48], [0.5, 0.62], [0.32, 0.78], [0.68, 0.78]],
  9: [[0.32, 0.2], [0.68, 0.2], [0.32, 0.36], [0.68, 0.36], [0.5, 0.5], [0.32, 0.64], [0.68, 0.64], [0.32, 0.8], [0.68, 0.8]],
  10: [[0.32, 0.18], [0.68, 0.18], [0.5, 0.3], [0.32, 0.42], [0.68, 0.42], [0.32, 0.58], [0.68, 0.58], [0.5, 0.7], [0.32, 0.82], [0.68, 0.82]],
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function drawTableBackground(ctx, width, height, tick) {
  const woodH = 72;
  const tableGradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    20,
    width * 0.5,
    height * 0.42,
    Math.max(width, height) * 0.72,
  );
  tableGradient.addColorStop(0, DESIGN.feltLight);
  tableGradient.addColorStop(0.52, DESIGN.felt);
  tableGradient.addColorStop(1, DESIGN.feltDeep);
  ctx.fillStyle = tableGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  for (let y = 10; y < height; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin((tick + y) * 0.002) * 4);
    ctx.bezierCurveTo(width * 0.28, y - 10, width * 0.72, y + 12, width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = '#06110F';
  for (let i = 0; i < 260; i++) {
    const x = (i * 97) % width;
    const y = (i * 53) % height;
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
  }
  ctx.restore();

  ctx.save();
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.12, width / 2, height / 2, height * 0.62);
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawWoodRail(ctx, 0, 0, width, woodH, true);
  drawWoodRail(ctx, 0, height - woodH, width, woodH, false);
}

export function drawWoodRail(ctx, x, y, width, height, top) {
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, top ? DESIGN.woodLight : DESIGN.woodDark);
  gradient.addColorStop(0.38, DESIGN.wood);
  gradient.addColorStop(1, top ? DESIGN.woodDark : DESIGN.woodLight);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#2A140B';
  for (let i = 0; i < 8; i++) {
    const lineY = y + 8 + i * (height / 8);
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.bezierCurveTo(width * 0.25, lineY - 8, width * 0.58, lineY + 7, width, lineY - 3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawGlassPanel(ctx, x, y, width, height, radius, active) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, active ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.16)');
  gradient.addColorStop(1, active ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.06)');
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = active ? 'rgba(208, 168, 92, 0.7)' : 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = active ? 1.5 : 1;
  roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
  ctx.stroke();
}

export function drawCard(ctx, card, x, y, width, height, options = {}) {
  const rotation = options.rotation || 0;
  const scaleX = options.scaleX === undefined ? 1 : options.scaleX;
  const scaleY = options.scaleY === undefined ? 1 : options.scaleY;
  const alpha = options.alpha === undefined ? 1 : options.alpha;
  const faceUp = options.faceUp !== false;
  const pressed = options.pressed;
  const glow = options.glow;
  const radius = Math.max(6, Math.min(12, width * 0.12));
  const cx = x + width / 2;
  const cy = y + height / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy + (pressed ? 3 : 0));
  ctx.rotate(rotation);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-width / 2, -height / 2);

  if (glow) {
    ctx.save();
    ctx.shadowColor = 'rgba(208, 168, 92, 0.9)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(208, 168, 92, 0.22)';
    roundRect(ctx, -3, -3, width + 6, height + 6, radius + 4);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
  ctx.shadowBlur = pressed ? 5 : 13;
  ctx.shadowOffsetY = pressed ? 2 : 7;
  if (faceUp) {
    drawCardFace(ctx, card, 0, 0, width, height, radius);
  } else {
    drawCardBack(ctx, 0, 0, width, height, radius);
  }
  ctx.restore();
  ctx.restore();
}

function drawCardFace(ctx, card, x, y, width, height, radius) {
  const red = card.color === 'red';
  const color = card.color === 'joker' ? DESIGN.jade : (red ? DESIGN.ruby : DESIGN.blackSuit);

  ctx.fillStyle = DESIGN.paper;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  const shine = ctx.createLinearGradient(x, y, x + width, y + height);
  shine.addColorStop(0, 'rgba(255,255,255,0.7)');
  shine.addColorStop(0.45, 'rgba(255,255,255,0)');
  shine.addColorStop(1, 'rgba(232,224,209,0.55)');
  ctx.fillStyle = shine;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  ctx.strokeStyle = 'rgba(20, 20, 20, 0.16)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
  ctx.stroke();

  if (card.isJoker) {
    drawJoker(ctx, card, x, y, width, height);
    return;
  }

  drawCorners(ctx, card.rank, card.suit, color, x, y, width, height);
  drawPips(ctx, card.rank, card.suit, color, x, y, width, height);
}

function drawCorners(ctx, rank, suit, color, x, y, width, height) {
  const cornerFont = Math.max(10, Math.floor(width * 0.2));
  const suitFont = Math.max(11, Math.floor(width * 0.19));
  const pad = Math.max(4, width * 0.08);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${cornerFont}px sans-serif`;
  ctx.fillText(rank, x + pad + cornerFont * 0.35, y + pad);
  ctx.font = `${suitFont}px serif`;
  ctx.fillText(suit, x + pad + cornerFont * 0.35, y + pad + cornerFont - 1);

  ctx.save();
  ctx.translate(x + width - pad - cornerFont * 0.35, y + height - pad);
  ctx.rotate(Math.PI);
  ctx.font = `700 ${cornerFont}px sans-serif`;
  ctx.fillText(rank, 0, 0);
  ctx.font = `${suitFont}px serif`;
  ctx.fillText(suit, 0, cornerFont - 1);
  ctx.restore();
}

function drawPips(ctx, rank, suit, color, x, y, width, height) {
  const faceName = FACE_CARD_NAMES[rank];

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (faceName) {
    drawFacePortrait(ctx, rank, suit, color, x, y, width, height);
    return;
  }

  const pips = PIP_MAP[rank] || PIP_MAP.A;
  ctx.font = `${Math.max(12, Math.floor(width * 0.23))}px serif`;
  pips.forEach((pip) => {
    ctx.fillText(suit, x + width * pip[0], y + height * pip[1]);
  });
}

function drawJoker(ctx, card, x, y, width, height) {
  const red = card.rank === '大王';
  const color = red ? DESIGN.ruby : DESIGN.blackSuit;

  drawJokerFigure(ctx, red, x, y, width, height);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.floor(width * 0.18)}px sans-serif`;
  ctx.fillText(card.rank, x + width / 2, y + height * 0.26);
  ctx.font = `700 ${Math.floor(width * 0.12)}px serif`;
  ctx.fillText('JOKER', x + width / 2, y + height * 0.78);

  ctx.strokeStyle = red ? 'rgba(179, 38, 50, 0.55)' : 'rgba(17, 17, 17, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height * 0.52, width * 0.24, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFacePortrait(ctx, rank, suit, color, x, y, width, height) {
  const cx = x + width / 2;
  const top = y + height * 0.25;
  const personColor = rank === 'Q' ? DESIGN.ruby : (rank === 'K' ? DESIGN.brass : DESIGN.blueBack);
  const trimColor = color;

  ctx.save();
  ctx.strokeStyle = 'rgba(17, 23, 22, 0.24)';
  ctx.lineWidth = Math.max(1, width * 0.018);
  ctx.fillStyle = 'rgba(208, 168, 92, 0.12)';
  roundRect(ctx, x + width * 0.24, y + height * 0.2, width * 0.52, height * 0.58, width * 0.08);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = personColor;
  ctx.beginPath();
  ctx.moveTo(cx, y + height * 0.38);
  ctx.lineTo(x + width * 0.68, y + height * 0.68);
  ctx.quadraticCurveTo(cx, y + height * 0.78, x + width * 0.32, y + height * 0.68);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F0C9A4';
  ctx.beginPath();
  ctx.arc(cx, y + height * 0.42, width * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = DESIGN.ink;
  ctx.lineWidth = Math.max(1, width * 0.012);
  ctx.beginPath();
  ctx.arc(cx - width * 0.045, y + height * 0.41, width * 0.01, 0, Math.PI * 2);
  ctx.arc(cx + width * 0.045, y + height * 0.41, width * 0.01, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.04, y + height * 0.47);
  ctx.quadraticCurveTo(cx, y + height * 0.5, cx + width * 0.04, y + height * 0.47);
  ctx.stroke();

  if (rank === 'K' || rank === 'Q') {
    ctx.fillStyle = DESIGN.brass;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.16, top + height * 0.08);
    ctx.lineTo(cx - width * 0.09, top);
    ctx.lineTo(cx, top + height * 0.07);
    ctx.lineTo(cx + width * 0.09, top);
    ctx.lineTo(cx + width * 0.16, top + height * 0.08);
    ctx.lineTo(cx + width * 0.12, top + height * 0.14);
    ctx.lineTo(cx - width * 0.12, top + height * 0.14);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = DESIGN.blueBackDark;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.14, top + height * 0.11);
    ctx.lineTo(cx, top);
    ctx.lineTo(cx + width * 0.14, top + height * 0.11);
    ctx.lineTo(cx + width * 0.08, top + height * 0.16);
    ctx.lineTo(cx - width * 0.08, top + height * 0.16);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = trimColor;
  ctx.lineWidth = Math.max(1, width * 0.025);
  ctx.beginPath();
  if (rank === 'Q') {
    ctx.moveTo(x + width * 0.68, y + height * 0.3);
    ctx.lineTo(x + width * 0.36, y + height * 0.72);
  } else {
    ctx.moveTo(x + width * 0.31, y + height * 0.28);
    ctx.lineTo(x + width * 0.71, y + height * 0.72);
  }
  ctx.stroke();

  ctx.fillStyle = trimColor;
  ctx.font = `${Math.floor(width * 0.2)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suit, cx, y + height * 0.62);

  ctx.fillStyle = 'rgba(17, 23, 22, 0.38)';
  ctx.font = `700 ${Math.floor(width * 0.085)}px sans-serif`;
  ctx.fillText(FACE_CARD_NAMES[rank], cx, y + height * 0.73);
  ctx.restore();
}

function drawJokerFigure(ctx, red, x, y, width, height) {
  const cx = x + width / 2;
  const cy = y + height * 0.52;
  const accent = red ? DESIGN.ruby : DESIGN.blackSuit;

  ctx.save();
  ctx.fillStyle = '#F0C9A4';
  ctx.beginPath();
  ctx.arc(cx, cy, width * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.2, cy - height * 0.07);
  ctx.lineTo(cx - width * 0.05, cy - height * 0.22);
  ctx.lineTo(cx + width * 0.02, cy - height * 0.07);
  ctx.lineTo(cx + width * 0.14, cy - height * 0.2);
  ctx.lineTo(cx + width * 0.2, cy - height * 0.03);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = DESIGN.brass;
  [cx - width * 0.05, cx + width * 0.14].forEach((bellX) => {
    ctx.beginPath();
    ctx.arc(bellX, cy - height * 0.2, width * 0.025, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = DESIGN.ink;
  ctx.lineWidth = Math.max(1, width * 0.01);
  ctx.beginPath();
  ctx.arc(cx - width * 0.04, cy - height * 0.01, width * 0.008, 0, Math.PI * 2);
  ctx.arc(cx + width * 0.04, cy - height * 0.01, width * 0.008, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.06, cy + height * 0.05);
  ctx.quadraticCurveTo(cx, cy + height * 0.09, cx + width * 0.06, cy + height * 0.05);
  ctx.stroke();
  ctx.restore();
}

function drawCardBack(ctx, x, y, width, height, radius) {
  ctx.fillStyle = DESIGN.paper;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  ctx.fillStyle = DESIGN.blueBack;
  roundRect(ctx, x + width * 0.08, y + height * 0.06, width * 0.84, height * 0.88, radius * 0.75);
  ctx.fill();

  ctx.save();
  roundRect(ctx, x + width * 0.08, y + height * 0.06, width * 0.84, height * 0.88, radius * 0.75);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.lineWidth = Math.max(1, width * 0.035);
  for (let i = -height; i < width + height; i += width * 0.18) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + height);
    ctx.lineTo(x + i + height, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(21, 56, 109, 0.66)';
  ctx.lineWidth = Math.max(1, width * 0.02);
  for (let i = -height; i < width + height; i += width * 0.18) {
    ctx.beginPath();
    ctx.moveTo(x + i + width * 0.08, y);
    ctx.lineTo(x + i + height + width * 0.08, y + height);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(20, 20, 20, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
  ctx.stroke();
}

export function drawIcon(ctx, type, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'turn') {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.32, -0.6, Math.PI * 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.72, y + size * 0.3);
    ctx.lineTo(x + size * 0.82, y + size * 0.48);
    ctx.lineTo(x + size * 0.62, y + size * 0.48);
    ctx.stroke();
  } else if (type === 'deck') {
    roundRect(ctx, x + size * 0.28, y + size * 0.18, size * 0.42, size * 0.58, size * 0.07);
    ctx.stroke();
    roundRect(ctx, x + size * 0.2, y + size * 0.26, size * 0.42, size * 0.58, size * 0.07);
    ctx.stroke();
  } else if (type === 'score') {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.15);
    ctx.lineTo(x + size * 0.62, y + size * 0.4);
    ctx.lineTo(x + size * 0.9, y + size * 0.43);
    ctx.lineTo(x + size * 0.68, y + size * 0.62);
    ctx.lineTo(x + size * 0.75, y + size * 0.9);
    ctx.lineTo(x + size * 0.5, y + size * 0.75);
    ctx.lineTo(x + size * 0.25, y + size * 0.9);
    ctx.lineTo(x + size * 0.32, y + size * 0.62);
    ctx.lineTo(x + size * 0.1, y + size * 0.43);
    ctx.lineTo(x + size * 0.38, y + size * 0.4);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'plays') {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.18, y + size * 0.5);
    ctx.lineTo(x + size * 0.46, y + size * 0.76);
    ctx.lineTo(x + size * 0.84, y + size * 0.24);
    ctx.stroke();
  } else if (type === 'eye') {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.12, y + size * 0.5);
    ctx.bezierCurveTo(x + size * 0.28, y + size * 0.22, x + size * 0.72, y + size * 0.22, x + size * 0.88, y + size * 0.5);
    ctx.bezierCurveTo(x + size * 0.72, y + size * 0.78, x + size * 0.28, y + size * 0.78, x + size * 0.12, y + size * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
