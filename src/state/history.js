const LIMIT = 100;
const COALESCE_MS = 1000;

export const createHistory = (present) => ({ past: [], present, future: [], lastKey: null, lastAt: 0 });

/**
 * Wraps a reducer with undo/redo. Events:
 *   { type: 'commit', action, coalesceKey?, at }  — apply action as one step
 *   { type: 'undo' } | { type: 'redo' }
 * Consecutive commits sharing a coalesceKey within a second merge into one
 * step, so sliders, typing and keyboard nudges don't flood the history.
 */
export const withHistory = (reducer) => (state, event) => {
  switch (event.type) {
    case 'undo':
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past.at(-1),
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };

    case 'redo':
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };

    case 'commit': {
      const next = reducer(state.present, event.action);
      if (next === state.present) return state;
      const merge = event.coalesceKey != null
        && event.coalesceKey === state.lastKey
        && event.at - state.lastAt < COALESCE_MS;
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-LIMIT),
        present: next,
        future: [],
        lastKey: event.coalesceKey ?? null,
        lastAt: event.at,
      };
    }

    default:
      return state;
  }
};
