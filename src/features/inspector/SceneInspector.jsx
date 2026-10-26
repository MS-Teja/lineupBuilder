import { Copy, CopyCheck, Play, Trash2 } from 'lucide-react';
import { planTransition } from '../../render/motion';
import { useProject } from '../../state/context';
import { formationLabel, makeId } from '../../state/project';
import { Button, Field, Group, Segmented, Slider } from '../../ui/controls';
import InspectorHeader from './InspectorHeader';

const easingOptions = [
  { value: 'smooth', label: 'Smooth', title: 'Ease in and out' },
  { value: 'snappy', label: 'Snappy', title: 'Quick start, soft landing' },
  { value: 'linear', label: 'Linear', title: 'Constant speed' },
];

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// "3 players enter · 2 move" — what the transition into this scene will do.
const describe = (plan) => {
  const count = (kind) => plan.kinds.filter((item) => item === kind).length;
  const parts = [
    count('enter') && `${plural(count('enter'), 'player')} enter`,
    count('exit') && `${count('exit')} leave`,
    count('move') && `${count('move')} move`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing changes from the previous scene';
};

function TransitionGroup({ scene, index }) {
  const { project, dispatch, notify, undo, playback } = useProject();
  const { transition } = scene;
  const { timeline } = playback;
  const setTransition = (patch, coalesce) => dispatch({ type: 'updateScene', id: scene.id, patch: { transition: { ...transition, ...patch } } }, { coalesce });
  const plan = planTransition(timeline.resolved[index - 1], timeline.resolved[index], transition, project.motion);
  const span = timeline.scenes[index];

  return (
    <Group title="Transition in" action={<span className="scope-note">from “{project.scenes[index - 1].label}”</span>}>
      <Slider
        label="Length"
        value={transition.duration}
        min={0}
        max={2500}
        step={50}
        format={(value) => (value ? `${(value / 1000).toFixed(2)}s` : 'Cut')}
        onChange={(duration) => setTransition({ duration }, `transition-${scene.id}`)}
      />
      {transition.duration > 0 && (
        <div className="stack">
          <span className="control-label">Movement easing</span>
          <Segmented stretch size="sm" label="Movement easing" options={easingOptions} value={transition.easing} onChange={(easing) => setTransition({ easing })} />
        </div>
      )}
      <p className="hint">{describe(plan)}</p>
      <div className="button-row">
        <Button icon={Play} onClick={() => playback.play(span.start, Math.min(span.holdStart + 700, span.end - 1))}>Preview</Button>
        <Button
          variant="ghost"
          icon={CopyCheck}
          onClick={() => {
            dispatch({ type: 'setAllTransitions', transition });
            notify('Transition applied to every scene', { label: 'Undo', onClick: undo });
          }}
        >
          Use for all
        </Button>
      </div>
    </Group>
  );
}

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
          min={100}
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

      {index > 0 && <TransitionGroup key={activeScene.id} scene={activeScene} index={index} />}

      <Group>
        <div className="button-row">
          <Button icon={Copy} onClick={duplicate}>Duplicate</Button>
          <Button icon={Trash2} variant="danger" onClick={remove} disabled={project.scenes.length <= 1}>Delete</Button>
        </div>
      </Group>
    </div>
  );
}
