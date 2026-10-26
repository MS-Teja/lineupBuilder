import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { buildTimeline, sceneAt } from '../render/timeline';
import { playhead } from './playhead';

const motionQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
const subscribeMotion = (listener) => {
  motionQuery?.addEventListener('change', listener);
  return () => motionQuery?.removeEventListener('change', listener);
};
const prefersReducedMotion = () => Boolean(motionQuery?.matches);

const inHold = (timeline, t) => t >= timeline.scenes[sceneAt(timeline, t)].holdStart;
const sceneIdAt = ({ timeline, project }, t) => project.scenes[sceneAt(timeline, t)].id;

/**
 * The transport. Two UI flags drive it:
 *   isPreviewing — the stage shows the timeline frame at the playhead
 *                  (playing, scrubbing, or paused mid-transition) instead of
 *                  the editable active scene.
 *   isPlaying    — the playhead is advancing.
 * Whenever we're not previewing, the playhead rests where the active scene's
 * hold begins, so the strip always shows where you are.
 */
export default function usePlayback({ project, ui, setUiState, activeIndex }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const timeline = useMemo(() => buildTimeline(project, { reducedMotion }), [project, reducedMotion]);
  const latest = useRef({ timeline, project });
  const stopAt = useRef(null);

  useEffect(() => {
    latest.current = { timeline, project };
  });

  useEffect(() => {
    if (!ui.isPreviewing) playhead.set(timeline.scenes[activeIndex]?.holdStart ?? 0);
  }, [ui.isPreviewing, activeIndex, timeline]);

  // Leaving the preview lands on whichever scene the playhead is in.
  const exitPreview = useCallback(() => {
    setUiState((current) => (current.isPreviewing || current.isPlaying
      ? { ...current, isPlaying: false, isPreviewing: false, activeSceneId: sceneIdAt(latest.current, playhead.get()) }
      : current));
  }, [setUiState]);

  /** Play from `from` (ms) — default: the transition into the active scene, or the top if that's the end. */
  const play = useCallback((from, until = null) => {
    const { timeline: current } = latest.current;
    let start = from;
    if (start == null) {
      start = playhead.get();
      const atLastHold = sceneAt(current, start) === current.scenes.length - 1 && start >= current.scenes.at(-1).holdStart;
      if (!ui.isPreviewing) start = atLastHold ? 0 : current.scenes[sceneAt(current, start)].start;
      if (start >= current.total - 1) start = 0;
    }
    stopAt.current = until;
    playhead.set(start);
    setUiState((state) => ({ ...state, isPlaying: true, isPreviewing: true, popover: null }));
  }, [setUiState, ui.isPreviewing]);

  const pause = useCallback(() => {
    if (inHold(latest.current.timeline, playhead.get())) exitPreview();
    else setUiState((state) => ({ ...state, isPlaying: false }));
  }, [exitPreview, setUiState]);

  const togglePlay = useCallback(() => (ui.isPlaying ? pause() : play()), [ui.isPlaying, pause, play]);

  /** Scrub: show the frame at t without playing. */
  const seek = useCallback((t) => {
    const time = Math.min(Math.max(t, 0), latest.current.timeline.total);
    playhead.set(time);
    setUiState((state) => ({ ...state, isPlaying: false, isPreviewing: true, popover: null, activeSceneId: sceneIdAt(latest.current, time) }));
  }, [setUiState]);

  /** End of a scrub: resting on a hold returns to editing that scene. */
  const endSeek = useCallback(() => {
    if (inHold(latest.current.timeline, playhead.get())) exitPreview();
  }, [exitPreview]);

  useEffect(() => {
    if (!ui.isPlaying) return undefined;
    const { timeline: current } = latest.current;
    const end = Math.min(stopAt.current ?? current.total, current.total);
    const startTime = playhead.get();
    const startedAt = performance.now();
    let frame = 0;
    let lastIndex = -1;

    const tick = (now) => {
      const t = Math.min(startTime + (now - startedAt), end);
      playhead.set(t);
      const index = sceneAt(current, t);
      if (index !== lastIndex) {
        lastIndex = index;
        setUiState((state) => ({ ...state, activeSceneId: latest.current.project.scenes[index].id }));
      }
      if (t >= end) {
        stopAt.current = null;
        setUiState((state) => ({ ...state, isPlaying: false, isPreviewing: !inHold(current, t) }));
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ui.isPlaying, setUiState]);

  return { timeline, play, pause, togglePlay, seek, endSeek, exitPreview };
}
