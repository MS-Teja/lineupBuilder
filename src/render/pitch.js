import { FIELD } from './geometry';

const PITCH = {
  penaltyDepth: 16.5,
  penaltyWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  penaltySpot: 11,
  centreCircleRadius: 9.15,
  cornerRadius: 1,
};

const pitchPoint = (field, orientation, alongLength, acrossWidth) => (
  orientation === 'landscape'
    ? { x: field.x + (alongLength / FIELD.length) * field.width, y: field.y + (acrossWidth / FIELD.width) * field.height }
    : { x: field.x + (acrossWidth / FIELD.width) * field.width, y: field.y + (alongLength / FIELD.length) * field.height }
);

const strokePitchRect = (context, field, orientation, alongLength, acrossWidth, length, width) => {
  const point = pitchPoint(field, orientation, alongLength, acrossWidth);
  const lengthPx = (length / FIELD.length) * (orientation === 'landscape' ? field.width : field.height);
  const widthPx = (width / FIELD.width) * (orientation === 'landscape' ? field.height : field.width);
  if (orientation === 'landscape') context.strokeRect(point.x, point.y, lengthPx, widthPx);
  else context.strokeRect(point.x, point.y, widthPx, lengthPx);
};

// Editor-only overlay: thirds along the pitch and the five vertical channels.
const drawGuides = (context, field, orientation) => {
  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();
  const isLandscape = orientation === 'landscape';
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

export function drawPitch(context, geometry, orientation, { guides = false } = {}) {
  const { frame, field } = geometry;
  const isLandscape = orientation === 'landscape';
  const unit = field.scale;
  const lineWidth = Math.max(3.5, unit * 0.175);
  const line = '#ffffff';

  context.fillStyle = '#0a1710';
  context.fillRect(0, 0, frame.width, frame.height);

  const gradient = isLandscape
    ? context.createLinearGradient(field.x, field.y, field.x + field.width, field.y)
    : context.createLinearGradient(field.x, field.y, field.x, field.y + field.height);
  gradient.addColorStop(0, '#1c4c31');
  gradient.addColorStop(0.5, '#296340');
  gradient.addColorStop(1, '#1c4c31');
  context.fillStyle = gradient;
  context.fillRect(field.x, field.y, field.width, field.height);

  context.save();
  context.globalAlpha = 0.03;
  context.fillStyle = '#ffffff';
  const stripeCount = 10;
  for (let index = 0; index < stripeCount; index += 2) {
    if (isLandscape) {
      const x0 = field.x + (field.width / stripeCount) * index;
      context.fillRect(x0, field.y, field.width / stripeCount, field.height);
    } else {
      const y0 = field.y + (field.height / stripeCount) * index;
      context.fillRect(field.x, y0, field.width, field.height / stripeCount);
    }
  }
  context.restore();

  if (guides) drawGuides(context, field, orientation);

  context.save();
  context.strokeStyle = line;
  context.fillStyle = line;
  context.lineWidth = lineWidth;
  context.strokeRect(field.x + lineWidth / 2, field.y + lineWidth / 2, field.width - lineWidth, field.height - lineWidth);

  context.beginPath();
  if (isLandscape) {
    context.moveTo(field.x + field.width / 2, field.y);
    context.lineTo(field.x + field.width / 2, field.y + field.height);
  } else {
    context.moveTo(field.x, field.y + field.height / 2);
    context.lineTo(field.x + field.width, field.y + field.height / 2);
  }
  context.stroke();

  const spotRadius = Math.max(4.5, unit * 0.28);
  const middle = pitchPoint(field, orientation, FIELD.length / 2, FIELD.width / 2);
  context.beginPath();
  context.arc(middle.x, middle.y, PITCH.centreCircleRadius * unit, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(middle.x, middle.y, spotRadius, 0, Math.PI * 2);
  context.fill();

  const penaltyAcross = (FIELD.width - PITCH.penaltyWidth) / 2;
  const goalAreaAcross = (FIELD.width - PITCH.goalAreaWidth) / 2;
  strokePitchRect(context, field, orientation, 0, penaltyAcross, PITCH.penaltyDepth, PITCH.penaltyWidth);
  strokePitchRect(context, field, orientation, FIELD.length - PITCH.penaltyDepth, penaltyAcross, PITCH.penaltyDepth, PITCH.penaltyWidth);
  strokePitchRect(context, field, orientation, 0, goalAreaAcross, PITCH.goalAreaDepth, PITCH.goalAreaWidth);
  strokePitchRect(context, field, orientation, FIELD.length - PITCH.goalAreaDepth, goalAreaAcross, PITCH.goalAreaDepth, PITCH.goalAreaWidth);

  [PITCH.penaltySpot, FIELD.length - PITCH.penaltySpot].forEach((distance) => {
    const spot = pitchPoint(field, orientation, distance, FIELD.width / 2);
    context.beginPath();
    context.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
    context.fill();
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
