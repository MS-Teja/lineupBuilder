import { ArrowUpRight, Check, Database, ImagePlus, Link as LinkIcon, LoaderCircle, Search, Sparkles, Upload, UserRoundPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createManualPlayer, processImageFile, searchPlayerDirectory } from '../services/playerDirectory';
import { roleMap } from '../utils/formations';

const initialsFor = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'P';

function SearchPortrait({ player }) {
  const [error, setError] = useState(false);

  if (player.photo && !error) {
    return <img src={player.photo} alt="" crossOrigin="anonymous" onError={() => setError(true)} />;
  }

  return <span>{initialsFor(player.name)}</span>;
}

export default function PlayerDirectory({ targetSlot, onAssignPlayer, onClose }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'custom'
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState({ status: 'idle', players: [], source: 'local', message: '' });

  // Custom player creation state
  const role = roleMap[targetSlot.positionId] || { label: 'Player', unit: 'Squad' };
  const [customDraft, setCustomDraft] = useState({
    name: '',
    number: '',
    club: '',
    country: '',
    position: role.label,
    photo: null,
  });
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      const clearTimer = window.setTimeout(() => {
        setSearchState({ status: 'idle', players: [], source: 'local', message: '' });
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchState((current) => ({ ...current, status: 'loading' }));

      try {
        const result = await searchPlayerDirectory(cleanQuery, { signal: controller.signal });
        setSearchState({ status: 'ready', ...result });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSearchState({ status: 'error', players: [], source: 'local', message: 'Could not search the directory.' });
        }
      }
    }, 240);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const selectPlayer = (player) => {
    onAssignPlayer(player);
    setQuery('');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setUploadError(null);

    try {
      const dataUrl = await processImageFile(file);
      setCustomDraft((curr) => ({ ...curr, photo: dataUrl }));
    } catch (err) {
      setUploadError(err.message || 'Could not load the image.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyUrlPhoto = () => {
    if (!urlInput.trim()) return;
    setCustomDraft((curr) => ({ ...curr, photo: urlInput.trim() }));
    setUrlInput('');
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customDraft.name.trim()) return;

    const player = createManualPlayer({
      name: customDraft.name,
      number: customDraft.number,
      club: customDraft.club || 'Custom club',
      country: customDraft.country || 'Custom country',
      position: customDraft.position || role.label,
      photo: customDraft.photo,
    });

    selectPlayer(player);
  };

  const switchToCustomWithName = (nameToPrepop) => {
    setCustomDraft((curr) => ({
      ...curr,
      name: nameToPrepop || curr.name,
    }));
    setActiveTab('custom');
  };

  const providerLabel = (provider) => {
    switch (provider) {
      case 'sportsdb': return 'TSDB';
      case 'wikipedia': return 'Wiki';
      case 'local': return 'Catalog';
      default: return 'Live';
    }
  };

  return (
    <section className="directory-panel" aria-label="Player directory">
      <div className="directory-heading">
        <div>
          <p className="eyebrow">SQUAD DIRECTORY</p>
          <h2>{targetSlot.profile ? 'Replace player' : 'Fill this role'}</h2>
        </div>
        <div className="directory-heading-actions">
          <span className="directory-source" title="Multi-source football search across TheSportsDB, Wikipedia, and offline catalog.">
            <Database size={13} />
            {searchState.source === 'sportsdb' ? 'TSDB' : searchState.source === 'wikipedia' ? 'WIKI' : 'MULTI'}
          </span>
          <button type="button" className="directory-close" onClick={onClose} aria-label="Close player directory">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="directory-tab-switch" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'search'}
          className={`directory-tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={14} />
          <span>Search Sources</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'custom'}
          className={`directory-tab-btn ${activeTab === 'custom' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          <Upload size={14} />
          <span>Custom & Photo</span>
        </button>
      </div>

      <div className="target-role">
        <span>{targetSlot.positionId}</span>
        <div>
          <strong>{role.label}</strong>
          <small>{targetSlot.profile ? `${targetSlot.profile.name} currently in XI` : 'Ready for assignment'}</small>
        </div>
      </div>

      {activeTab === 'search' && (
        <>
          <label className="directory-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, club, or country…"
              aria-label="Search the player directory"
              autoFocus
            />
            {searchState.status === 'loading' && <LoaderCircle size={16} className="is-spinning" aria-label="Searching" />}
          </label>

          {!query && (
            <div className="directory-empty">
              <p>Search modern or historic footballers. Transparent cutouts and official photos load automatically.</p>
              <div className="quick-searches">
                {['Yamal', 'Cole Palmer', 'Saka', 'Zidane', 'Bonmatí', 'Gyökeres'].map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => setQuery(suggestion)}>{suggestion}</button>
                ))}
              </div>
              <button
                type="button"
                className="switch-to-custom-btn"
                onClick={() => switchToCustomWithName('')}
              >
                <ImagePlus size={15} />
                <span>Upload custom photo / create manual player</span>
              </button>
            </div>
          )}

          {query && searchState.status !== 'loading' && (
            <div className="directory-results" aria-live="polite">
              {searchState.players.map((player) => (
                <button key={player.id} type="button" className="directory-result" onClick={() => selectPlayer(player)}>
                  <span className="directory-portrait"><SearchPortrait player={player} /></span>
                  <span className="directory-result-copy">
                    <strong>{player.name}</strong>
                    <span>{player.club} <i /> {player.country}</span>
                  </span>
                  <span className="directory-provider-pill" title={`Source: ${player.provider}`}>
                    {providerLabel(player.provider)}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}

              <div className="directory-manual-actions">
                <button
                  type="button"
                  className="manual-player"
                  onClick={() => switchToCustomWithName(query.trim())}
                >
                  <UserRoundPlus size={16} />
                  <span>Create “{query.trim()}” with custom photo</span>
                </button>
              </div>

              {searchState.message && <p className="directory-status">{searchState.message}</p>}
            </div>
          )}
        </>
      )}

      {activeTab === 'custom' && (
        <form className="custom-player-form" onSubmit={handleCustomSubmit}>
          <div className="photo-upload-container">
            <div className="photo-preview-circle">
              {customDraft.photo ? (
                <img src={customDraft.photo} alt="Preview" />
              ) : (
                <span>{initialsFor(customDraft.name || 'Custom')}</span>
              )}
            </div>

            <div className="photo-controls">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                className="hidden-file-input"
                id="manual-photo-upload"
              />
              <label htmlFor="manual-photo-upload" className="upload-file-button">
                {isProcessingPhoto ? <LoaderCircle size={14} className="is-spinning" /> : <Upload size={14} />}
                <span>{customDraft.photo ? 'Change photo' : 'Upload photo file'}</span>
              </label>

              {customDraft.photo && (
                <button
                  type="button"
                  className="remove-photo-button"
                  onClick={() => setCustomDraft((curr) => ({ ...curr, photo: null }))}
                >
                  <X size={13} /> Remove
                </button>
              )}
            </div>
          </div>

          <div className="url-photo-input-group">
            <div className="url-input-wrap">
              <LinkIcon size={14} />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste image URL…"
              />
            </div>
            <button
              type="button"
              className="apply-url-btn"
              onClick={applyUrlPhoto}
              disabled={!urlInput.trim()}
            >
              Apply
            </button>
          </div>

          {uploadError && <p className="upload-error-msg">{uploadError}</p>}

          <div className="custom-fields-grid">
            <label>
              <span>Player Name *</span>
              <input
                value={customDraft.name}
                onChange={(e) => setCustomDraft((curr) => ({ ...curr, name: e.target.value }))}
                placeholder="e.g. Thierry Henry"
                required
                autoFocus
              />
            </label>

            <label>
              <span>Shirt Number</span>
              <input
                type="number"
                min="0"
                max="99"
                value={customDraft.number}
                onChange={(e) => setCustomDraft((curr) => ({ ...curr, number: e.target.value }))}
                placeholder="e.g. 14"
              />
            </label>

            <label>
              <span>Position / Role</span>
              <input
                value={customDraft.position}
                onChange={(e) => setCustomDraft((curr) => ({ ...curr, position: e.target.value }))}
                placeholder="e.g. Striker"
              />
            </label>

            <label>
              <span>Club</span>
              <input
                value={customDraft.club}
                onChange={(e) => setCustomDraft((curr) => ({ ...curr, club: e.target.value }))}
                placeholder="e.g. Arsenal"
              />
            </label>

            <label className="full-width">
              <span>Country / Nationality</span>
              <input
                value={customDraft.country}
                onChange={(e) => setCustomDraft((curr) => ({ ...curr, country: e.target.value }))}
                placeholder="e.g. France"
              />
            </label>
          </div>

          <button type="submit" className="submit-custom-player-btn" disabled={!customDraft.name.trim()}>
            <Check size={16} />
            <span>Add Player to XI</span>
          </button>
        </form>
      )}
    </section>
  );
}
