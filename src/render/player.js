import { lastName } from '../state/project';
import { markerSize, toFramePoint } from './geometry';
import { frameOf, photoRect } from './photoFrame';

const FONT = 'Outfit, sans-serif';

const validAccent = (accent) => (typeof accent === 'string' && /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#57635a');

// Mixes a #rrggbb colour toward white (amount > 0) or black (amount < 0).
const shade = (hex, amount) => {
  const target = amount > 0 ? 255 : 0;
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16);
    return Math.round(value + (target - value) * Math.abs(amount));
  });
  return `rgb(${channels.join(',')})`;
};

// Black or white, whichever reads better on the accent.
const inkOn = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#101214' : '#ffffff';
};

const circle = (context, radius) => {
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
};

const roundRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  if (typeof context.roundRect === 'function') context.roundRect(x, y, width, height, radius);
  else context.rect(x, y, width, height);
};

const setTracking = (context, value) => {
  if ('letterSpacing' in context) context.letterSpacing = value;
};

// Editor-only: an empty role is a dashed ring with a plus.
const drawEmpty = (context, point, radius) => {
  context.save();
  context.translate(point.x, point.y);
  context.fillStyle = 'rgba(10, 14, 12, 0.35)';
  circle(context, radius);
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  context.lineWidth = Math.max(2.5, radius * 0.06);
  context.setLineDash([radius * 0.22, radius * 0.16]);
  circle(context, radius - context.lineWidth / 2);
  context.stroke();
  context.setLineDash([]);
  const arm = radius * 0.32;
  context.lineCap = 'round';
  context.lineWidth = Math.max(3, radius * 0.08);
  context.beginPath();
  context.moveTo(-arm, 0);
  context.lineTo(arm, 0);
  context.moveTo(0, -arm);
  context.lineTo(0, arm);
  context.stroke();
  context.restore();
};

// ── Name labels ─────────────────────────────────────────────────────────
// All labels hang below the marker, centred, starting at `top`.

// Broadcast: squared-off dark slab, uppercase surname, shirt number in an
// accent tab when the circle shows a photo instead of the number.
const drawBroadcastLabel = (context, { text, number, accent, marker, top }) => {
  const fontSize = Math.round(marker * 0.19);
  const height = Math.round(fontSize * 1.6);
  const padX = fontSize * 0.55;
  const radius = Math.max(2, fontSize * 0.16);

  context.font = `800 ${fontSize}px ${FONT}`;
  setTracking(context, `${(fontSize * 0.05).toFixed(1)}px`);
  const label = text.toUpperCase();
  const textWidth = context.measureText(label).width;

  let tabWidth = 0;
  let numberText = '';
  if (number != null && number !== '') {
    numberText = String(number);
    context.font = `800 ${fontSize}px ${FONT}`;
    tabWidth = Math.max(height, context.measureText(numberText).width + padX * 1.2);
  }

  const width = tabWidth + textWidth + padX * 2;
  const left = -width / 2;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = fontSize * 0.6;
  context.shadowOffsetY = fontSize * 0.15;
  context.fillStyle = 'rgba(12, 13, 16, 0.94)';
  roundRect(context, left, top, width, height, radius);
  context.fill();
  context.restore();

  if (tabWidth) {
    context.save();
    roundRect(context, left, top, width, height, radius);
    context.clip();
    context.fillStyle = accent;
    context.fillRect(left, top, tabWidth, height);
    context.restore();
    context.fillStyle = inkOn(accent);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(numberText, left + tabWidth / 2, top + height / 2 + fontSize * 0.04);
  } else {
    // Accent underline keeps number-less labels tied to their marker.
    context.save();
    roundRect(context, left, top, width, height, radius);
    context.clip();
    context.fillStyle = accent;
    context.fillRect(left, top + height - Math.max(2, fontSize * 0.14), width, height);
    context.restore();
  }

  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(label, left + tabWidth + padX, top + height / 2 + fontSize * 0.04);
  setTracking(context, '0px');
};

// Pill: rounded capsule, sentence case.
const drawPillLabel = (context, { text, marker, top }) => {
  const fontSize = Math.round(marker * 0.21);
  const padX = marker * 0.12;
  const padY = marker * 0.05;

  context.font = `700 ${fontSize}px ${FONT}`;
  const width = context.measureText(text).width + padX * 2;
  const height = fontSize + padY * 2;

  context.fillStyle = 'rgba(10, 12, 14, 0.88)';
  roundRect(context, -width / 2, top, width, height, height / 2);
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.fillText(text, 0, top + padY);
};

// Clean: no box, heavy white type with a dark outline — reads on any grass.
const drawCleanLabel = (context, { text, marker, top }) => {
  const fontSize = Math.round(marker * 0.23);
  context.font = `800 ${fontSize}px ${FONT}`;
  setTracking(context, `${(fontSize * 0.02).toFixed(1)}px`);
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.lineJoin = 'round';
  context.shadowColor = 'rgba(0, 0, 0, 0.5)';
  context.shadowBlur = fontSize * 0.5;
  context.strokeStyle = 'rgba(6, 8, 7, 0.9)';
  context.lineWidth = fontSize * 0.24;
  context.strokeText(text, 0, top);
  context.shadowColor = 'transparent';
  context.fillStyle = '#ffffff';
  context.fillText(text, 0, top);
  setTracking(context, '0px');
};

const LABELS = { broadcast: drawBroadcastLabel, pill: drawPillLabel, clean: drawCleanLabel };

// ── Marker ──────────────────────────────────────────────────────────────

/**
 * slot: { profile, accent, coord, opacity, scale, offsetY }
 * In editor mode empty roles and hidden players are drawn as ghosts so they
 * stay selectable; exports and playback never draw them.
 */
export function drawPlayer(context, slot, geometry, portraits, options) {
  const { markerScale = 1, showNames = true, labelStyle = 'broadcast', editor = false } = options;
  const marker = markerSize(geometry, markerScale);
  const radius = marker / 2;
  const point = toFramePoint(geometry.field, slot.coord);
  const { profile } = slot;

  if (!profile) {
    if (editor) drawEmpty(context, point, radius);
    return;
  }

  const isGhost = slot.opacity <= 0.01;
  if (isGhost && !editor) return;

  const accent = validAccent(slot.accent);
  const portrait = profile.photo ? portraits.get(profile.photo) : null;

  context.save();
  context.globalAlpha = isGhost ? 0.32 : slot.opacity;
  context.translate(point.x, point.y + (slot.offsetY ?? 0) * marker);
  context.scale(slot.scale ?? 1, slot.scale ?? 1);

  // Body: accent with a soft top-left light so markers read as discs, not dots.
  if (!isGhost) {
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = marker * 0.18;
    context.shadowOffsetY = marker * 0.07;
  }
  const body = context.createRadialGradient(-radius * 0.35, -radius * 0.45, radius * 0.1, 0, 0, radius);
  body.addColorStop(0, shade(accent, 0.22));
  body.addColorStop(1, shade(accent, -0.18));
  context.fillStyle = body;
  circle(context, radius);
  context.fill();
  context.shadowColor = 'transparent';

  if (portrait) {
    const rect = photoRect(portrait.naturalWidth || portrait.width, portrait.naturalHeight || portrait.height, marker, frameOf(profile));
    context.save();
    circle(context, radius);
    context.clip();
    context.drawImage(portrait, rect.x - radius, rect.y - radius, rect.width, rect.height);
    // Gentle inner shade at the rim gives photos depth against the ring.
    const rim = context.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius);
    rim.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rim.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    context.fillStyle = rim;
    context.fillRect(-radius, -radius, marker, marker);
    context.restore();
  } else {
    context.fillStyle = inkOn(accent) === '#ffffff' ? '#ffffff' : '#121a14';
    context.font = `800 ${Math.round(marker * 0.34)}px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(profile.number ?? '—'), 0, marker * 0.02);
  }

  context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  context.lineWidth = Math.max(1.5, marker * 0.02);
  circle(context, radius);
  context.stroke();

  const ringWidth = Math.max(3.5, marker * 0.05);
  context.strokeStyle = '#ffffff';
  context.lineWidth = ringWidth;
  if (isGhost) context.setLineDash([marker * 0.1, marker * 0.07]);
  circle(context, radius - ringWidth / 2);
  context.stroke();
  context.setLineDash([]);

  if (showNames && (slot.labelOpacity ?? 1) > 0.01) {
    const draw = LABELS[labelStyle] ?? drawBroadcastLabel;
    context.globalAlpha = (isGhost ? 0.32 : slot.opacity) * (slot.labelOpacity ?? 1);
    draw(context, {
      text: profile.label?.trim() || lastName(profile.name),
      number: portrait ? profile.number : null,
      accent,
      marker,
      top: radius + marker * 0.12,
    });
  }

  context.restore();
}
