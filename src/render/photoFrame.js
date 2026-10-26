// How a photo sits inside a player's circle. Shared by the canvas renderer
// and the DOM previews (avatars, the framing editor) so they always agree.
//
// frame = { zoom, x, y }
//   zoom — 1 fills the circle (cover); below 1 shows the whole photo on the
//          marker colour; above 1 crops in.
//   x, y — the point of the photo (0–1 across / down) to centre in the circle.

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;

export const FRAME_PRESETS = {
  fill: { zoom: 1, x: 0.5, y: 0.5 },
  face: { zoom: 2.2, x: 0.5, y: 0.2 },
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

// Older projects stored only a vertical crop (0 top … 100 bottom).
export const frameOf = (profile) => profile?.photoFrame ?? { zoom: 1, x: 0.5, y: (profile?.photoCropY ?? 0) / 100 };

// Zoom at which the whole photo fits inside the circle's bounding square.
export const fitZoom = (naturalWidth, naturalHeight) =>
  Math.min(naturalWidth, naturalHeight) / Math.max(naturalWidth, naturalHeight);

const place = (focus, drawn, size) => {
  const position = size / 2 - focus * drawn;
  // Larger than the circle: never leave a gap. Smaller: never spill past it.
  return drawn >= size ? clamp(position, size - drawn, 0) : clamp(position, 0, size - drawn);
};

/** Where to draw a naturalWidth×naturalHeight photo inside a size×size square. */
export function photoRect(naturalWidth, naturalHeight, size, frame) {
  const cover = Math.max(size / naturalWidth, size / naturalHeight);
  const scale = cover * clamp(frame.zoom, MIN_ZOOM, MAX_ZOOM);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { x: place(frame.x, width, size), y: place(frame.y, height, size), width, height };
}

/** The focus point that keeps a drawn rect where it is (used after clamping a drag). */
export const focusFor = (rect, size) => ({
  x: clamp((size / 2 - rect.x) / rect.width, 0, 1),
  y: clamp((size / 2 - rect.y) / rect.height, 0, 1),
});
