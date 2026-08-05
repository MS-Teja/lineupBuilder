import {
  ChevronDown,
  ChevronUp,
  FileImage,
  FileVideo,
  Film,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';

const motionGroups = [
  {
    key: 'playerEntry',
    label: 'Players in',
    options: [
      ['lift', 'Lift'],
      ['fade', 'Fade'],
      ['scale', 'Scale'],
      ['none', 'None'],
    ],
  },
  {
    key: 'playerExit',
    label: 'Players out',
    options: [
      ['sink', 'Sink'],
      ['fade', 'Fade'],
      ['scale', 'Scale'],
      ['none', 'None'],
    ],
  },
  {
    key: 'formationTransition',
    label: 'Formation',
    options: [
      ['flow', 'Flow'],
      ['glide', 'Glide'],
      ['cut', 'Cut'],
    ],
  },
];

export default function MotionTimeline({
  keyframes,
  activeKeyframeId,
  motion,
  isExpanded,
  isPlaying,
  exportState,
  onToggle,
  onSelectKeyframe,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateKeyframe,
  onMotionChange,
  onPlay,
  onExportVideo,
  onExportGif,
  onExportStill,
}) {
  const activeKeyframe = keyframes.find((keyframe) => keyframe.id === activeKeyframeId) ?? keyframes[0];
  const exportLabel = exportState
    ? `Rendering ${exportState.progress}%`
    : 'Ready to export';

  return (
    <section className={`motion-panel ${isExpanded ? 'is-expanded' : ''}`} aria-label="Animation and export">
      <button type="button" className="motion-panel-toggle" onClick={onToggle} aria-expanded={isExpanded}>
        <span className="motion-panel-icon"><Film size={16} /></span>
        <span className="motion-panel-copy">
          <span className="eyebrow">ANIMATION & EXPORT</span>
          <strong>{isExpanded ? 'Shape the sequence' : 'Animate the tactical board'}</strong>
        </span>
        <span className="motion-panel-summary">{keyframes.length} keyframes · WebM / GIF</span>
        {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {isExpanded && (
        <div className="motion-panel-body">
          <div className="keyframe-strip" aria-label="Keyframes">
            <div className="keyframe-strip-heading">
              <span>Timeline</span>
              <small>Capture any lineup state as a cue.</small>
            </div>

            <div className="keyframe-list">
              {keyframes.map((keyframe, index) => (
                <div key={keyframe.id} className={`keyframe-item ${keyframe.id === activeKeyframe.id ? 'is-active' : ''}`}>
                  <button type="button" className="keyframe-button" onClick={() => onSelectKeyframe(keyframe.id)}>
                    <span className="keyframe-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="keyframe-name">{keyframe.label}</span>
                    <span className="keyframe-duration">{(keyframe.duration / 1000).toFixed(1)}s</span>
                  </button>
                  {keyframes.length > 1 && (
                    <button
                      type="button"
                      className="remove-keyframe"
                      onClick={() => onRemoveKeyframe(keyframe.id)}
                      aria-label={`Remove ${keyframe.label}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="capture-keyframe" onClick={onAddKeyframe}>
                <Plus size={15} />
                Capture
              </button>
            </div>
          </div>

          <div className="timeline-settings">
            <div className="keyframe-editor">
              <label>
                <span>Cue name</span>
                <input
                  type="text"
                  value={activeKeyframe.label}
                  onChange={(event) => onUpdateKeyframe(activeKeyframe.id, { label: event.target.value })}
                  maxLength="24"
                  aria-label="Selected keyframe name"
                />
              </label>
              <label className="duration-control">
                <span>Hold / transition <strong>{(activeKeyframe.duration / 1000).toFixed(1)}s</strong></span>
                <input
                  type="range"
                  min="350"
                  max="1800"
                  step="50"
                  value={activeKeyframe.duration}
                  onChange={(event) => onUpdateKeyframe(activeKeyframe.id, { duration: Number(event.target.value) })}
                  aria-label="Selected keyframe duration"
                />
              </label>
            </div>

            <div className="motion-controls" aria-label="Motion styles">
              {motionGroups.map((group) => (
                <div className="motion-control" key={group.key}>
                  <span>{group.label}</span>
                  <div>
                    {group.options.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={motion[group.key] === value ? 'is-active' : ''}
                        onClick={() => onMotionChange({ [group.key]: value })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <label className="formation-speed">
                <span>Formation speed <strong>{motion.formationDuration}ms</strong></span>
                <input
                  type="range"
                  min="180"
                  max="1100"
                  step="20"
                  value={motion.formationDuration}
                  onChange={(event) => onMotionChange({ formationDuration: Number(event.target.value) })}
                />
              </label>
            </div>
          </div>

          <div className="timeline-export">
            <div className="export-status">
              <span>{exportState ? <span className="export-progress" style={{ '--progress': `${exportState.progress}%` }} /> : <span className="export-ready-dot" />}</span>
              <div>
                <strong>{exportLabel}</strong>
                <small>Video uses your current keyframes. GIF is optimised for sharing.</small>
              </div>
            </div>
            <div className="timeline-actions">
              <button type="button" onClick={onPlay} disabled={isPlaying || Boolean(exportState)}>
                <Play size={15} fill="currentColor" />
                {isPlaying ? 'Playing…' : 'Preview'}
              </button>
              <button type="button" onClick={onExportStill} disabled={Boolean(exportState)} title="Export the current frame as PNG">
                <FileImage size={15} />
                PNG
              </button>
              <button type="button" onClick={onExportGif} disabled={Boolean(exportState)}>
                <Film size={15} />
                GIF
              </button>
              <button type="button" className="video-export" onClick={onExportVideo} disabled={Boolean(exportState)}>
                <FileVideo size={16} />
                Export video
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
