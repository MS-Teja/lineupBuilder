import { Sparkles } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useProject } from '../../state/context';
import { makeId } from '../../state/project';
import { revealPresets } from '../../state/reveal';
import { Button } from '../../ui/controls';
import Popover from '../../ui/Popover';

export default function RevealMenu() {
  const { project, dispatch, setUi, notify, undo } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const anchor = useRef(null);
  const close = useCallback(() => setIsOpen(false), []);
  const hasPlayers = Object.values(project.roster).some(Boolean);

  const apply = (preset) => {
    dispatch({ type: 'applyReveal', preset: preset.id, idPrefix: makeId('reveal') });
    // No id match → the editor falls back to the final scene of the new reveal.
    setUi({ activeSceneId: null, focus: 'style', selectedSlotId: null });
    notify(`${preset.label} reveal ready — press Space to preview`, { label: 'Undo', onClick: undo });
    close();
  };

  return (
    <>
      <Button ref={anchor} size="sm" icon={Sparkles} onClick={() => setIsOpen((open) => !open)} disabled={!hasPlayers} aria-expanded={isOpen}>
        Reveal
      </Button>
      {isOpen && (
        <Popover anchor={anchor} onClose={close} placement="top-end" label="Reveal presets">
          <div className="reveal-menu">
            <p>Rebuild the timeline as a reveal of the current scene’s lineup.</p>
            {revealPresets.map((preset) => (
              <button key={preset.id} type="button" className="reveal-option" onClick={() => apply(preset)}>
                <strong>{preset.label}</strong>
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}
