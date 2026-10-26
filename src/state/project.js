import { getFormation, initialSlots, parseFormationString } from '../utils/formations';
import { buildReveal } from './reveal';

export const PROJECT_VERSION = 2;

export const SLOT_IDS = initialSlots.map((slot) => slot.id);

export const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const ACCENTS = ['#c4a15b', '#d48657', '#c96f68', '#a8799b', '#7a7fad', '#548da0', '#579b81'];

export const accentFor = (name = '') => {
  const code = [...(name || 'player')].reduce((total, character) => total + character.charCodeAt(0), 0);
  return ACCENTS[code % ACCENTS.length];
};

export const DEFAULT_STYLE = { markerScale: 1, showNames: true, labelStyle: 'broadcast', showGuides: false, snap: true };

// How players appear and leave, and the delay between consecutive players (ms).
export const DEFAULT_MOTION = { entry: 'pop', exit: 'fade', stagger: 70 };

// The transition INTO a scene. duration 0 is a hard cut.
export const DEFAULT_TRANSITION = { duration: 600, easing: 'smooth' };

export const lastName = (name = '') => name.split(' ').filter(Boolean).at(-1) || name || 'Player';

export const initialsFor = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P';

export const sceneRoles = (scene) =>
  (scene.customShape && parseFormationString(scene.customShape)?.roles) || getFormation(scene.formationId).roles;

export const formationLabel = (scene) =>
  (scene.customShape && parseFormationString(scene.customShape)?.label) || getFormation(scene.formationId).label;

// True when a role was changed by hand away from the scene's formation.
// Compares role sets: formation changes hand roles out by proximity, not slot order.
export const isShapeModified = (scene) => {
  const current = SLOT_IDS.map((slotId) => scene.slots[slotId].positionId).sort().join();
  return current !== [...sceneRoles(scene)].sort().join();
};

export const hasCustomPositions = (scene) =>
  SLOT_IDS.some((slotId) => scene.slots[slotId].x != null);

const layoutFor = (formationId) => {
  const { roles } = getFormation(formationId);
  return Object.fromEntries(SLOT_IDS.map((slotId, index) => [
    slotId,
    { positionId: roles[index], x: null, y: null, visible: true },
  ]));
};

export function createDefaultProject() {
  const roster = Object.fromEntries(initialSlots.map((slot) => [slot.id, { ...slot.profile, photo: null }]));
  const accents = Object.fromEntries(initialSlots.map((slot) => [slot.id, slot.accent]));
  const base = { formationId: '4-3-3', customShape: null, slots: layoutFor('4-3-3') };

  return {
    version: PROJECT_VERSION,
    name: 'Untitled lineup',
    orientation: 'landscape',
    style: { ...DEFAULT_STYLE },
    motion: { ...DEFAULT_MOTION },
    roster,
    accents,
    scenes: buildReveal('lines', base, roster, 'scene'),
  };
}

// v1 had one global transition (motion.transition 'flow' | 'glide' | 'cut' and
// motion.duration); v2 gives every scene its own transition.
const migrateV1 = (raw) => {
  const transition = {
    duration: raw.motion?.transition === 'cut' ? 0 : (raw.motion?.duration ?? DEFAULT_TRANSITION.duration),
    easing: raw.motion?.transition === 'glide' ? 'snappy' : 'smooth',
  };
  const entry = { lift: 'lift', fade: 'fade', scale: 'pop', none: 'none' }[raw.motion?.entry] ?? DEFAULT_MOTION.entry;
  const exit = { sink: 'sink', fade: 'fade', scale: 'shrink', none: 'none' }[raw.motion?.exit] ?? DEFAULT_MOTION.exit;
  return {
    ...raw,
    version: PROJECT_VERSION,
    motion: { entry, exit, stagger: DEFAULT_MOTION.stagger },
    scenes: raw.scenes.map((scene) => ({ ...scene, transition: { ...transition } })),
  };
};

// Accepts whatever came out of storage; returns a usable project or null.
export function normalizeProject(stored) {
  const raw = stored?.version === 1 && Array.isArray(stored.scenes) ? migrateV1(stored) : stored;
  if (!raw || raw.version !== PROJECT_VERSION || !Array.isArray(raw.scenes) || !raw.scenes.length) return null;
  const valid = raw.scenes.every((scene) => SLOT_IDS.every((slotId) => scene.slots?.[slotId]?.positionId));
  if (!valid) return null;

  return {
    ...raw,
    orientation: raw.orientation === 'portrait' ? 'portrait' : 'landscape',
    style: { ...DEFAULT_STYLE, ...raw.style },
    motion: { ...DEFAULT_MOTION, ...raw.motion },
    roster: Object.fromEntries(SLOT_IDS.map((slotId) => [slotId, raw.roster?.[slotId] ?? null])),
    accents: { ...raw.accents },
    scenes: raw.scenes.map((scene) => ({ ...scene, transition: { ...DEFAULT_TRANSITION, ...scene.transition } })),
  };
}
