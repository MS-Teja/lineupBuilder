const GRID_STEP = 2.5;
const MAGNET = 2.2;

const tidy = (value) => Math.max(4, Math.min(96, Math.round(value * 10) / 10));

/**
 * Snaps a raw field position (percent) to a teammate's line when within
 * MAGNET percent, otherwise to a 2.5% grid. Returns guide lines to draw.
 */
export function snapPosition(rawX, rawY, others, enabled) {
  if (!enabled) return { x: tidy(rawX), y: tidy(rawY), guides: [] };

  let x = null;
  let y = null;
  const guides = [];

  for (const other of others) {
    if (x == null && Math.abs(rawX - other.x) <= MAGNET) {
      x = other.x;
      guides.push({ axis: 'x', at: other.x });
    }
    if (y == null && Math.abs(rawY - other.y) <= MAGNET) {
      y = other.y;
      guides.push({ axis: 'y', at: other.y });
    }
  }

  return {
    x: tidy(x ?? Math.round(rawX / GRID_STEP) * GRID_STEP),
    y: tidy(y ?? Math.round(rawY / GRID_STEP) * GRID_STEP),
    guides,
  };
}
