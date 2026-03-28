import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import { masterPositions } from '../utils/formations';

const Pitch = ({ pitchRef, players, onPlayerClick, onPlayerPositionChange, orientation, aspectRatio }) => {
  const isHorizontal = orientation === 'horizontal';
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, positionId) => {
    e.preventDefault();
    const playerId = parseInt(e.dataTransfer.getData('playerId'), 10);
    if (!isNaN(playerId)) {
      onPlayerPositionChange(playerId, positionId);
    }
  };

  return (
    <div className="pitch-wrapper" ref={pitchRef} style={{ aspectRatio: aspectRatio }}>
      <div className={`pitch ${isHorizontal ? 'horizontal' : 'vertical'}`}>
        {/* Pitch Markings */}
        <div className="pitch-line center-line"></div>
        <div className="pitch-circle center-circle"></div>
        <div className="center-spot"></div>
        
        <div className="pitch-border penalty-area-top"></div>
        <div className="pitch-border penalty-area-bottom"></div>
        
        <div className="pitch-border six-yard-top"></div>
        <div className="pitch-border six-yard-bottom"></div>
        
        <div className="penalty-spot-top"></div>
        <div className="penalty-spot-bottom"></div>

        {/* Players */}
        {players.map((player) => {
          const rawCoords = masterPositions[player.positionId] || { top: 50, left: 50, role: '' };
          
          const coordinates = isHorizontal 
            ? { top: 100 - rawCoords.left, left: rawCoords.top, role: rawCoords.role }
            : rawCoords;

          return (
            <PlayerCard 
              key={player.id} 
              player={player} 
              coordinates={coordinates} 
              onClick={onPlayerClick}
              onDragStart={(e) => {
                e.dataTransfer.setData('playerId', player.id);
                // Wrap state update in requestAnimationFrame to avoid interrupting the native drag start
                requestAnimationFrame(() => {
                  setIsDragging(true);
                });
              }}
              onDragEnd={() => setIsDragging(false)}
            />
          );
        })}

        {/* Drop Zones (Only visible when dragging) */}
        {isDragging && Object.entries(masterPositions).map(([posId, rawCoords]) => {
          const coordinates = isHorizontal 
            ? { top: 100 - rawCoords.left, left: rawCoords.top }
            : rawCoords;
            
          return (
            <div 
              key={`dropzone-${posId}`}
              className="drop-zone"
              style={{ top: `${coordinates.top}%`, left: `${coordinates.left}%` }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, posId)}
            >
              {posId}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Pitch;
