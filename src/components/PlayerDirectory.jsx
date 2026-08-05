import { ArrowUpRight, Database, LoaderCircle, Search, UserRoundPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createManualPlayer, searchPlayerDirectory } from '../services/playerDirectory';
import { roleMap } from '../utils/formations';

const initialsFor = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

function SearchPortrait({ player }) {
  const [error, setError] = useState(false);

  if (player.photo && !error) {
    return <img src={player.photo} alt="" crossOrigin="anonymous" onError={() => setError(true)} />;
  }

  return <span>{initialsFor(player.name)}</span>;
}

export default function PlayerDirectory({ targetSlot, onAssignPlayer, onClose }) {
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState({ status: 'idle', players: [], source: 'local', message: '' });
  const role = roleMap[targetSlot.positionId];

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
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const selectPlayer = (player) => {
    onAssignPlayer(player);
    setQuery('');
  };

  return (
    <section className="directory-panel" aria-label="Player directory">
      <div className="directory-heading">
        <div>
          <p className="eyebrow">SQUAD DIRECTORY</p>
          <h2>{targetSlot.profile ? 'Replace player' : 'Fill this role'}</h2>
        </div>
        <div className="directory-heading-actions">
          <span className="directory-source" title="Search uses a production proxy when configured, then a public football source.">
            <Database size={13} />
            {searchState.source === 'proxy' ? 'LIVE' : 'FREE'}
          </span>
          <button type="button" className="directory-close" onClick={onClose} aria-label="Close player directory">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="target-role">
        <span>{targetSlot.positionId}</span>
        <div>
          <strong>{role.label}</strong>
          <small>{targetSlot.profile ? `${targetSlot.profile.name} is selected` : 'Open place in the XI'}</small>
        </div>
      </div>

      <label className="directory-search">
        <Search size={17} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a player"
          aria-label="Search the player directory"
        />
        {searchState.status === 'loading' && <LoaderCircle size={16} className="is-spinning" aria-label="Searching" />}
      </label>

      {!query && (
        <div className="directory-empty">
          <p>Search by player, club, or country. Your selection lands directly in this role.</p>
          <div className="quick-searches">
            {['Saka', 'Bonmatí', 'Haaland'].map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQuery(suggestion)}>{suggestion}</button>
            ))}
          </div>
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
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}

          {searchState.status !== 'error' && (
            <button type="button" className="manual-player" onClick={() => selectPlayer(createManualPlayer(query))}>
              <UserRoundPlus size={16} />
              <span>Add “{query.trim()}” manually</span>
            </button>
          )}

          {searchState.message && <p className="directory-status">{searchState.message}</p>}
        </div>
      )}
    </section>
  );
}
