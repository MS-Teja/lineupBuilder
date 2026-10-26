import { convertCoordinates, getFormation, initialSlots, parseFormationString, roleMap } from '../utils/formations';
import { SLOT_IDS } from './project';
import { buildReveal } from './reveal';

// Layout edits (formation, roles, positions, swaps) follow the editing scope:
// every scene, or only the active one. Visibility is always per scene.
const targetIds = (state, action) => (
  action.scope === 'scene' ? [action.activeSceneId] : state.scenes.map((scene) => scene.id)
);

const mapScenes = (state, ids, update) => ({
  ...state,
  scenes: state.scenes.map((scene) => (ids.includes(scene.id) ? update(scene) : scene)),
});

const mapSlots = (scene, update) => ({
  ...scene,
  slots: Object.fromEntries(SLOT_IDS.map((slotId, index) => [slotId, update(scene.slots[slotId], slotId, index)])),
});

const patchSlot = (scene, slotId, patch) => ({
  ...scene,
  slots: { ...scene.slots, [slotId]: { ...scene.slots[slotId], ...patch } },
});

// Each slot has a home role (the default 4-3-3 order). A formation hands its
// roles to the slots whose home role is nearest: greedy closest pairs, then
// pairwise swaps over squared distance so a line can shift by one (the holding
// midfielder drops into a back three) rather than a winger becoming a
// centre-back. Matching from home, not from the current shape, means a given
// formation always produces the same lineup, however many changes came before.
const HOME_ROLES = initialSlots.map((slot) => slot.positionId);

const matchRoles = (roles) => {
  const cost = (slotIndex, role) => {
    const home = roleMap[HOME_ROLES[slotIndex]];
    return (home.x - roleMap[role].x) ** 2 + (home.y - roleMap[role].y) ** 2;
  };

  const pairs = HOME_ROLES.flatMap((home, slotIndex) => roles.map((role, index) => ({ slotIndex, index, distance: cost(slotIndex, role) })))
    .sort((a, b) => a.distance - b.distance);
  const assigned = [];
  const taken = new Set();
  pairs.forEach(({ slotIndex, index }) => {
    if (assigned[slotIndex] || taken.has(index)) return;
    assigned[slotIndex] = roles[index];
    taken.add(index);
  });

  for (let improved = true, pass = 0; improved && pass < 20; pass += 1) {
    improved = false;
    for (let a = 0; a < assigned.length; a += 1) {
      for (let b = a + 1; b < assigned.length; b += 1) {
        if (cost(a, assigned[b]) + cost(b, assigned[a]) < cost(a, assigned[a]) + cost(b, assigned[b])) {
          [assigned[a], assigned[b]] = [assigned[b], assigned[a]];
          improved = true;
        }
      }
    }
  }
  return assigned;
};

const applyRoles = (scene, roles, patch) => {
  const assigned = matchRoles(roles);
  return {
    ...mapSlots(scene, (slot, slotId, index) => ({ ...slot, positionId: assigned[index] ?? slot.positionId, x: null, y: null })),
    ...patch,
  };
};

const activeScene = (state, action) =>
  state.scenes.find((scene) => scene.id === action.activeSceneId) ?? state.scenes.at(-1);

export function projectReducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.project;

    case 'rename':
      return { ...state, name: action.name };

    case 'setOrientation': {
      if (action.orientation === state.orientation) return state;
      const convert = (slot) => (
        slot.x == null || slot.y == null
          ? slot
          : { ...slot, ...convertCoordinates(slot.x, slot.y, state.orientation, action.orientation) }
      );
      return {
        ...state,
        orientation: action.orientation,
        scenes: state.scenes.map((scene) => mapSlots(scene, convert)),
      };
    }

    case 'setStyle':
      return { ...state, style: { ...state.style, ...action.patch } };

    case 'setMotion':
      return { ...state, motion: { ...state.motion, ...action.patch } };

    case 'setFormation': {
      const { roles } = getFormation(action.formationId);
      return mapScenes(state, targetIds(state, action), (scene) => (
        applyRoles(scene, roles, { formationId: action.formationId, customShape: null })
      ));
    }

    case 'setCustomShape': {
      const parsed = parseFormationString(action.shape);
      if (!parsed) return state;
      return mapScenes(state, targetIds(state, action), (scene) => (
        applyRoles(scene, parsed.roles, { customShape: parsed.id.replace('custom-', '') })
      ));
    }

    case 'setRole':
      return mapScenes(state, targetIds(state, action), (scene) => (
        patchSlot(scene, action.slotId, { positionId: action.positionId, x: null, y: null })
      ));

    case 'moveSlot':
      return mapScenes(state, targetIds(state, action), (scene) => (
        patchSlot(scene, action.slotId, { x: action.x, y: action.y })
      ));

    case 'resetSlot':
      return mapScenes(state, targetIds(state, action), (scene) => (
        patchSlot(scene, action.slotId, { x: null, y: null })
      ));

    case 'resetPositions':
      return mapScenes(state, targetIds(state, action), (scene) => (
        mapSlots(scene, (slot) => ({ ...slot, x: null, y: null }))
      ));

    case 'swapSlots':
      // Each scene swaps its own layouts, so per-scene shapes survive a swap.
      return mapScenes(state, targetIds(state, action), (scene) => {
        const a = scene.slots[action.a];
        const b = scene.slots[action.b];
        return {
          ...scene,
          slots: {
            ...scene.slots,
            [action.a]: { ...a, positionId: b.positionId, x: b.x, y: b.y },
            [action.b]: { ...b, positionId: a.positionId, x: a.x, y: a.y },
          },
        };
      });

    case 'setVisible':
      return mapScenes(state, [activeScene(state, action).id], (scene) => (
        patchSlot(scene, action.slotId, { visible: action.visible })
      ));

    case 'assignPlayer':
      return {
        ...mapScenes(state, [activeScene(state, action).id], (scene) => patchSlot(scene, action.slotId, { visible: true })),
        roster: { ...state.roster, [action.slotId]: action.profile },
        accents: { ...state.accents, [action.slotId]: action.accent },
      };

    case 'updatePlayer':
      if (!state.roster[action.slotId]) return state;
      return { ...state, roster: { ...state.roster, [action.slotId]: { ...state.roster[action.slotId], ...action.patch } } };

    case 'setAccent':
      return { ...state, accents: { ...state.accents, [action.slotId]: action.accent } };

    case 'removePlayer':
      return { ...state, roster: { ...state.roster, [action.slotId]: null } };

    case 'clearRoster':
      return { ...state, roster: Object.fromEntries(SLOT_IDS.map((slotId) => [slotId, null])) };

    case 'addScene': {
      const source = activeScene(state, action);
      const index = state.scenes.indexOf(source);
      const scene = { ...source, id: action.id, label: `Scene ${state.scenes.length + 1}`, duration: 900 };
      return { ...state, scenes: [...state.scenes.slice(0, index + 1), scene, ...state.scenes.slice(index + 1)] };
    }

    case 'deleteScene':
      if (state.scenes.length <= 1) return state;
      return { ...state, scenes: state.scenes.filter((scene) => scene.id !== action.id) };

    case 'moveScene': {
      const scenes = [...state.scenes];
      const [moved] = scenes.splice(action.from, 1);
      scenes.splice(action.to, 0, moved);
      return { ...state, scenes };
    }

    case 'updateScene':
      return mapScenes(state, [action.id], (scene) => ({ ...scene, ...action.patch }));

    case 'applyReveal':
      return { ...state, scenes: buildReveal(action.preset, activeScene(state, action), state.roster, action.idPrefix) };

    default:
      return state;
  }
}
