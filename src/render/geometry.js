export const FIELD = { length: 105, width: 68 };

// Every frame is laid out in these logical pixels; the live canvas, thumbnails
// and exports only differ in the scale they draw at.
export const FRAME_SIZES = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

export const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

// Grass run-off kept around the touchlines so edge players and labels never
// touch the frame, as on a broadcast camera.
const RUN_OFF = 0.045;

export function getGeometry(orientation = 'landscape') {
  const frame = FRAME_SIZES[orientation] ?? FRAME_SIZES.landscape;
  const isLandscape = orientation === 'landscape';
  const fieldRatio = isLandscape ? FIELD.length / FIELD.width : FIELD.width / FIELD.length;
  const inset = Math.round(Math.min(frame.width, frame.height) * RUN_OFF);
  const width = Math.min(frame.width - inset * 2, (frame.height - inset * 2) * fieldRatio);
  const height = Math.min(frame.height - inset * 2, (frame.width - inset * 2) / fieldRatio);

  return {
    frame,
    field: {
      x: (frame.width - width) / 2,
      y: (frame.height - height) / 2,
      width,
      height,
      // logical pixels per metre
      scale: isLandscape ? width / FIELD.length : height / FIELD.length,
    },
  };
}

export const markerSize = (geometry, markerScale = 1) =>
  clamp(Math.round(geometry.field.scale * 6.5 * markerScale), 36, 200);

// Slot coordinates are percentages of the field rectangle.
export const toFramePoint = (field, coord) => ({
  x: field.x + (coord.x / 100) * field.width,
  y: field.y + (coord.y / 100) * field.height,
});
