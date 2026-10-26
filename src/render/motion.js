// Choreography for the move from one scene to the next.
//
// Every player does exactly one thing in a transition:
//   stay  — visible in both scenes, same spot
//   move  — visible in both, travels from its old spot to its new one
//   enter — appears AT ITS NEW SPOT (never slides in from where it was hidden)
//   exit  — disappears AT ITS OLD SPOT
//   off   — hidden in both
//
// Timing within a transition (0 → 1): exits go first, then moves, then
// entrances. Phases only wait for each other when the earlier one exists, so
// a pure reveal uses the whole transition for its entrances. Entrances and
// exits stagger player by player, keeper first, left flank to right.

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
export const easeOutCubic = (t) => 1 - ((1 - t) ** 3);
const easeOutQuart = (t) => 1 - ((1 - t) ** 4);
const easeInCubic = (t) => t * t * t;
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutBack = (t) => {
  const overshoot = 1.6;
  return 1 + (overshoot + 1) * ((t - 1) ** 3) + overshoot * ((t - 1) ** 2);
};

export const EASINGS = {
  smooth: easeInOutCubic,
  snappy: easeOutQuart,
  linear: (t) => t,
};

const ENTRANCES = {
  pop: (u) => ({ opacity: clamp01(u * 2.5), scale: 0.35 + 0.65 * easeOutBack(u), offsetY: 0 }),
  lift: (u) => ({ opacity: easeOutCubic(u), scale: 1, offsetY: 0.45 * (1 - easeOutCubic(u)) }),
  drop: (u) => ({ opacity: easeOutCubic(u), scale: 1, offsetY: -0.45 * (1 - easeOutCubic(u)) }),
  fade: (u) => ({ opacity: easeInOutSine(u), scale: 1, offsetY: 0 }),
  none: (u) => ({ opacity: u > 0 ? 1 : 0, scale: 1, offsetY: 0 }),
};

const EXITS = {
  fade: (u) => ({ opacity: 1 - easeInOutSine(u), scale: 1, offsetY: 0 }),
  sink: (u) => ({ opacity: 1 - easeInCubic(u), scale: 1, offsetY: 0.35 * easeInCubic(u) }),
  shrink: (u) => ({ opacity: 1 - easeInCubic(u), scale: 1 - 0.65 * easeInCubic(u), offsetY: 0 }),
  none: (u) => ({ opacity: u > 0 ? 0 : 1, scale: 1, offsetY: 0 }),
};

export const ENTRANCE_STYLES = Object.keys(ENTRANCES);
export const EXIT_STYLES = Object.keys(EXITS);

const kindOf = (from, to) => {
  const wasOn = from.opacity > 0;
  const isOn = to.opacity > 0;
  if (wasOn && isOn) {
    const distance = Math.hypot(from.coord.x - to.coord.x, from.coord.y - to.coord.y);
    return distance > 0.05 ? 'move' : 'stay';
  }
  if (isOn) return 'enter';
  if (wasOn) return 'exit';
  return 'off';
};

// Spreads `ids` across [start, end]: each player animates for part of the
// window, starting `staggerMs` after the previous one (compressed to fit).
const staggered = (ids, start, end, staggerMs, durationMs) => {
  const length = end - start;
  const spread = ids.length > 1 ? Math.min(0.6, (staggerMs * (ids.length - 1)) / Math.max(durationMs * length, 1)) : 0;
  const each = length * (1 - spread);
  return new Map(ids.map((id, index) => {
    const delay = ids.length > 1 ? (length * spread * index) / (ids.length - 1) : 0;
    return [id, { start: start + delay, end: start + delay + each }];
  }));
};

/** Works out who does what, and when, for a transition between two resolved scenes. */
export function planTransition(from, to, { duration, easing }, motion) {
  const kinds = from.slots.map((slot, index) => kindOf(slot, to.slots[index]));
  const has = (kind) => kinds.includes(kind);
  const byOrder = (kind, reverse) => from.slots
    .map((slot, index) => ({ id: index, order: to.slots[index].order, kind: kinds[index] }))
    .filter((item) => item.kind === kind)
    .sort((a, b) => (reverse ? b.order - a.order : a.order - b.order))
    .map((item) => item.id);

  const exitEnd = has('move') || has('enter') ? 0.55 : 1;
  const moveStart = has('exit') ? 0.2 : 0;
  const enterStart = has('exit') ? 0.4 : has('move') ? 0.25 : 0;

  const exits = staggered(byOrder('exit', true), 0, exitEnd, motion.stagger, duration);
  const entrances = staggered(byOrder('enter', false), enterStart, 1, motion.stagger, duration);

  return {
    kinds,
    windows: kinds.map((kind, index) => {
      if (kind === 'exit') return exits.get(index);
      if (kind === 'enter') return entrances.get(index);
      if (kind === 'move') return { start: moveStart, end: 1 };
      return { start: 0, end: 1 };
    }),
    ease: EASINGS[easing] ?? EASINGS.smooth,
    entrance: ENTRANCES[motion.entry] ?? ENTRANCES.pop,
    exit: EXITS[motion.exit] ?? EXITS.fade,
    instantEntrance: motion.entry === 'none',
    instantExit: motion.exit === 'none',
  };
}

const local = (window, progress) => clamp01((progress - window.start) / Math.max(window.end - window.start, 1e-6));

/** The frame at `progress` (0–1) through a planned transition. */
export function sampleTransition(plan, from, to, progress) {
  return {
    orientation: to.orientation,
    slots: to.slots.map((target, index) => {
      const source = from.slots[index];
      const kind = plan.kinds[index];
      const u = local(plan.windows[index], progress);

      if (kind === 'move') {
        const t = plan.ease(u);
        return {
          ...target,
          coord: {
            x: source.coord.x + (target.coord.x - source.coord.x) * t,
            y: source.coord.y + (target.coord.y - source.coord.y) * t,
          },
        };
      }
      if (kind === 'enter') {
        const look = plan.entrance(u);
        // Names settle in just after the marker lands.
        return { ...target, ...look, labelOpacity: plan.instantEntrance ? look.opacity : clamp01((u - 0.35) / 0.5) };
      }
      if (kind === 'exit') {
        const look = plan.exit(u);
        return { ...target, coord: source.coord, ...look, labelOpacity: plan.instantExit ? look.opacity : clamp01(1 - u * 2.5) };
      }
      return target;
    }),
  };
}
