import { ChevronDown } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useProject } from '../../state/context';
import { formationLabel, isShapeModified, SLOT_IDS } from '../../state/project';
import { formationCatalog, parseFormationString } from '../../utils/formations';
import { Button } from '../../ui/controls';
import Popover from '../../ui/Popover';
import MiniFormation from './MiniFormation';
import './topbar.css';

export default function FormationPicker() {
  const { activeScene, dispatch, ui } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const anchor = useRef(null);
  const close = useCallback(() => setIsOpen(false), []);

  const modified = isShapeModified(activeScene);
  const currentRoles = SLOT_IDS.map((slotId) => activeScene.slots[slotId].positionId);
  const parsed = parseFormationString(custom);
  const outfield = custom.split(/[-–\s]+/).filter(Boolean).reduce((total, part) => total + (Number(part) || 0), 0);

  const choose = (formationId) => {
    dispatch({ type: 'setFormation', formationId });
    close();
  };

  const applyCustom = (event) => {
    event.preventDefault();
    if (!parsed) return;
    dispatch({ type: 'setCustomShape', shape: custom });
    setCustom('');
    close();
  };

  return (
    <>
      <button
        ref={anchor}
        type="button"
        className={`formation-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <MiniFormation roles={currentRoles} width={14} />
        <span>{formationLabel(activeScene)}</span>
        {modified && <small>edited</small>}
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <Popover anchor={anchor} onClose={close} placement="bottom-center" label="Formation">
          <div className="formation-menu">
            <div className="formation-grid">
              {formationCatalog.map((formation) => {
                const isActive = !activeScene.customShape && activeScene.formationId === formation.id && !modified;
                return (
                  <button
                    key={formation.id}
                    type="button"
                    className={`formation-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => choose(formation.id)}
                  >
                    <MiniFormation roles={formation.roles} width={40} />
                    <strong>{formation.label}</strong>
                    <small>{formation.detail}</small>
                  </button>
                );
              })}
            </div>

            <form className="formation-custom" onSubmit={applyCustom}>
              <label htmlFor="custom-shape" className="control-label">Custom shape</label>
              <div className="formation-custom-row">
                <input
                  id="custom-shape"
                  className="input"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  placeholder="e.g. 4-1-4-1"
                  spellCheck={false}
                  autoComplete="off"
                />
                <Button type="submit" variant={parsed ? 'primary' : 'secondary'} disabled={!parsed}>Apply</Button>
              </div>
              <small className={custom && !parsed ? 'is-invalid' : ''}>
                {!custom && 'Outfield lines, 1–5 players each, adding up to 10.'}
                {custom && parsed && `Ready: ${parsed.label}`}
                {custom && !parsed && `${outfield}/10 outfield players`}
              </small>
            </form>

            <p className="formation-scope">
              {ui.scope === 'all' ? 'Applies to every scene.' : 'Applies to this scene only.'} Custom positions reset.
            </p>
          </div>
        </Popover>
      )}
    </>
  );
}
