import { Download, Monitor, PanelRight, Redo2, Smartphone, Undo2 } from 'lucide-react';
import { useProject } from '../../state/context';
import { Button, IconButton, Segmented } from '../../ui/controls';
import FormationPicker from './FormationPicker';
import './topbar.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl+';

const orientations = [
  { value: 'landscape', label: '16:9', icon: Monitor, title: 'YouTube video (16:9)' },
  { value: 'portrait', label: '9:16', icon: Smartphone, title: 'Shorts (9:16)' },
];

export default function TopBar() {
  const { project, dispatch, undo, redo, canUndo, canRedo, ui, setUi, saveStatus } = useProject();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="7" />
          <path d="M14 1v26M1 9.5h5v9H1M27 9.5h-5v9h5" />
          <circle cx="14" cy="14" r="4" />
        </svg>
        <input
          className="project-name"
          value={project.name}
          onChange={(event) => dispatch({ type: 'rename', name: event.target.value }, { coalesce: 'rename' })}
          onBlur={(event) => { if (!event.target.value.trim()) dispatch({ type: 'rename', name: 'Untitled lineup' }); }}
          aria-label="Project name"
          spellCheck={false}
        />
        <span className={`save-status is-${saveStatus}`} title={saveStatus === 'error' ? 'Browser storage is full — try smaller photos.' : 'Saved in this browser'}>
          {saveStatus === 'saved' ? 'Saved' : 'Not saved'}
        </span>
      </div>

      <div className="topbar-center">
        <IconButton icon={Undo2} label={`Undo (${mod}Z)`} onClick={undo} disabled={!canUndo} />
        <IconButton icon={Redo2} label={`Redo (${isMac ? '⇧⌘Z' : 'Ctrl+Y'})`} onClick={redo} disabled={!canRedo} />
        <span className="topbar-divider" />
        <FormationPicker />
        <Segmented
          label="Output format"
          options={orientations}
          value={project.orientation}
          onChange={(orientation) => dispatch({ type: 'setOrientation', orientation })}
        />
      </div>

      <div className="topbar-right">
        <IconButton
          icon={PanelRight}
          label="Toggle inspector"
          className="inspector-toggle"
          active={ui.isInspectorOpen}
          onClick={() => setUi((current) => ({ isInspectorOpen: !current.isInspectorOpen }))}
        />
        <Button variant="primary" icon={Download} onClick={() => setUi({ isExportOpen: true, isPlaying: false })}>
          Export
        </Button>
      </div>
    </header>
  );
}
