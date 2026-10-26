import { getCoordinates, unitIndex } from '../utils/formations';
import { SLOT_IDS } from '../state/project';
import { getGeometry } from './geometry';
import { drawPitch } from './pitch';
import { drawPlayer } from './player';

const mix = (from, to, progress) => from + (to - from) * progress;
const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const easeOutQuint = (progress) => 1 - ((1 - progress) ** 5);
const easeInOutQuint = (progress) => (
  progress < 0.5 ? 16 * (progress ** 5) : 1 - ((-2 * progress + 2) ** 5) / 2
);

export const slotCoord = (sceneSlot, orientation) => (
  sceneSlot.x != null && sceneSlot.y != null
    ? { x: sceneSlot.x, y: sceneSlot.y }
    : getCoordinates(sceneSlot.positionId, orientation)
);

/** Flattens a project scene into what the renderer draws. */
export function resolveScene(project, scene) {
  const { orientation } = project;
  return {
    orientation,
    slots: SLOT_IDS.map((slotId) => {
      const sceneSlot = scene.slots[slotId];
      const profile = project.roster[slotId];
      return {
        id: slotId,
        positionId: sceneSlot.positionId,
        profile,
        accent: project.accents[slotId],
        coord: slotCoord(sceneSlot, orientation),
        opacity: profile && sceneSlot.visible ? 1 : 0,
        scale: 1,
        offsetY: 0,
      };
    }),
  };
}

// Entrances and exits stagger by unit (keeper first), so a whole XI landing
// together still reads back-to-front.
const STAGGER = 0.08;

const playerMotion = (fromOpacity, toOpacity, progress, positionId, motion) => {
  if (fromOpacity === toOpacity) return { opacity: toOpacity, scale: 1, offsetY: 0 };

  const entering = toOpacity > fromOpacity;
  const local = clamp01((progress - unitIndex(positionId) * STAGGER) / (1 - 3 * STAGGER));
  const style = entering ? motion.entry : motion.exit;

  if (style === 'none') {
    const shown = entering ? local > 0 : local <= 0;
    return { opacity: shown ? 1 : 0, scale: 1, offsetY: 0 };
  }

  const amount = entering ? easeOutQuint(local) : 1 - easeInOutQuint(local);
  return {
    opacity: amount,
    scale: style === 'scale' ? 0.5 + amount * 0.5 : 1,
    offsetY: style === 'lift' || style === 'sink' ? (1 - amount) * 0.6 : 0,
  };
};

export function interpolateScene(from, to, progress, motion) {
  const movement = motion.transition === 'glide' ? easeOutQuint(progress) : easeInOutQuint(progress);
  return {
    orientation: to.orientation,
    slots: from.slots.map((fromSlot, index) => {
      const toSlot = to.slots[index];
      return {
        ...toSlot,
        coord: {
          x: mix(fromSlot.coord.x, toSlot.coord.x, movement),
          y: mix(fromSlot.coord.y, toSlot.coord.y, movement),
        },
        ...playerMotion(fromSlot.opacity, toSlot.opacity, progress, toSlot.positionId, motion),
      };
    }),
  };
}

/**
 * Draws a resolved scene. `scale` maps logical frame pixels to canvas pixels
 * (include devicePixelRatio for on-screen canvases).
 */
export function renderScene(context, rendered, { scale = 1, portraits = new Map(), style, editor = false }) {
  const geometry = getGeometry(rendered.orientation);
  const options = {
    markerScale: style.markerScale,
    showNames: style.showNames,
    orientation: rendered.orientation,
    editor,
  };

  context.save();
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  drawPitch(context, geometry, rendered.orientation, { guides: editor && style.showGuides });
  // Empty roles underneath, players on top.
  rendered.slots.filter((slot) => !slot.profile).forEach((slot) => drawPlayer(context, slot, geometry, portraits, options));
  rendered.slots.filter((slot) => slot.profile).forEach((slot) => drawPlayer(context, slot, geometry, portraits, options));
  context.restore();
}

export function renderToCanvas(rendered, { scale = 1, portraits, style }) {
  const { frame } = getGeometry(rendered.orientation);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frame.width * scale);
  canvas.height = Math.round(frame.height * scale);
  renderScene(canvas.getContext('2d'), rendered, { scale, portraits, style });
  return canvas;
}
