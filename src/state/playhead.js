import { useSyncExternalStore } from 'react';

// Playback time lives outside React state so the rAF loop can update it every
// frame without re-rendering the whole editor; only subscribers re-render.
let time = 0;
const listeners = new Set();

export const playhead = {
  get: () => time,
  set: (next) => {
    time = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const usePlayhead = () => useSyncExternalStore(playhead.subscribe, playhead.get);
