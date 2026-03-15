import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import Sidebar from './components/Sidebar';
import Pitch from './components/Pitch';
import PlayerEditModal from './components/PlayerEditModal';
import { formations, defaultPlayers } from './utils/formations';
import './App.css';

function App() {
  const [formation, setFormation] = useState('4-3-3');
  const [players, setPlayers] = useState(defaultPlayers);
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  // Layout Controls
  const [pitchOrientation, setPitchOrientation] = useState('vertical');
  const [pitchAspectRatio, setPitchAspectRatio] = useState(0.7); // 1 = square, <1 = tall, >1 = wide

  const pitchRef = useRef(null);

  const handlePlayerClick = (player) => {
    setEditingPlayer(player);
  };

  const handleSavePlayer = (updatedPlayer) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    setEditingPlayer(null);
  };

  // When a preset formation is selected, update all players' positions
  React.useEffect(() => {
    if (formation !== 'Custom' && formations[formation]) {
      const presetPositions = formations[formation];
      setPlayers(prev => prev.map((p, index) => ({
        ...p,
        positionId: presetPositions[index] || p.positionId
      })));
    }
  }, [formation]);

  const handlePlayerPositionChange = (playerId, newPositionId) => {
    setPlayers(prev => {
      const newPlayers = [...prev];
      const draggedPlayerIndex = newPlayers.findIndex(p => p.id === playerId);
      if (draggedPlayerIndex === -1) return prev;
      
      const existingPlayerIndex = newPlayers.findIndex(p => p.positionId === newPositionId);
      
      if (existingPlayerIndex !== -1 && existingPlayerIndex !== draggedPlayerIndex) {
        // Swap positions
        const oldPosId = newPlayers[draggedPlayerIndex].positionId;
        newPlayers[existingPlayerIndex].positionId = oldPosId;
      }
      
      newPlayers[draggedPlayerIndex].positionId = newPositionId;
      return newPlayers;
    });
    setFormation('Custom');
  };

  const togglePlayerVisibility = (id) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, isRevealed: !p.isRevealed } : p));
  };

  const hideAllPlayers = () => {
    setPlayers(prev => prev.map(p => ({ ...p, isRevealed: false })));
  };

  const revealAllPlayers = () => {
    setPlayers(prev => prev.map(p => ({ ...p, isRevealed: true })));
  };

  const handleExport = async () => {
    if (!pitchRef.current) return;
    try {
      const element = pitchRef.current;
      // Get the bounding box of the actual element to prevent capturing excessive whitespace
      // or dealing with scroll offsets improperly.
      const rect = element.getBoundingClientRect();

      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 3, // Increase scale factor for sharper images
        useCORS: true,
        allowTaint: true,
        width: rect.width,
        height: rect.height,
        // Optional: you can manually adjust x/y if there are offset issues, though
        // leaving the window size alone usually works best for non-scrolling elements.
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `lineup-${formation}.png`;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const formationData = formations[formation] || formations['4-3-3'];

  return (
    <div className="app-container">
      <Sidebar 
        formation={formation}
        setFormation={setFormation}
        players={players}
        activePlayerId={editingPlayer?.id}
        onPlayerSelect={handlePlayerClick}
        onExport={handleExport}
        togglePlayerVisibility={togglePlayerVisibility}
        hideAllPlayers={hideAllPlayers}
        revealAllPlayers={revealAllPlayers}
        pitchOrientation={pitchOrientation}
        setPitchOrientation={setPitchOrientation}
        pitchAspectRatio={pitchAspectRatio}
        setPitchAspectRatio={setPitchAspectRatio}
      />
      <main className="main-content">
        <Pitch 
          pitchRef={pitchRef}
          players={players}
          onPlayerClick={handlePlayerClick}
          onPlayerPositionChange={handlePlayerPositionChange}
          orientation={pitchOrientation}
          aspectRatio={pitchAspectRatio}
        />
      </main>
      
      {editingPlayer && (
        <PlayerEditModal 
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={handleSavePlayer}
        />
      )}
    </div>
  );
}

export default App;
