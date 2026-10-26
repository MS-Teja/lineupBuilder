import { Copy, Trash2 } from 'lucide-react';
import { useProject } from '../../state/context';
import { formationLabel, makeId } from '../../state/project';
import { Button, Field, Group, Slider } from '../../ui/controls';
import InspectorHeader from './InspectorHeader';

export default function SceneInspector() {
  const { project, activeScene, dispatch, setUi, notify, undo } = useProject();
  const index = project.scenes.indexOf(activeScene);
  const visibleCount = Object.entries(activeScene.slots)
    .filter(([slotId, slot]) => project.roster[slotId] && slot.visible).length;
  const update = (patch, coalesce) => dispatch({ type: 'updateScene', id: activeScene.id, patch }, { coalesce });

  const duplicate = () => {
    const id = makeId('scene');
    dispatch({ type: 'addScene', id });
    setUi({ activeSceneId: id, focus: 'scene' });
  };

  const remove = () => {
    const next = project.scenes[index + 1] ?? project.scenes[index - 1];
    dispatch({ type: 'deleteScene', id: activeScene.id });
    setUi({ activeSceneId: next.id, focus: 'style' });
    notify(`“${activeScene.label}” deleted`, { label: 'Undo', onClick: undo });
  };

  return (
    <div className="inspector-scroll">
      <InspectorHeader eyebrow={`Scene ${index + 1} of ${project.scenes.length}`} title={activeScene.label || 'Untitled scene'} />

      <Group>
        <Field label="Name">
          <input
            value={activeScene.label}
            maxLength={28}
            onChange={(event) => update({ label: event.target.value }, `scene-label-${activeScene.id}`)}
          />
        </Field>
        <Slider
          label="Hold on screen"
          value={activeScene.duration}
          min={200}
          max={5000}
          step={50}
          format={(value) => `${(value / 1000).toFixed(2)}s`}
          onChange={(duration) => update({ duration }, `scene-duration-${activeScene.id}`)}
        />
        <dl className="facts">
          <div><dt>Formation</dt><dd>{formationLabel(activeScene)}</dd></div>
          <div><dt>Players on screen</dt><dd>{visibleCount}</dd></div>
        </dl>
        <p className="hint">Edit this scene by changing the pitch while it’s selected. Hide players to stage a reveal.</p>
      </Group>

      <Group>
        <div className="button-row">
          <Button icon={Copy} onClick={duplicate}>Duplicate</Button>
          <Button icon={Trash2} variant="danger" onClick={remove} disabled={project.scenes.length <= 1}>Delete</Button>
        </div>
      </Group>
    </div>
  );
}
