import { LoaderCircle, Search, UserRoundPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { searchPlayerDirectory } from '../../services/playerDirectory';
import { accentFor } from '../../state/project';
import { roleMap } from '../../utils/formations';
import Avatar from '../../ui/Avatar';
import CustomPlayerForm from './CustomPlayerForm';
import './players.css';

const SUGGESTIONS = ['Yamal', 'Cole Palmer', 'Saka', 'Zidane', 'Bonmatí', 'Gyökeres'];

const idleState = { status: 'idle', players: [], message: '' };

/** Popover content: search the directory or create a custom player for a slot. */
export default function PlayerSearch({ slotId, positionId, current, onAssign }) {
  const role = roleMap[positionId] ?? { label: 'Player' };
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(idleState);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const term = query.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!term) {
        setResult(idleState);
        return;
      }
      setResult((previous) => ({ ...previous, status: 'loading' }));
      try {
        const found = await searchPlayerDirectory(term, { signal: controller.signal });
        setResult({ status: 'ready', players: found.players, message: found.message });
      } catch (error) {
        if (error.name !== 'AbortError') setResult({ status: 'error', players: [], message: 'Search is unavailable right now.' });
      }
    }, term ? 240 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  if (isCreating) {
    return (
      <CustomPlayerForm
        initialName={query.trim()}
        roleLabel={role.label}
        onBack={() => setIsCreating(false)}
        onCreate={(player) => onAssign(slotId, player)}
      />
    );
  }

  return (
    <div className="player-search">
      <header className="popover-header">
        <span className="role-chip">{positionId}</span>
        <h3>{current ? `Replace ${current.name}` : `Add ${role.label.toLowerCase()}`}</h3>
      </header>

      <label className="search-field">
        <Search size={16} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players, clubs, countries"
          aria-label="Search players"
          autoFocus
        />
        {result.status === 'loading' && <LoaderCircle size={15} className="spin" aria-label="Searching" />}
      </label>

      <div className="search-results" aria-live="polite">
        {!query.trim() && (
          <div className="search-suggestions">
            <span>Try</span>
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQuery(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}

        {result.players.map((player) => (
          <button key={player.id} type="button" className="search-result" onClick={() => onAssign(slotId, player)}>
            <Avatar player={player} size={36} accent={accentFor(player.name)} />
            <span className="search-result-copy">
              <strong>{player.name}</strong>
              <small>{[player.club, player.country].filter(Boolean).join(' · ') || player.position}</small>
            </span>
          </button>
        ))}

        {result.status === 'ready' && !result.players.length && <p className="search-status">{result.message}</p>}
        {result.status === 'error' && <p className="search-status">{result.message}</p>}
      </div>

      <footer className="popover-footer">
        <button type="button" className="create-custom" onClick={() => setIsCreating(true)}>
          <UserRoundPlus size={16} />
          <span>{query.trim() ? `Create “${query.trim()}” as a custom player` : 'Create a custom player'}</span>
        </button>
      </footer>
    </div>
  );
}
