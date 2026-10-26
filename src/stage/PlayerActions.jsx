import { Eye, EyeOff, Replace, RotateCcw, Trash2 } from 'lucide-react';
import { useProject } from '../state/context';
import { IconButton } from '../ui/controls';
import usePlayerCommands from '../features/players/usePlayerCommands';

/** Compact toolbar floating above the selected player on the pitch. */
export default function PlayerActions({ slotId, point, markerPx }) {
  const { project, activeScene, setUi } = useProject();
  const { toggleVisible, removePlayer, resetPosition } = usePlayerCommands();
  const visible = activeScene.slots[slotId].visible;
  const isCustom = activeScene.slots[slotId].x != null;
  const flip = point.y - markerPx / 2 < 56;

  if (!project.roster[slotId]) return null;

  return (
    <div
      className={`player-actions ${flip ? 'is-below' : ''}`}
      style={{
        left: point.x,
        top: flip ? point.y + markerPx * 1.05 : point.y - markerPx / 2 - 10,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <IconButton size="sm" icon={Replace} label="Replace player" onClick={() => setUi({ popover: { type: 'search', slotId } })} />
      <IconButton
        size="sm"
        icon={visible ? Eye : EyeOff}
        label={visible ? 'Hide in this scene (H)' : 'Show in this scene (H)'}
        active={!visible}
        onClick={() => toggleVisible(slotId)}
      />
      {isCustom && <IconButton size="sm" icon={RotateCcw} label="Reset to role position" onClick={() => resetPosition(slotId)} />}
      <span className="player-actions-divider" />
      <IconButton size="sm" icon={Trash2} label="Remove player (Delete)" className="is-danger" onClick={() => removePlayer(slotId)} />
    </div>
  );
}
