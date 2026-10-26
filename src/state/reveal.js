import { roleMap, unitIndex } from '../utils/formations';

export const revealPresets = [
  { id: 'one', label: 'One by one', description: 'Goalkeeper first, then each player through to the front line.' },
  { id: 'lines', label: 'Line by line', description: 'Goalkeeper, defence, midfield, attack.' },
  { id: 'all', label: 'All at once', description: 'The XI lands together with a staggered entrance.' },
];

const lineNames = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];

const lastName = (name = '') => name.split(' ').filter(Boolean).at(-1) || name;

// Reveal order: by unit, then left flank to right flank (roleMap x is lateral).
const revealOrder = (scene, roster) =>
  Object.entries(scene.slots)
    .filter(([slotId]) => roster[slotId])
    .sort(([, a], [, b]) => (
      unitIndex(a.positionId) - unitIndex(b.positionId)
      || (roleMap[a.positionId]?.x ?? 50) - (roleMap[b.positionId]?.x ?? 50)
    ))
    .map(([slotId]) => slotId);

const withVisibility = (scene, visibleIds) => ({
  ...scene,
  slots: Object.fromEntries(Object.entries(scene.slots).map(([slotId, slot]) => [
    slotId,
    { ...slot, visible: visibleIds.has(slotId) },
  ])),
});

/**
 * Builds a full scene list that reveals the roster of `baseScene`. Every scene
 * shares the base layout; only visibility changes. Empty slots stay visible so
 * a player added later simply appears in every scene.
 */
export function buildReveal(presetId, baseScene, roster, idPrefix) {
  const order = revealOrder(baseScene, roster);
  const emptyIds = Object.keys(baseScene.slots).filter((slotId) => !roster[slotId]);
  const steps = [];

  // duration = hold on screen; transition = time to animate into the step.
  if (presetId === 'one') {
    order.forEach((slotId, index) => {
      steps.push({ label: lastName(roster[slotId].name), duration: 250, transition: 550, visible: order.slice(0, index + 1) });
    });
  } else if (presetId === 'lines') {
    lineNames.forEach((label, unit) => {
      const visible = order.filter((slotId) => unitIndex(baseScene.slots[slotId].positionId) <= unit);
      if (visible.length && visible.length !== steps.at(-1)?.visible.length) {
        steps.push({ label, duration: 450, transition: 800, visible });
      }
    });
  } else {
    steps.push({ label: 'Full XI', duration: 2500, transition: 1200, visible: order });
  }

  if (steps.length) steps.at(-1).duration = Math.max(steps.at(-1).duration, 2000);

  const scenes = [{ label: 'Opening', duration: 400, transition: 0, visible: [] }, ...steps].map((step, index) => ({
    ...withVisibility(baseScene, new Set([...emptyIds, ...step.visible])),
    id: `${idPrefix}-${index}`,
    label: step.label,
    duration: step.duration,
    transition: { duration: step.transition, easing: 'smooth' },
  }));

  return scenes;
}
