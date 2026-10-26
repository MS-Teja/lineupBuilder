import { RotateCcw, Trash2 } from 'lucide-react';
import { useProject } from '../../state/context';
import { hasCustomPositions } from '../../state/project';
import { Button, Group, Segmented, Slider, Toggle } from '../../ui/controls';
import InspectorHeader from './InspectorHeader';

const entryOptions = [
  { value: 'lift', label: 'Lift' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Pop' },
  { value: 'none', label: 'None' },
];

const exitOptions = [
  { value: 'sink', label: 'Sink' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Shrink' },
  { value: 'none', label: 'None' },
];

const transitionOptions = [
  { value: 'flow', label: 'Flow', title: 'Ease in and out' },
  { value: 'glide', label: 'Glide', title: 'Fast start, soft landing' },
  { value: 'cut', label: 'Cut', title: 'Jump straight to the next scene' },
];

const labelOptions = [
  { value: 'broadcast', label: 'Broadcast', title: 'Uppercase slab with number tab' },
  { value: 'pill', label: 'Pill', title: 'Rounded capsule' },
  { value: 'clean', label: 'Clean', title: 'Outlined text, no box' },
];

const sizeLabel = (value) => (value < 0.85 ? 'Small' : value > 1.2 ? 'Large' : 'Medium');

export default function StyleInspector() {
  const { project, activeScene, dispatch, notify, undo, ui } = useProject();
  const { style, motion } = project;
  const setStyle = (patch, coalesce) => dispatch({ type: 'setStyle', patch }, { coalesce });
  const setMotion = (patch, coalesce) => dispatch({ type: 'setMotion', patch }, { coalesce });
  const playerCount = Object.values(project.roster).filter(Boolean).length;
  const customPositions = project.scenes.some(hasCustomPositions);

  return (
    <div className="inspector-scroll">
      <InspectorHeader eyebrow="Lineup" title="Style & motion" closable={false} />

      <Group title="Players">
        <Slider
          label="Marker size"
          value={style.markerScale}
          min={0.6}
          max={1.6}
          step={0.05}
          format={(value) => `${sizeLabel(value)} · ${Math.round(value * 100)}%`}
          onChange={(markerScale) => setStyle({ markerScale }, 'marker-scale')}
        />
        <Toggle label="Show names" checked={style.showNames} onChange={(showNames) => setStyle({ showNames })} />
        {style.showNames && (
          <div className="stack">
            <span className="control-label">Name style</span>
            <Segmented stretch size="sm" label="Name style" options={labelOptions} value={style.labelStyle} onChange={(labelStyle) => setStyle({ labelStyle })} />
          </div>
        )}
      </Group>

      <Group title="Motion">
        <div className="stack">
          <span className="control-label">Players enter</span>
          <Segmented stretch size="sm" label="Entrance" options={entryOptions} value={motion.entry} onChange={(entry) => setMotion({ entry })} />
        </div>
        <div className="stack">
          <span className="control-label">Players leave</span>
          <Segmented stretch size="sm" label="Exit" options={exitOptions} value={motion.exit} onChange={(exit) => setMotion({ exit })} />
        </div>
        <div className="stack">
          <span className="control-label">Between scenes</span>
          <Segmented stretch size="sm" label="Transition" options={transitionOptions} value={motion.transition} onChange={(transition) => setMotion({ transition })} />
        </div>
        {motion.transition !== 'cut' && (
          <Slider
            label="Transition time"
            value={motion.duration}
            min={200}
            max={1500}
            step={20}
            format={(value) => `${(value / 1000).toFixed(2)}s`}
            onChange={(duration) => setMotion({ duration }, 'motion-duration')}
          />
        )}
      </Group>

      <Group title="Editor">
        <Toggle label="Snap while dragging" hint="Aligns to teammates and a fine grid" checked={style.snap} onChange={(snap) => setStyle({ snap })} />
        <Toggle label="Tactical guides" hint="Thirds and channels. Never exported." checked={style.showGuides} onChange={(showGuides) => setStyle({ showGuides })} />
      </Group>

      <Group title="Lineup">
        <Button
          icon={RotateCcw}
          className="btn-block"
          disabled={!customPositions}
          onClick={() => {
            dispatch({ type: 'resetPositions' });
            notify(ui.scope === 'all' ? 'All players back in formation' : `Players back in formation for “${activeScene.label}”`, { label: 'Undo', onClick: undo });
          }}
        >
          Snap everyone back to formation
        </Button>
        <Button
          icon={Trash2}
          variant="danger"
          className="btn-block"
          disabled={!playerCount}
          onClick={() => {
            dispatch({ type: 'clearRoster' });
            notify(`${playerCount} players cleared`, { label: 'Undo', onClick: undo });
          }}
        >
          Clear all players
        </Button>
      </Group>
    </div>
  );
}
