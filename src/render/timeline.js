import { interpolateScene, resolveScene } from './scene';

/**
 * The playback timeline: each scene holds for its own duration, and moving
 * into the next scene takes motion.duration (zero for hard cuts).
 * Live preview and every export sample this same timeline.
 */
export function buildTimeline(project, { reducedMotion = false } = {}) {
  const motion = reducedMotion ? { ...project.motion, transition: 'cut' } : project.motion;
  const transition = motion.transition === 'cut' ? 0 : motion.duration;
  const resolved = project.scenes.map((scene) => resolveScene(project, scene));
  const segments = [];
  const sceneStarts = [];
  let time = 0;

  project.scenes.forEach((scene, index) => {
    if (index > 0 && transition > 0) {
      segments.push({ kind: 'transition', from: index - 1, to: index, start: time, end: time + transition });
      time += transition;
    }
    sceneStarts.push(time);
    segments.push({ kind: 'hold', index, start: time, end: time + scene.duration });
    time += scene.duration;
  });

  return { segments, resolved, sceneStarts, motion, total: time };
}

/** Returns the rendered scene at time `t` and the index of the scene it belongs to. */
export function sampleTimeline(timeline, t) {
  const segment = timeline.segments.find((item) => t < item.end) ?? timeline.segments.at(-1);

  if (segment.kind === 'hold') {
    return { rendered: timeline.resolved[segment.index], index: segment.index };
  }

  const progress = (t - segment.start) / (segment.end - segment.start);
  return {
    rendered: interpolateScene(timeline.resolved[segment.from], timeline.resolved[segment.to], progress, timeline.motion),
    index: segment.to,
  };
}
