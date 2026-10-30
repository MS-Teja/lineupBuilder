import { FIELD } from './geometry';

const PITCH = {
  penaltyDepth: 16.5,
  penaltyWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  penaltySpot: 11,
  centreCircleRadius: 9.15,
  cornerRadius: 1,
  goalWidth: 7.32,
  goalDepth: 2,
  stripes: 14,
};

const GRASS = { light: '#2a6340', dark: '#205236' };

const pitchPoint = (field, orientation, alongLength, acrossWidth) => (
  orientation === 'landscape'
    ? { x: field.x + (alongLength / FIELD.length) * field.width, y: field.y + (acrossWidth / FIELD.width) * field.height }
    : { x: field.x + (acrossWidth / FIELD.width) * field.width, y: field.y + (alongLength / FIELD.length) * field.height }
);

const pitchRectPath = (context, field, orientation, alongLength, acrossWidth, length, width) => {
  const point = pitchPoint(field, orientation, alongLength, acrossWidth);
  const lengthPx = (length / FIELD.length) * (orientation === 'landscape' ? field.width : field.height);
  const widthPx = (width / FIELD.width) * (orientation === 'landscape' ? field.height : field.width);
  context.beginPath();
  if (orientation === 'landscape') context.rect(point.x, point.y, lengthPx, widthPx);
  else context.rect(point.x, point.y, widthPx, lengthPx);
};

// A fixed tile of fine grain. Breaks up flat gradients so they don't band
// once YouTube compresses the video. Seeded so every frame is identical.
let grainTile = null;
const grain = () => {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 160;
  grainTile.height = 160;
  const context = grainTile.getContext('2d');
  const image = context.createImageData(160, 160);
  let seed = 7;
  for (let index = 0; index < image.data.length; index += 4) {
    seed = (seed * 16807) % 2147483647;
    const value = seed % 2 ? 255 : 0;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 6 + (seed % 10);
  }
  context.putImageData(image, 0, 0);
  return grainTile;
};

// Grass runs edge to edge; mowing stripes are aligned to the pitch and carry
// on into the run-off, and a soft light falls off toward the frame edges.
const drawGrass = (context, frame, field, isLandscape) => {
  context.fillStyle = GRASS.dark;
  context.fillRect(0, 0, frame.width, frame.height);

  const stripe = (isLandscape ? field.width : field.height) / PITCH.stripes;
  const origin = isLandscape ? field.x : field.y;
  const extent = isLandscape ? frame.width : frame.height;
  context.fillStyle = GRASS.light;
  for (let index = Math.floor(-origin / stripe) - 1; origin + index * stripe < extent; index += 1) {
    if (index % 2 === 0) continue;
    const start = origin + index * stripe;
    if (isLandscape) context.fillRect(start, 0, stripe, frame.height);
    else context.fillRect(0, start, frame.width, stripe);
  }

  context.save();
  context.fillStyle = context.createPattern(grain(), 'repeat');
  context.fillRect(0, 0, frame.width, frame.height);
  context.restore();

  // Run-off sits slightly in shadow so the field of play reads first.
  context.save();
  context.beginPath();
  context.rect(0, 0, frame.width, frame.height);
  context.rect(field.x, field.y, field.width, field.height);
  context.fillStyle = 'rgba(0, 0, 0, 0.16)';
  context.fill('evenodd');
  context.restore();

  const centreX = frame.width / 2;
  const centreY = frame.height / 2;
  const light = context.createRadialGradient(centreX, centreY * 0.85, 0, centreX, centreY, Math.hypot(centreX, centreY));
  light.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
  light.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
  light.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  context.fillStyle = light;
  context.fillRect(0, 0, frame.width, frame.height);
};

// Editor-only overlay: thirds along the pitch and the five vertical channels.
const drawGuides = (context, field, isLandscape) => {
  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();
  [1 / 3, 2 / 3].forEach((fraction) => {
    if (isLandscape) {
      context.moveTo(field.x + field.width * fraction, field.y);
      context.lineTo(field.x + field.width * fraction, field.y + field.height);
    } else {
      context.moveTo(field.x, field.y + field.height * fraction);
      context.lineTo(field.x + field.width, field.y + field.height * fraction);
    }
  });
  [0.2, 0.37, 0.63, 0.8].forEach((fraction) => {
    if (isLandscape) {
      context.moveTo(field.x, field.y + field.height * fraction);
      context.lineTo(field.x + field.width, field.y + field.height * fraction);
    } else {
      context.moveTo(field.x + field.width * fraction, field.y);
      context.lineTo(field.x + field.width * fraction, field.y + field.height);
    }
  });
  context.stroke();
  context.restore();
};

const drawGoal = (context, field, orientation, atStart, lineWidth) => {
  const across = (FIELD.width - PITCH.goalWidth) / 2;
  const along = atStart ? -PITCH.goalDepth : FIELD.length;
  const a = pitchPoint(field, orientation, along, across);
  const b = pitchPoint(field, orientation, along + PITCH.goalDepth, across + PITCH.goalWidth);
  const box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };

  context.save();
  context.beginPath();
  context.rect(box.x, box.y, box.width, box.height);
  context.fillStyle = 'rgba(255, 255, 255, 0.1)';
  context.fill();
  context.clip();
  // Net mesh: diagonals in both directions across the goal box only.
  context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  context.lineWidth = Math.max(1, lineWidth * 0.25);
  const mesh = field.scale * 0.5;
  const span = box.width + box.height;
  context.beginPath();
  for (let offset = -box.height; offset < box.width; offset += mesh) {
    context.moveTo(box.x + offset, box.y);
    context.lineTo(box.x + offset + span, box.y + span);
    context.moveTo(box.x + offset, box.y + box.height);
    context.lineTo(box.x + offset + span, box.y + box.height - span);
  }
  context.stroke();
  context.restore();

  context.lineWidth = lineWidth * 0.85;
  context.strokeRect(box.x, box.y, box.width, box.height);
};

function paintPitch(context, geometry, orientation, guides) {
  const { frame, field } = geometry;
  const isLandscape = orientation === 'landscape';
  const unit = field.scale;
  const lineWidth = Math.max(3.5, unit * 0.16);

  drawGrass(context, frame, field, isLandscape);
  if (guides) drawGuides(context, field, isLandscape);

  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.94)';
  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.lineWidth = lineWidth;
  context.lineJoin = 'round';

  drawGoal(context, field, orientation, true, lineWidth);
  drawGoal(context, field, orientation, false, lineWidth);

  context.strokeRect(field.x, field.y, field.width, field.height);

  context.beginPath();
  if (isLandscape) {
    context.moveTo(field.x + field.width / 2, field.y);
    context.lineTo(field.x + field.width / 2, field.y + field.height);
  } else {
    context.moveTo(field.x, field.y + field.height / 2);
    context.lineTo(field.x + field.width, field.y + field.height / 2);
  }
  context.stroke();

  const spotRadius = Math.max(4.5, unit * 0.25);
  const middle = pitchPoint(field, orientation, FIELD.length / 2, FIELD.width / 2);
  context.beginPath();
  context.arc(middle.x, middle.y, PITCH.centreCircleRadius * unit, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(middle.x, middle.y, spotRadius, 0, Math.PI * 2);
  context.fill();

  const penaltyAcross = (FIELD.width - PITCH.penaltyWidth) / 2;
  const goalAreaAcross = (FIELD.width - PITCH.goalAreaWidth) / 2;
  [
    [0, penaltyAcross, PITCH.penaltyDepth, PITCH.penaltyWidth],
    [FIELD.length - PITCH.penaltyDepth, penaltyAcross, PITCH.penaltyDepth, PITCH.penaltyWidth],
    [0, goalAreaAcross, PITCH.goalAreaDepth, PITCH.goalAreaWidth],
    [FIELD.length - PITCH.goalAreaDepth, goalAreaAcross, PITCH.goalAreaDepth, PITCH.goalAreaWidth],
  ].forEach(([along, across, length, width]) => {
    pitchRectPath(context, field, orientation, along, across, length, width);
    context.stroke();
  });

  // Penalty spots and the arcs ("D") outside each box.
  const arcHalfAngle = Math.acos((PITCH.penaltyDepth - PITCH.penaltySpot) / PITCH.centreCircleRadius);
  [[PITCH.penaltySpot, 1], [FIELD.length - PITCH.penaltySpot, -1]].forEach(([distance, direction]) => {
    const spot = pitchPoint(field, orientation, distance, FIELD.width / 2);
    context.beginPath();
    context.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
    context.fill();
    const facing = isLandscape ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    context.beginPath();
    context.arc(spot.x, spot.y, PITCH.centreCircleRadius * unit, facing - arcHalfAngle, facing + arcHalfAngle);
    context.stroke();
  });

  [[0, 0], [0, FIELD.width], [FIELD.length, FIELD.width], [FIELD.length, 0]].forEach(([alongLength, acrossWidth]) => {
    const point = pitchPoint(field, orientation, alongLength, acrossWidth);
    // Each corner arc is the quadrant that opens toward the centre spot.
    const right = middle.x > point.x;
    const down = middle.y > point.y;
    const start = right ? (down ? 0 : Math.PI * 1.5) : (down ? Math.PI / 2 : Math.PI);
    context.beginPath();
    context.arc(point.x, point.y, PITCH.cornerRadius * unit, start, start + Math.PI / 2);
    context.stroke();
  });

  context.restore();
}

// The pitch never changes during playback or an export, but painting it
// (grain, lighting, nets) is by far the most expensive part of a frame. Paint
// it once per orientation, guides setting and pixel scale, then blit it.
const LAYER_LIMIT = 6;
const layers = new Map();

const pitchLayer = (geometry, orientation, guides, scale) => {
  const key = `${orientation}|${guides}|${scale.toFixed(4)}`;
  let layer = layers.get(key);
  if (layer) {
    layers.delete(key);
  } else {
    layer = document.createElement('canvas');
    layer.width = Math.round(geometry.frame.width * scale);
    layer.height = Math.round(geometry.frame.height * scale);
    const context = layer.getContext('2d');
    context.setTransform(scale, 0, 0, scale, 0, 0);
    paintPitch(context, geometry, orientation, guides);
    if (layers.size >= LAYER_LIMIT) layers.delete(layers.keys().next().value);
  }
  layers.set(key, layer);
  return layer;
};

/** Draws the pitch into a context already scaled by `scale` (logical → canvas pixels). */
export function drawPitch(context, geometry, orientation, { guides = false, scale = 1 } = {}) {
  context.drawImage(pitchLayer(geometry, orientation, guides, scale), 0, 0, geometry.frame.width, geometry.frame.height);
}
