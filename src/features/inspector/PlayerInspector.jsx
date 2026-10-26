import { Eye, EyeOff, Replace, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useProject } from '../../state/context';
import { allRoleOptions, roleMap, units } from '../../utils/formations';
import Avatar from '../../ui/Avatar';
import { Button, Field, Group, Toggle } from '../../ui/controls';
import PhotoInput from '../players/PhotoInput';
import usePlayerCommands from '../players/usePlayerCommands';
import InspectorHeader from './InspectorHeader';

function RoleSelect({ slotId, positionId }) {
  const { dispatch } = useProject();
  return (
    <Field label="Role">
      <select value={positionId} onChange={(event) => dispatch({ type: 'setRole', slotId, positionId: event.target.value })}>
        {units.map((unit) => (
          <optgroup key={unit} label={unit}>
            {allRoleOptions.filter((option) => option.unit === unit).map((option) => (
              <option key={option.id} value={option.id}>{option.id} — {option.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
}

export default function PlayerInspector({ slotId }) {
  const { project, activeScene, dispatch, setUi, ui } = useProject();
  const { toggleVisible, removePlayer, resetPosition } = usePlayerCommands();
  const player = project.roster[slotId];
  const sceneSlot = activeScene.slots[slotId];
  const role = roleMap[sceneSlot.positionId] ?? { label: 'Player' };
  const openSearch = () => setUi({ popover: { type: 'search', slotId } });

  if (!player) {
    return (
      <div className="inspector-scroll">
        <InspectorHeader eyebrow={`Empty · ${sceneSlot.positionId}`} title={role.label} />
        <Group>
          <div className="empty-slot">
            <p>No one in this role yet. Search the directory or create a custom player.</p>
            <Button variant="primary" icon={Search} className="btn-block" onClick={openSearch}>Find a player</Button>
          </div>
          <RoleSelect slotId={slotId} positionId={sceneSlot.positionId} />
        </Group>
      </div>
    );
  }

  const update = (patch, field) => dispatch({ type: 'updatePlayer', slotId, patch }, { coalesce: field && `edit-${slotId}-${field}` });
  const text = (field) => ({
    value: player[field] ?? '',
    onChange: (event) => update({ [field]: event.target.value }, field),
  });

  return (
    <div className="inspector-scroll">
      <InspectorHeader eyebrow={`${sceneSlot.positionId} · ${role.label}`} title={player.name || 'Unnamed player'}>
        <Avatar player={player} size={40} accent={project.accents[slotId]} />
      </InspectorHeader>

      <Group>
        <Toggle
          label={sceneSlot.visible ? 'Visible in this scene' : 'Hidden in this scene'}
          hint={`“${activeScene.label}” · press H`}
          checked={sceneSlot.visible}
          onChange={() => toggleVisible(slotId)}
        />
      </Group>

      <Group title="Details">
        <Field label="Name">
          <input {...text('name')} />
        </Field>
        <div className="field-pair">
          <Field label="Number">
            <input
              type="number"
              min="0"
              max="99"
              value={player.number ?? ''}
              onChange={(event) => update({ number: event.target.value === '' ? null : Number(event.target.value) }, 'number')}
            />
          </Field>
          <Field label="Position">
            <input {...text('position')} />
          </Field>
        </div>
        <div className="field-pair">
          <Field label="Club">
            <input {...text('club')} />
          </Field>
          <Field label="Country">
            <input {...text('country')} />
          </Field>
        </div>
      </Group>

      <Group title="Photo">
        <PhotoInput
          player={player}
          accent={project.accents[slotId]}
          onPhotoChange={(photo) => update({ photo })}
          onCropChange={(photoCropY) => update({ photoCropY }, 'crop')}
        />
      </Group>

      <Group title="On the pitch" action={<span className="scope-note">{ui.scope === 'all' ? 'All scenes' : 'This scene'}</span>}>
        <RoleSelect slotId={slotId} positionId={sceneSlot.positionId} />
        {sceneSlot.x != null && (
          <Button size="sm" icon={RotateCcw} onClick={() => resetPosition(slotId)}>
            Reset to {role.label.toLowerCase()} position
          </Button>
        )}
      </Group>

      <Group>
        <div className="button-row">
          <Button icon={Replace} onClick={openSearch}>Replace</Button>
          <Button icon={sceneSlot.visible ? EyeOff : Eye} variant="ghost" onClick={() => toggleVisible(slotId)}>
            {sceneSlot.visible ? 'Hide' : 'Show'}
          </Button>
          <Button icon={Trash2} variant="danger" onClick={() => removePlayer(slotId)}>Remove</Button>
        </div>
      </Group>
    </div>
  );
}
