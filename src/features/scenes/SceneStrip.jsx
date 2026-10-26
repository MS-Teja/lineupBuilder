import { Play, Plus, Square } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useProject } from '../../state/context';
import { makeId } from '../../state/project';
import { usePlayhead } from '../../state/playhead';
import { buildTimeline } from '../../render/timeline';
import usePortraits from '../../stage/usePortraits';
import { Button, IconButton, Segmented } from '../../ui/controls';
import RevealMenu from './RevealMenu';
import SceneThumb from './SceneThumb';
import './scenes.css';

const formatTime = (milliseconds) => {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
};

const scopeOptions = [
  { value: 'all', label: 'All scenes' },
  { value: 'scene', label: 'This scene' },
];

export default function SceneStrip() {
  const { project, activeScene, ui, setUi, dispatch } = useProject();
  const time = usePlayhead();
  const portraits = usePortraits(project);
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const activeIndex = project.scenes.indexOf(activeScene);
  const current = ui.isPlaying ? time : timeline.sceneStarts[activeIndex];

  const select = (scene) => setUi({ activeSceneId: scene.id, focus: 'scene', selectedSlotId: null, popover: null, isPlaying: false });

  const addScene = () => {
    const id = makeId('scene');
    dispatch({ type: 'addScene', id });
    setUi({ activeSceneId: id, focus: 'scene', selectedSlotId: null, isPlaying: false });
  };

  const drop = (index) => {
    if (dragIndex != null && dragIndex !== index) dispatch({ type: 'moveScene', from: dragIndex, to: index });
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <footer className="scene-strip">
      <div className="strip-toolbar">
        <div className="strip-transport">
          <IconButton
            variant="accent"
            icon={ui.isPlaying ? Square : Play}
            label={ui.isPlaying ? 'Stop (Space)' : 'Play from start (Space)'}
            onClick={() => setUi((state) => ({ isPlaying: !state.isPlaying, popover: null }))}
          />
          <span className="timecode tabular">
            {formatTime(current)}
            <span> / {formatTime(timeline.total)}</span>
          </span>
        </div>

        <div className="strip-scope">
          <span className="control-label">Pitch edits apply to</span>
          <Segmented size="sm" label="Edit scope" options={scopeOptions} value={ui.scope} onChange={(scope) => setUi({ scope })} />
        </div>

        <div className="strip-actions">
          <Button size="sm" icon={Plus} onClick={addScene} title="Duplicate the current scene">Scene</Button>
          <RevealMenu />
        </div>
      </div>

      <div className="strip-track">
        <div className="strip-progress" aria-hidden="true">
          <span style={{ width: `${timeline.total ? (current / timeline.total) * 100 : 0}%` }} />
        </div>
        <ol className="scene-list" aria-label="Scenes">
          {project.scenes.map((scene, index) => (
            <li
              key={scene.id}
              className={`scene-item ${overIndex === index && dragIndex !== index ? 'is-drop-target' : ''} ${dragIndex === index ? 'is-dragging' : ''}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                setDragIndex(index);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                drop(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              {index > 0 && <span className="scene-link" aria-hidden="true" />}
              <button
                type="button"
                className={`scene-card ${scene.id === activeScene.id ? 'is-active' : ''}`}
                aria-current={scene.id === activeScene.id}
                onClick={() => select(scene)}
              >
                <SceneThumb rendered={timeline.resolved[index]} portraits={portraits} style={project.style} />
                <span className="scene-card-meta">
                  <b className="tabular">{index + 1}</b>
                  <span className="scene-name">{scene.label || 'Untitled'}</span>
                  <span className="scene-duration tabular">{(scene.duration / 1000).toFixed(1)}s</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </footer>
  );
}
