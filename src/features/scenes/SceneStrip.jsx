import { Pause, Play, Plus, SkipBack } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';
import { useProject } from '../../state/context';
import { makeId } from '../../state/project';
import { usePlayhead } from '../../state/playhead';
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

// Subscribes to the playhead on its own so playback doesn't re-render the strip.
function Timecode({ total }) {
  const time = usePlayhead();
  return (
    <span className="timecode tabular">
      {formatTime(time)}
      <span> / {formatTime(total)}</span>
    </span>
  );
}

function PlayheadMarker({ total }) {
  const time = usePlayhead();
  return <span className="ruler-playhead" style={{ left: `${total ? (time / total) * 100 : 0}%` }} aria-hidden="true" />;
}

/** Scenes and transitions drawn to scale. Click or drag anywhere to scrub. */
function Ruler({ timeline, activeIndex, playback }) {
  const ref = useRef(null);
  const percent = (ms) => `${(ms / timeline.total) * 100}%`;

  const seekAt = (event) => {
    const rect = ref.current.getBoundingClientRect();
    playback.seek(((event.clientX - rect.left) / rect.width) * timeline.total);
  };

  return (
    <div
      ref={ref}
      className="ruler"
      role="slider"
      tabIndex={-1}
      aria-label="Timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(timeline.total)}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        seekAt(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) seekAt(event);
      }}
      onPointerUp={() => playback.endSeek()}
    >
      {timeline.scenes.map((scene, index) => (
        <Fragment key={index}>
          {scene.holdStart > scene.start && (
            <span className="ruler-transition" style={{ left: percent(scene.start), width: percent(scene.holdStart - scene.start) }} />
          )}
          <span
            className={`ruler-hold ${index === activeIndex ? 'is-active' : ''}`}
            style={{ left: percent(scene.holdStart), width: percent(scene.end - scene.holdStart) }}
          />
        </Fragment>
      ))}
      <PlayheadMarker total={timeline.total} />
    </div>
  );
}

export default function SceneStrip() {
  const { project, activeScene, ui, setUi, dispatch, playback } = useProject();
  const { timeline } = playback;
  const portraits = usePortraits(project);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const activeIndex = project.scenes.indexOf(activeScene);

  const select = (scene) => {
    playback.exitPreview();
    setUi({ activeSceneId: scene.id, focus: 'scene', selectedSlotId: null, popover: null });
  };

  const addScene = () => {
    const id = makeId('scene');
    dispatch({ type: 'addScene', id });
    setUi({ activeSceneId: id, focus: 'scene', selectedSlotId: null });
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
          <IconButton icon={SkipBack} label="Back to start (Home)" onClick={() => playback.seek(0)} />
          <IconButton
            variant="accent"
            icon={ui.isPlaying ? Pause : Play}
            label={ui.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            onClick={playback.togglePlay}
          />
          <Timecode total={timeline.total} />
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

      <Ruler timeline={timeline} activeIndex={activeIndex} playback={playback} />

      <div className="strip-track">
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
              {index > 0 && (
                <button
                  type="button"
                  className="transition-chip tabular"
                  title={`Transition into “${scene.label}” — click to edit`}
                  onClick={() => select(scene)}
                >
                  {scene.transition.duration ? `${(scene.transition.duration / 1000).toFixed(1)}s` : 'Cut'}
                </button>
              )}
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
