import { planTransition, sampleTransition } from './motion';
import { resolveScene } from './scene';

/**
 * The playback timeline. Scene i plays its transition in (from scene i−1),
 * then holds on screen for its duration:
 *
 *   [hold 0] [transition 1][hold 1] [transition 2][hold 2] …
 *
 * Playback, scrubbing, thumbnails of in-between frames and every export
 * sample this one timeline, so they always agree.
 */
export function buildTimeline(project, { reducedMotion = false } = {}) {
  const resolved = project.scenes.map((scene) => resolveScene(project, scene));
  const segments = [];
  const scenes = [];
  let time = 0;

  project.scenes.forEach((scene, index) => {
    const transition = index > 0 && !reducedMotion ? Math.max(0, scene.transition?.duration ?? 0) : 0;
    const entry = { start: time, holdStart: time + transition, end: time + transition + scene.duration };

    if (transition > 0) {
      segments.push({
        kind: 'transition',
        index,
        start: time,
        end: entry.holdStart,
        plan: planTransition(resolved[index - 1], resolved[index], { ...scene.transition, duration: transition }, project.motion),
      });
    }
    segments.push({ kind: 'hold', index, start: entry.holdStart, end: entry.end });
    scenes.push(entry);
    time = entry.end;
  });

  return { segments, resolved, scenes, total: time };
}

/** Index of the scene whose transition or hold contains time `t`. */
export const sceneAt = (timeline, t) => {
  const index = timeline.scenes.findIndex((scene) => t < scene.end);
  return index === -1 ? timeline.scenes.length - 1 : index;
};

/**
 * The frame at time `t` (clamped to the timeline). Returns the rendered scene,
 * the scene index it belongs to and whether it's mid-transition.
 */
export function sampleTimeline(timeline, t) {
  const time = Math.min(Math.max(t, 0), timeline.total);
  const segment = timeline.segments.find((item) => time < item.end) ?? timeline.segments.at(-1);

  if (segment.kind === 'hold') {
    return { rendered: timeline.resolved[segment.index], index: segment.index, inTransition: false };
  }

  const progress = (time - segment.start) / (segment.end - segment.start);
  return {
    rendered: sampleTransition(segment.plan, timeline.resolved[segment.index - 1], timeline.resolved[segment.index], progress),
    index: segment.index,
    inTransition: true,
  };
}
