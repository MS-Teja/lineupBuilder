import { ChevronDown, ChevronUp, LayoutPanelTop, Minus, Monitor, Pen, Plus, Smartphone, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { allRoleOptions, formationCatalog, parseFormationString, roleMap } from '../utils/formations';

const MIN_PER_LINE = 1;
const MAX_PER_LINE = 5;
const OUTFIELD_TOTAL = 10;

function LineStepper({ label, value, onChange, disabled }) {
  return (
    <div className="line-stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= MIN_PER_LINE}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={12} strokeWidth={2.5} />
        </button>
        <span className="stepper-value">{value}</span>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(value + 1)}
          disabled={disabled || value >= MAX_PER_LINE}
          aria-label={`Increase ${label}`}
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

const lineLabels = ['Defence', 'Lower mid', 'Midfield', 'Upper mid', 'Attack', 'Forwards'];

export default function FormationPanel({
  formationId,
  orientation,
  isFull,
  isCustomShape,
  customFormationInput,
  slots,
  onFormationChange,
  onCustomFormation,
  onRoleOverride,
  onOrientationChange,
  onAddPlayer,
  onClose,
}) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [textInput, setTextInput] = useState(customFormationInput || '4-3-3');
  const [lines, setLines] = useState([4, 3, 3]);
  const [showRoleOverrides, setShowRoleOverrides] = useState(false);

  // Sync text input → lines when typing
  const parsed = useMemo(() => parseFormationString(textInput), [textInput]);
  const isValid = parsed !== null;
  const outfieldSum = lines.reduce((sum, n) => sum + n, 0);

  // Sync lines from text input when it produces a valid parse
  useEffect(() => {
    if (parsed) {
      const nums = textInput.replace(/\s+/g, '').replace(/–/g, '-').split('-').map(Number);
      setLines(nums);
    }
  }, [textInput, parsed]);

  // When user opens custom editor, seed from current formation if it's a preset
  useEffect(() => {
    if (isCustomOpen && !isCustomShape && formationId) {
      const preset = formationCatalog.find((f) => f.id === formationId);
      if (preset) {
        setTextInput(preset.id);
      }
    }
  }, [isCustomOpen]);

  const updateLine = (index, newValue) => {
    const next = [...lines];
    next[index] = Math.max(MIN_PER_LINE, Math.min(MAX_PER_LINE, newValue));
    setLines(next);
    setTextInput(next.join('-'));
  };

  const addLine = () => {
    if (lines.length >= 5) return;
    const next = [...lines, 1];
    setLines(next);
    setTextInput(next.join('-'));
  };

  const removeLine = () => {
    if (lines.length <= 2) return;
    const next = lines.slice(0, -1);
    setLines(next);
    setTextInput(next.join('-'));
  };

  const applyCustom = () => {
    if (!isValid) return;
    onCustomFormation(textInput);
  };

  return (
    <section className="tool-panel formation-tool" aria-label="Tactical controls">
      <div className="tool-panel-heading">
        <div>
          <p className="eyebrow">BOARD</p>
          <h2>Shape & frame</h2>
        </div>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close board controls">
          <X size={16} />
        </button>
      </div>

      <section className="tool-section">
        <div className="section-kicker">
          <LayoutPanelTop size={14} />
          <span>Formation</span>
        </div>
        <div className="formation-list">
          {formationCatalog.map((formation, index) => (
            <button
              key={formation.id}
              type="button"
              className={`formation-option ${formation.id === formationId && !isCustomShape ? 'is-active' : ''}`}
              onClick={() => { onFormationChange(formation.id); setIsCustomOpen(false); }}
            >
              <span className="formation-index">0{index + 1}</span>
              <span className="formation-label">
                <strong>{formation.label}</strong>
                <small>{formation.eyebrow}</small>
              </span>
              <span className="formation-diagram" aria-hidden="true">
                {formation.label.split('–').map((line, lineIndex) => (
                  <i key={`${formation.id}-${lineIndex}`} style={{ '--players': Number(line) }} />
                ))}
              </span>
            </button>
          ))}

          {/* Custom formation card */}
          <button
            type="button"
            className={`formation-option formation-option-custom ${isCustomShape ? 'is-active' : ''} ${isCustomOpen ? 'is-expanded' : ''}`}
            onClick={() => setIsCustomOpen((open) => !open)}
          >
            <span className="formation-index"><Pen size={11} /></span>
            <span className="formation-label">
              <strong>Custom</strong>
              <small>Define your own shape</small>
            </span>
            <span className="formation-expand-icon" aria-hidden="true">
              {isCustomOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>
        </div>

        {/* Custom formation editor (collapsed/expanded) */}
        {isCustomOpen && (
          <div className="custom-formation-editor">
            <div className="custom-input-row">
              <label className="custom-text-input">
                <input
                  type="text"
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  placeholder="e.g. 4-1-4-1"
                  spellCheck={false}
                  aria-label="Formation string"
                />
                <span className={`custom-input-status ${isValid ? 'is-valid' : outfieldSum === OUTFIELD_TOTAL ? '' : 'is-invalid'}`}>
                  {isValid ? '✓' : `${outfieldSum}/10`}
                </span>
              </label>
            </div>

            <div className="custom-steppers">
              {lines.map((count, index) => (
                <LineStepper
                  key={`line-${index}`}
                  label={lineLabels[index] ?? `Line ${index + 1}`}
                  value={count}
                  onChange={(next) => updateLine(index, next)}
                  disabled={false}
                />
              ))}

              <div className="stepper-line-actions">
                <button
                  type="button"
                  className="stepper-action"
                  onClick={addLine}
                  disabled={lines.length >= 5}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Add line</span>
                </button>
                <button
                  type="button"
                  className="stepper-action"
                  onClick={removeLine}
                  disabled={lines.length <= 2}
                >
                  <Minus size={12} strokeWidth={2.5} />
                  <span>Remove line</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="custom-apply-btn"
              onClick={applyCustom}
              disabled={!isValid}
            >
              Apply {isValid ? parsed.label : 'formation'}
            </button>
          </div>
        )}
      </section>

      {/* Per-slot role overrides */}
      {isCustomShape && (
        <section className="tool-section role-override-section">
          <button
            type="button"
            className="section-kicker section-kicker-toggle"
            onClick={() => setShowRoleOverrides((open) => !open)}
          >
            <SlidersHorizontal size={14} />
            <span>Role overrides</span>
            {showRoleOverrides ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showRoleOverrides && (
            <div className="role-override-list">
              {slots.map((slot, index) => {
                const currentRole = roleMap[slot.positionId];
                const playerLabel = slot.profile?.name
                  ? slot.profile.name.split(' ').at(-1)
                  : `Slot ${index + 1}`;

                return (
                  <div key={slot.id} className="role-override-row">
                    <span className="role-override-player">{playerLabel}</span>
                    <select
                      className="role-override-select"
                      value={slot.positionId}
                      onChange={(event) => onRoleOverride(slot.id, event.target.value)}
                      aria-label={`Role for ${playerLabel}`}
                    >
                      {allRoleOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.id} — {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="tool-section output-section">
        <div className="section-kicker">
          <Monitor size={14} />
          <span>Output</span>
        </div>
        <div className="format-toggle" role="group" aria-label="Canvas format">
          <button
            type="button"
            className={orientation === 'portrait' ? 'is-active' : ''}
            onClick={() => onOrientationChange('portrait')}
          >
            <Smartphone size={15} />
            <span>9:16</span>
            <small>Shorts</small>
          </button>
          <button
            type="button"
            className={orientation === 'landscape' ? 'is-active' : ''}
            onClick={() => onOrientationChange('landscape')}
          >
            <Monitor size={16} />
            <span>16:9</span>
            <small>Video</small>
          </button>
        </div>
      </section>

      <button type="button" className="add-player-button" onClick={onAddPlayer}>
        <Plus size={18} strokeWidth={2.5} />
        <span>{isFull ? 'Replace a player' : 'Add player'}</span>
      </button>
    </section>
  );
}
