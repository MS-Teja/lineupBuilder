import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const PlayerEditModal = ({ player, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setNumber(player.number || '');
    }
  }, [player]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...player,
      name,
      number: parseInt(number, 10) || player.number,
    });
  };

  if (!player) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Player</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="playerName">Name</label>
            <input
              id="playerName"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lionel Messi"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="playerNumber">Number</label>
            <input
              id="playerNumber"
              type="number"
              className="input-field"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 10"
              min="1"
              max="99"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerEditModal;
