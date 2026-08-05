import { Check, Eye, EyeOff, PencilLine, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { roleMap } from '../utils/formations';

const initialsFor = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

function InspectorPortrait({ player }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (player.photo && !hasImageError) {
    return <img src={player.photo} alt="" crossOrigin="anonymous" onError={() => setHasImageError(true)} />;
  }

  return <span>{initialsFor(player.name)}</span>;
}

export default function PlayerInspector({ slot, onToggleVisibility, onRemovePlayer, onUpdatePlayer, onOpenDirectory, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    name: slot.profile?.name ?? '',
    number: slot.profile?.number ?? '',
    club: slot.profile?.club ?? '',
    country: slot.profile?.country ?? '',
  }));
  const role = roleMap[slot.positionId];
  const player = slot.profile;

  const changeDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const saveDraft = (event) => {
    event.preventDefault();
    onUpdatePlayer({
      ...player,
      ...draft,
      number: draft.number === '' ? null : Number(draft.number),
    });
    setIsEditing(false);
  };

  return (
    <section className={`inspector-panel ${player ? '' : 'is-empty'}`} aria-label="Selected player">
      <div className="inspector-heading">
        <div>
          <p className="eyebrow">SELECTED ROLE</p>
          <h2>{slot.positionId}</h2>
        </div>
        <div className="inspector-heading-actions">
          <span>{role.unit}</span>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close player controls">
            <X size={16} />
          </button>
        </div>
      </div>

      {!player ? (
        <div className="vacant-inspector">
          <div className="vacant-token">{slot.positionId}</div>
          <div>
            <strong>{role.label}</strong>
            <p>This lane is ready for a player.</p>
            <button type="button" className="directory-trigger" onClick={onOpenDirectory}>
              <Search size={14} />
              Add player
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="inspector-player">
            <div className="inspector-portrait"><InspectorPortrait key={player.id ?? `${player.name}-${player.photo ?? ''}`} player={player} /></div>
            <div>
              <h3>{player.name}</h3>
              <p>{player.position || role.label}</p>
              <div className="player-facts">
                <span>{player.club}</span>
                <i />
                <span>{player.country}</span>
              </div>
            </div>
            <strong className="inspector-number">{player.number ?? '—'}</strong>
          </div>

          <div className="inspector-actions">
            <button type="button" className={slot.isRevealed ? 'is-on' : ''} onClick={() => onToggleVisibility(slot.id)}>
              {slot.isRevealed ? <Eye size={16} /> : <EyeOff size={16} />}
              {slot.isRevealed ? 'On screen' : 'Hidden'}
            </button>
            <button type="button" onClick={() => setIsEditing((current) => !current)}>
              <PencilLine size={15} />
              {isEditing ? 'Close edit' : 'Edit details'}
            </button>
            <button type="button" onClick={onOpenDirectory}>
              <Search size={15} />
              Change player
            </button>
          </div>

          {isEditing && (
            <form className="player-edit-form" onSubmit={saveDraft}>
              <label>
                <span>Name</span>
                <input value={draft.name} onChange={(event) => changeDraft('name', event.target.value)} required />
              </label>
              <label>
                <span>Shirt no.</span>
                <input type="number" min="0" max="99" value={draft.number} onChange={(event) => changeDraft('number', event.target.value)} />
              </label>
              <label>
                <span>Club</span>
                <input value={draft.club} onChange={(event) => changeDraft('club', event.target.value)} />
              </label>
              <label>
                <span>Country</span>
                <input value={draft.country} onChange={(event) => changeDraft('country', event.target.value)} />
              </label>
              <button type="submit" className="save-detail-button"><Check size={15} /> Save changes</button>
              <button type="button" className="cancel-detail-button" onClick={() => setIsEditing(false)}><X size={15} /> Cancel</button>
            </form>
          )}

          <button type="button" className="remove-player-button" onClick={() => onRemovePlayer(slot.id)}>
            <Trash2 size={15} />
            Remove from XI
          </button>
        </>
      )}
    </section>
  );
}
