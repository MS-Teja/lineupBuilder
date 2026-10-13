import { Plus } from 'lucide-react';
import { useState } from 'react';

const labelFor = (name) => name.split(' ').filter(Boolean).at(-1) || name;

function Portrait({ player }) {
  const [hasImageError, setHasImageError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  if (player.photo && !hasImageError) {
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

  return null;
}

export default function PlayerCard({
  slot,
  coordinates,
  role,
  selected,
  motion,
  onSelect,
  onDragStart,
  onDragEnd,
}) {
  const isEmpty = !slot.profile;
  const isConcealed = !isEmpty && !slot.isRevealed;
  const style = {
    '--x': `${coordinates.x}%`,
    '--y': `${coordinates.y}%`,
    '--player-accent': slot.accent,
  };

  if (isEmpty) {
    return (
      <div className="player-pin slot-pin" style={style}>
        <button
          type="button"
          className={`slot-marker ${selected ? 'is-selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelect(slot.id); }}
          aria-label={`Add a player to ${role.label}`}
        >
          <span className="slot-add"><Plus size={18} strokeWidth={2.25} /></span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`player-pin ${selected ? 'is-selected' : ''} ${slot.isRemoving ? 'is-removing' : ''} ${slot.motionKey ? 'is-fresh' : ''} entry-${motion.playerEntry} exit-${motion.playerExit}`}
      style={style}
    >
      <button
        type="button"
        className={`player-token ${isConcealed ? 'is-concealed' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelect(slot.id); }}
        onDragStart={(event) => onDragStart(event, slot.id)}
        onDragEnd={onDragEnd}
        draggable={!slot.isRemoving}
        aria-pressed={selected}
        aria-label={`${slot.profile.name}, ${role.label}`}
      >
        <span className={`player-circle ${slot.profile.photo && !isConcealed ? 'has-photo' : 'is-number-only'}`}>
          {!isConcealed && slot.profile.photo && (
            <Portrait key={slot.profile.id ?? `${slot.profile.name}-${slot.profile.photo ?? ''}`} player={slot.profile} />
          )}
          {(!isConcealed && !slot.profile.photo) && (
            <span className="player-number">{slot.profile.number ?? '—'}</span>
          )}
        </span>
        <span className="player-details">
          <span className="player-label">{labelFor(slot.profile.name)}</span>
        </span>
      </button>
    </div>
  );
}
