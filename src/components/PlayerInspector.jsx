import { Camera, Check, Eye, EyeOff, Link as LinkIcon, LoaderCircle, PencilLine, Search, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { processImageFile, processImageUrl } from '../services/playerDirectory';
import { roleMap } from '../utils/formations';

const initialsFor = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'P';

function InspectorPortrait({ player }) {
  const [hasImageError, setHasImageError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  if (player?.photo && !hasImageError) {
    const isData = player.photo.startsWith('data:') || player.photo.startsWith('blob:');
    const src = triedFallback && !isData
      ? `https://wsrv.nl/?url=${encodeURIComponent(player.photo)}&output=webp`
      : player.photo;

    return (
      <img
        src={src}
        alt=""
        onError={() => {
          if (!triedFallback && !isData) {
            setTriedFallback(true);
          } else {
            setHasImageError(true);
          }
        }}
      />
    );
  }

  return <span>{initialsFor(player?.name)}</span>;
}

export default function PlayerInspector({ slot, onToggleVisibility, onRemovePlayer, onUpdatePlayer, onOpenDirectory, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    name: slot.profile?.name ?? '',
    number: slot.profile?.number ?? '',
    club: slot.profile?.club ?? '',
    country: slot.profile?.country ?? '',
    position: slot.profile?.position ?? '',
    photo: slot.profile?.photo ?? null,
  }));
  const [urlDraft, setUrlDraft] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const fileInputRef = useRef(null);

  const [showQuickUrl, setShowQuickUrl] = useState(false);

  const role = roleMap[slot.positionId] || { label: 'Player', unit: 'Squad' };
  const player = slot.profile;

  const changeDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setPhotoError(null);

    try {
      const dataUrl = await processImageFile(file);
      changeDraft('photo', dataUrl);
      if (player) {
        onUpdatePlayer({ ...player, ...draft, photo: dataUrl });
      }
    } catch (err) {
      setPhotoError(err.message || 'Could not load photo');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = async () => {
    if (!urlDraft.trim()) return;
    const raw = urlDraft.trim();
    setIsProcessingPhoto(true);
    setPhotoError(null);

    try {
      const dataUrl = await processImageUrl(raw);
      changeDraft('photo', dataUrl);
      if (player) {
        onUpdatePlayer({ ...player, ...draft, photo: dataUrl });
      }
      setUrlDraft('');
      setShowQuickUrl(false);
    } catch (err) {
      setPhotoError(err.message || 'Could not load photo from URL');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    changeDraft('photo', null);
    if (player) {
      onUpdatePlayer({ ...player, ...draft, photo: null });
    }
  };

  const saveDraft = async (event) => {
    event.preventDefault();

    let photoToSave = draft.photo;
    if (!photoToSave && urlDraft.trim()) {
      setIsProcessingPhoto(true);
      setPhotoError(null);
      try {
        photoToSave = await processImageUrl(urlDraft.trim());
      } catch (err) {
        setPhotoError(err.message || 'Could not load photo from URL');
        setIsProcessingPhoto(false);
        return;
      }
      setIsProcessingPhoto(false);
    }

    onUpdatePlayer({
      ...player,
      ...draft,
      photo: photoToSave,
      number: draft.number === '' || draft.number === null ? null : Number(draft.number),
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
            <div className="inspector-portrait-wrap">
              <div className="inspector-portrait">
                <InspectorPortrait key={player.id ?? `${player.name}-${player.photo ?? ''}`} player={isEditing ? draft : player} />
              </div>
              <div className="inspector-portrait-actions">
                <label
                  htmlFor={`inspector-photo-input-${slot.id}`}
                  className="inspector-quick-photo-btn"
                  title="Upload photo file"
                >
                  {isProcessingPhoto ? <LoaderCircle size={12} className="is-spinning" /> : <Camera size={12} />}
                </label>
                <button
                  type="button"
                  className={`inspector-quick-photo-btn ${showQuickUrl ? 'is-active' : ''}`}
                  onClick={() => setShowQuickUrl((v) => !v)}
                  title="Paste photo URL"
                  aria-label="Paste photo URL"
                >
                  <LinkIcon size={12} />
                </button>
              </div>
              <input
                type="file"
                id={`inspector-photo-input-${slot.id}`}
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                className="hidden-file-input"
              />
            </div>
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

          {showQuickUrl && !isEditing && (
            <div className="quick-url-banner">
              <div className="mini-url-row">
                <LinkIcon size={12} />
                <input
                  type="url"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  placeholder="Paste direct image URL…"
                  autoFocus
                />
                <button
                  type="button"
                  className="mini-apply-btn"
                  onClick={handleApplyUrl}
                  disabled={!urlDraft.trim() || isProcessingPhoto}
                >
                  {isProcessingPhoto ? <LoaderCircle size={11} className="is-spinning" /> : 'Apply'}
                </button>
              </div>
              {photoError && <span className="photo-error-text">{photoError}</span>}
            </div>
          )}

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
              <div className="inspector-photo-edit-section">
                <span className="field-label">Photo</span>
                <div className="photo-edit-actions">
                  <label htmlFor={`inspector-form-upload-${slot.id}`} className="mini-upload-btn">
                    {isProcessingPhoto ? <LoaderCircle size={13} className="is-spinning" /> : <Upload size={13} />}
                    <span>{draft.photo ? 'Replace photo' : 'Upload photo'}</span>
                  </label>
                  <input
                    type="file"
                    id={`inspector-form-upload-${slot.id}`}
                    onChange={handlePhotoUpload}
                    accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                    className="hidden-file-input"
                  />
                  {draft.photo && (
                    <button type="button" className="mini-remove-btn" onClick={handleRemovePhoto}>
                      <X size={13} /> Remove
                    </button>
                  )}
                </div>

                <div className="mini-url-row">
                  <LinkIcon size={12} />
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyUrl();
                      }
                    }}
                    placeholder="Or paste photo URL…"
                  />
                  <button
                    type="button"
                    className="mini-apply-btn"
                    onClick={handleApplyUrl}
                    disabled={!urlDraft.trim() || isProcessingPhoto}
                  >
                    {isProcessingPhoto ? <LoaderCircle size={11} className="is-spinning" /> : 'Apply'}
                  </button>
                </div>
                {photoError && <span className="photo-error-text">{photoError}</span>}
              </div>

              <label>
                <span>Name</span>
                <input value={draft.name} onChange={(event) => changeDraft('name', event.target.value)} required />
              </label>
              <label>
                <span>Shirt no.</span>
                <input type="number" min="0" max="99" value={draft.number} onChange={(event) => changeDraft('number', event.target.value)} />
              </label>
              <label>
                <span>Position</span>
                <input value={draft.position} onChange={(event) => changeDraft('position', event.target.value)} />
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
