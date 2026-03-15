import React, { useRef } from 'react';

const PlayerCard = ({ player, coordinates, onClick, onDragStart, onDragEnd }) => {
  const isHidden = !player.isRevealed;
  const photoRef = useRef(null);

  const handleDragStart = (e) => {
    // Clone the photo circle so we have a clean, un-transformed DOM node for the drag snapshot
    if (photoRef.current) {
      const clone = photoRef.current.cloneNode(true);
      
      // Style the clone to be visible but off-screen and independent of parents' flex layouts
      clone.style.position = 'absolute';
      clone.style.top = '-1000px';
      clone.style.left = '-1000px';
      clone.style.transform = 'none'; // Essential: remove scales/transforms that cause the cone 
      
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, 28, 28);
      
      // Clean up the clone from the DOM after the drag starts
      setTimeout(() => {
        if (clone.parentNode) {
          clone.parentNode.removeChild(clone);
        }
      }, 0);
    }
    
    // Bubble up to Pitch component
    onDragStart(e);
  };

  return (
    <div 
      className={`player-node-wrapper ${isHidden ? 'player-info-hidden' : ''}`}
      style={{ top: `${coordinates.top}%`, left: `${coordinates.left}%` }}
      onClick={() => onClick(player)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="player-photo-container" ref={photoRef}>
        {player.photo ? (
          <img src={player.photo} alt={player.name} />
        ) : (
          <span className="player-initials">
            {player.number ? player.number : coordinates.role}
          </span>
        )}
        {player.photo && player.number && (
          <div className="player-number-badge">{player.number}</div>
        )}
      </div>
      {player.name && (
        <div className="player-nameplate">
          {player.name}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
