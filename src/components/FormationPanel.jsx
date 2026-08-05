import { LayoutPanelTop, Monitor, Plus, Smartphone, X } from 'lucide-react';
import { formationCatalog } from '../utils/formations';

export default function FormationPanel({
  formationId,
  orientation,
  isFull,
  onFormationChange,
  onOrientationChange,
  onAddPlayer,
  onClose,
}) {
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
              className={`formation-option ${formation.id === formationId ? 'is-active' : ''}`}
              onClick={() => onFormationChange(formation.id)}
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
        </div>
      </section>

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
