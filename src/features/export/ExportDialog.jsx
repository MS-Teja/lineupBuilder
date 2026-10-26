import { Check, Download, FileImage, Film, FileVideo, LoaderCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { VIDEO_SIZES, exportGif, exportStill, exportVideo, fileStem, videoFormat } from '../../export/exporters';
import { buildTimeline } from '../../render/timeline';
import { useProject } from '../../state/context';
import { Button, Field, Segmented } from '../../ui/controls';
import Dialog from '../../ui/Dialog';
import './export.css';

const seconds = (milliseconds) => `${(milliseconds / 1000).toFixed(1)}s`;

const sizeOptions = Object.entries(VIDEO_SIZES).map(([value, { label }]) => ({ value, label }));
const fpsOptions = [{ value: 30, label: '30 fps' }, { value: 60, label: '60 fps' }];

const dimensions = (scale, landscape) => {
  const long = Math.round((1920 * scale) / 2) * 2;
  const short = Math.round((1080 * scale) / 2) * 2;
  return landscape ? `${long}×${short}` : `${short}×${long}`;
};

export default function ExportDialog() {
  const { project, activeScene, setUi } = useProject();
  const video = useMemo(() => videoFormat(), []);
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const [format, setFormat] = useState(video ? 'video' : 'gif');
  const [size, setSize] = useState('1080p');
  const [fps, setFps] = useState(60);
  const [filename, setFilename] = useState(() => fileStem(project.name));
  const [job, setJob] = useState({ status: 'idle', progress: 0, error: null });
  const isBusy = job.status === 'working';
  const close = useCallback(() => setUi({ isExportOpen: false }), [setUi]);

  const landscape = project.orientation === 'landscape';
  const formats = [
    {
      id: 'video',
      icon: FileVideo,
      title: video ? `${video.extension.toUpperCase()} video` : 'Video',
      detail: video ? `${dimensions(VIDEO_SIZES[size].scale, landscape)} · ${fps} fps · ${seconds(timeline.total)}` : 'Not supported in this browser',
      disabled: !video,
    },
    {
      id: 'gif',
      icon: Film,
      title: 'GIF',
      detail: `${landscape ? '1280×720' : '720×1280'} · 12 fps · loops`,
    },
    {
      id: 'png',
      icon: FileImage,
      title: 'PNG still',
      detail: `${landscape ? '3840×2160' : '2160×3840'} · “${activeScene.label}”`,
    },
  ];

  const run = async () => {
    const stem = fileStem(filename);
    const onProgress = (progress) => setJob((current) => ({ ...current, progress }));
    setJob({ status: 'working', progress: 0, error: null });
    try {
      if (format === 'png') await exportStill({ project, scene: activeScene, filename: `${stem}.png` });
      else if (format === 'gif') await exportGif({ project, filename: `${stem}.gif`, onProgress });
      else await exportVideo({ project, filenameBase: stem, onProgress, size, fps });
      setJob({ status: 'done', progress: 1, error: null });
    } catch (error) {
      console.error('Export failed', error);
      setJob({ status: 'error', progress: 0, error: error.message || 'Export failed.' });
    }
  };

  const footer = (
    <>
      {isBusy && format !== 'png' && (
        <div className="export-progress" role="progressbar" aria-valuenow={Math.round(job.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${job.progress * 100}%` }} />
          <small className="tabular">{Math.round(job.progress * 100)}%</small>
        </div>
      )}
      {job.status === 'done' && <span className="export-done"><Check size={15} /> Downloaded</span>}
      <Button variant="ghost" onClick={close} disabled={isBusy}>{job.status === 'done' ? 'Close' : 'Cancel'}</Button>
      <Button variant="primary" icon={isBusy ? LoaderCircle : Download} onClick={run} disabled={isBusy} className={isBusy ? 'is-busy' : ''}>
        {isBusy ? 'Rendering…' : 'Export'}
      </Button>
    </>
  );

  return (
    <Dialog
      title="Export"
      subtitle={`${project.scenes.length} scenes · ${landscape ? '16:9 video' : '9:16 Shorts'}`}
      onClose={close}
      canClose={!isBusy}
      footer={footer}
    >
      <div className="export-formats" role="radiogroup" aria-label="Format">
        {formats.map(({ id, icon: Icon, title, detail, disabled }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={format === id}
            className={`export-format ${format === id ? 'is-active' : ''}`}
            onClick={() => setFormat(id)}
            disabled={disabled || isBusy}
          >
            <Icon size={20} />
            <strong>{title}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </div>

      <Field label="File name" className="export-filename">
        <div className="export-filename-row">
          <input value={filename} onChange={(event) => setFilename(event.target.value)} disabled={isBusy} spellCheck={false} />
          <span>.{format === 'video' ? video?.extension ?? 'webm' : format}</span>
        </div>
      </Field>

      {format === 'video' && video && (
        <div className="export-options">
          <div className="stack">
            <span className="control-label">Resolution</span>
            <Segmented size="sm" stretch label="Resolution" options={sizeOptions} value={size} onChange={setSize} />
          </div>
          <div className="stack">
            <span className="control-label">Frame rate</span>
            <Segmented size="sm" stretch label="Frame rate" options={fpsOptions} value={fps} onChange={setFps} />
          </div>
        </div>
      )}
      {format === 'video' && video && !video.offline && (
        <p className="export-note">This browser records video in real time ({seconds(timeline.total)}). Keep this tab in front until it finishes.</p>
      )}
      {job.status === 'error' && <p className="export-error">{job.error}</p>}
    </Dialog>
  );
}
