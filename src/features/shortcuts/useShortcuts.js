import { useEffect, useRef } from 'react';
import { useProject } from '../../state/context';
import usePlayerCommands from '../players/usePlayerCommands';

const NUDGE = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * Space play/pause · Home back to start · ⌘Z / ⇧⌘Z undo/redo · Delete remove ·
 * H hide/show · arrows nudge (Shift ×5) · Alt+←/→ previous/next scene ·
 * Esc leave preview / deselect.
 */
export default function useShortcuts() {
  const { project, activeScene, ui, setUi, undo, redo, playback } = useProject();
  const { removePlayer, toggleVisible, nudge } = usePlayerCommands();
  const handler = useRef(null);

  useEffect(() => {
    handler.current = (event) => {
      const isTyping = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && (key === 'z' || key === 'y')) {
        if (isTyping || ui.isExportOpen) return;
        event.preventDefault();
        if (key === 'y' || event.shiftKey) redo();
        else undo();
        return;
      }

      if (isTyping || mod || ui.isExportOpen) return;
      const selected = !ui.isPreviewing && ui.focus === 'slot' ? ui.selectedSlotId : null;

      if (event.key === ' ') {
        event.preventDefault();
        playback.togglePlay();
      } else if (event.key === 'Home') {
        event.preventDefault();
        playback.seek(0);
      } else if (event.key === 'Escape') {
        if (ui.isPreviewing) playback.exitPreview();
        else setUi({ selectedSlotId: null, focus: 'style', popover: null });
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault();
        removePlayer(selected);
      } else if (key === 'h' && selected) {
        toggleVisible(selected);
      } else if (NUDGE[event.key] && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        const index = project.scenes.indexOf(activeScene) + (event.key === 'ArrowLeft' ? -1 : 1);
        const scene = project.scenes[Math.max(0, Math.min(project.scenes.length - 1, index))];
        playback.exitPreview();
        setUi({ activeSceneId: scene.id, focus: 'scene', selectedSlotId: null, popover: null });
      } else if (NUDGE[event.key] && selected) {
        event.preventDefault();
        const [dx, dy] = NUDGE[event.key];
        const step = event.shiftKey ? 5 : 1;
        nudge(selected, dx * step, dy * step);
      }
    };
  });

  useEffect(() => {
    const listener = (event) => handler.current?.(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
