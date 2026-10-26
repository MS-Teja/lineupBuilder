import { getCoordinates, roleMap, unitIndex } from '../utils/formations';
import { SLOT_IDS } from '../state/project';
import { getGeometry } from './geometry';
import { drawPitch } from './pitch';
import { drawPlayer } from './player';

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
        labelOpacity: 1,
        // Choreography order: keeper → defence → midfield → attack, left to right.
        order: unitIndex(sceneSlot.positionId) * 100 + (roleMap[sceneSlot.positionId]?.x ?? 50),
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
    labelStyle: style.labelStyle,
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
