import { lastName } from '../state/project';
import { markerSize, toFramePoint } from './geometry';

const validAccent = (accent) => (typeof accent === 'string' && accent.startsWith('#') ? accent : '#57635a');

// Draws a portrait into a circle of `size`, cropping tall images by cropY (0 top … 100 bottom).
const drawCover = (context, image, x, y, size, cropY = 0) => {
  const sourceRatio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
  let width = size;
  let height = size;
  let drawX = x;
  let drawY = y;

  if (sourceRatio > 1) {
    width = size * sourceRatio;
    drawX -= (width - size) / 2;
  } else {
    height = size / sourceRatio;
    drawY -= (height - size) * (cropY / 100);
  }

  context.drawImage(image, drawX, drawY, width, height);
};

const circle = (context, radius) => {
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
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

const drawNameLabel = (context, name, marker, radius, orientation) => {
  const isPortrait = orientation === 'portrait';
  const top = radius + marker * (isPortrait ? 0.16 : 0.18);
  const fontSize = Math.round(marker * (isPortrait ? 0.2 : 0.22));

  context.font = `700 ${fontSize}px Outfit, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'top';

  const padX = marker * 0.12;
  const padY = marker * 0.05;
  const width = context.measureText(name).width + padX * 2;
  const height = fontSize + padY * 2;

  context.fillStyle = 'rgba(10, 12, 14, 0.88)';
  context.beginPath();
  if (typeof context.roundRect === 'function') context.roundRect(-width / 2, top - padY, width, height, height / 2);
  else context.rect(-width / 2, top - padY, width, height);
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = '#ffffff';
  context.fillText(name, 0, top);
};

/**
 * slot: { profile, accent, coord, opacity, scale, offsetY }
 * In editor mode empty roles and hidden players are drawn as ghosts so they
 * stay selectable; exports and playback never draw them.
 */
export function drawPlayer(context, slot, geometry, portraits, { markerScale = 1, showNames = true, orientation, editor = false }) {
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

  context.save();
  context.globalAlpha = isGhost ? 0.32 : slot.opacity;
  context.translate(point.x, point.y + (slot.offsetY ?? 0) * marker);
  context.scale(slot.scale ?? 1, slot.scale ?? 1);

  if (!isGhost) {
    context.shadowColor = 'rgba(0, 0, 0, 0.55)';
    context.shadowBlur = marker * 0.16;
    context.shadowOffsetY = marker * 0.08;
  }
  context.fillStyle = validAccent(slot.accent);
  circle(context, radius);
  context.fill();
  context.shadowColor = 'transparent';

  const portrait = profile.photo ? portraits.get(profile.photo) : null;
  if (portrait) {
    context.save();
    circle(context, radius);
    context.clip();
    drawCover(context, portrait, -radius, -radius, marker, profile.photoCropY ?? 0);
    context.restore();
  } else {
    context.fillStyle = '#121a14';
    context.font = `800 ${Math.round(marker * 0.32)}px Outfit, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(profile.number ?? '—'), 0, 1);
  }

  context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
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

  if (showNames) drawNameLabel(context, lastName(profile.name), marker, radius, orientation);

  context.restore();
}
