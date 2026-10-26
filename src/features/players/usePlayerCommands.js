import { useProject } from '../../state/context';
import { accentFor } from '../../state/project';
import { slotCoord } from '../../render/scene';

/** Player actions shared by the pitch toolbar, inspector and keyboard shortcuts. */
export default function usePlayerCommands() {
  const { project, activeScene, dispatch, setUi, notify, undo } = useProject();
  const undoAction = { label: 'Undo', onClick: undo };

  const assignPlayer = (slotId, player) => {
    const previous = project.roster[slotId];
    dispatch({
      type: 'assignPlayer',
      slotId,
      profile: { ...player, number: player.number ?? previous?.number ?? null },
      accent: accentFor(player.name),
    });
    setUi({ popover: null, selectedSlotId: slotId, focus: 'slot' });
    notify(
      previous ? `${player.name} replaces ${previous.name}` : `${player.name} added at ${activeScene.slots[slotId].positionId}`,
      undoAction,
    );
  };

  const toggleVisible = (slotId) => {
    if (!project.roster[slotId]) return;
    dispatch({ type: 'setVisible', slotId, visible: !activeScene.slots[slotId].visible });
  };

  const removePlayer = (slotId) => {
    const player = project.roster[slotId];
    if (!player) return;
    dispatch({ type: 'removePlayer', slotId });
    notify(`${player.name} removed`, undoAction);
  };

  const resetPosition = (slotId) => dispatch({ type: 'resetSlot', slotId });

  const nudge = (slotId, dx, dy) => {
    const coord = slotCoord(activeScene.slots[slotId], project.orientation);
    const clamp = (value) => Math.max(4, Math.min(96, Math.round(value * 10) / 10));
    dispatch(
      { type: 'moveSlot', slotId, x: clamp(coord.x + dx), y: clamp(coord.y + dy) },
      { coalesce: `nudge-${slotId}` },
    );
  };

  return { assignPlayer, toggleVisible, removePlayer, resetPosition, nudge };
}
