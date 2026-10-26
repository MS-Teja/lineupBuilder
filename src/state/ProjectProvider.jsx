import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ProjectContext } from './context';
import { createHistory, withHistory } from './history';
import { loadProject, saveProject } from './persistence';
import { projectReducer } from './reducer';
import usePlayback from './usePlayback';

const historyReducer = withHistory(projectReducer);

const initialUi = (project) => ({
  activeSceneId: project.scenes.at(-1).id,
  selectedSlotId: null,
  focus: 'style', // 'style' | 'slot' | 'scene'
  popover: null, // { type: 'search', slotId }
  scope: 'all', // layout edits apply to 'all' scenes or just this 'scene'
  isPlaying: false,
  isPreviewing: false, // stage shows the timeline at the playhead, not the editable scene
  isExportOpen: false,
  isInspectorOpen: false,
});

export default function ProjectProvider({ children }) {
  const [history, send] = useReducer(historyReducer, undefined, () => createHistory(loadProject()));
  const project = history.present;
  const [ui, setUiState] = useState(() => initialUi(project));
  const [toast, setToast] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const toastTimer = useRef(null);

  const activeScene = project.scenes.find((scene) => scene.id === ui.activeSceneId) ?? project.scenes.at(-1);

  const setUi = useCallback((patch) => {
    setUiState((current) => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) }));
  }, []);

  const playback = usePlayback({ project, ui, setUiState, activeIndex: project.scenes.indexOf(activeScene) });

  // Any edit leaves the preview so the stage shows what's being changed.
  const stopPlayback = playback.exitPreview;

  const dispatch = useCallback((action, { coalesce } = {}) => {
    stopPlayback();
    send({
      type: 'commit',
      action: { ...action, activeSceneId: activeScene.id, scope: ui.scope },
      coalesceKey: coalesce,
      at: Date.now(),
    });
  }, [activeScene.id, ui.scope, stopPlayback]);

  const undo = useCallback(() => {
    stopPlayback();
    send({ type: 'undo' });
  }, [stopPlayback]);

  const redo = useCallback(() => {
    stopPlayback();
    send({ type: 'redo' });
  }, [stopPlayback]);

  const notify = useCallback((message, action) => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, action, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaveStatus(saveProject(project) ? 'saved' : 'error');
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const value = useMemo(() => ({
    project,
    activeScene,
    dispatch,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    ui,
    setUi,
    toast,
    notify,
    dismissToast,
    saveStatus,
    playback,
  }), [project, activeScene, dispatch, undo, redo, history.past.length, history.future.length, ui, setUi, toast, notify, dismissToast, saveStatus, playback]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
