import React from 'react';
import { Download, LayoutDashboard, Eye, EyeOff } from 'lucide-react';
import { formations } from '../utils/formations';

const Sidebar = ({ 
  formation, 
  setFormation, 
  players, 
  activePlayerId, 
  onPlayerSelect, 
  onExport,
  togglePlayerVisibility,
  hideAllPlayers,
  revealAllPlayers,
  pitchOrientation,
  setPitchOrientation,
  pitchAspectRatio,
  setPitchAspectRatio
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <LayoutDashboard className="text-accent-primary" size={24} color="#10b981" />
        <h1>Lineup Builder</h1>
      </div>
      
      <div className="sidebar-content">
        <div className="form-group">
          <label htmlFor="formation-select">Formation Preset</label>
          <select 
            id="formation-select"
            className="custom-select"
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
          >
            {Object.keys(formations).map(form => (
              <option key={form} value={form}>{form}</option>
            ))}
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div className="layout-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div className="form-group">
            <label>Pitch Orientation</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn-secondary ${pitchOrientation === 'vertical' ? 'active' : ''}`} 
                onClick={() => setPitchOrientation('vertical')} 
                style={{ flex: 1, backgroundColor: pitchOrientation === 'vertical' ? 'var(--accent-primary)' : '', color: pitchOrientation === 'vertical' ? 'white' : '' }}
              >
                Vertical
              </button>
              <button 
                className={`btn-secondary ${pitchOrientation === 'horizontal' ? 'active' : ''}`} 
                onClick={() => setPitchOrientation('horizontal')} 
                style={{ flex: 1, backgroundColor: pitchOrientation === 'horizontal' ? 'var(--accent-primary)' : '', color: pitchOrientation === 'horizontal' ? 'white' : '' }}
              >
                Horizontal
              </button>
            </div>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>Aspect Ratio</label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pitchAspectRatio.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.4" 
              max="2.0" 
              step="0.05" 
              value={pitchAspectRatio} 
              onChange={(e) => setPitchAspectRatio(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        <button className="btn-primary" onClick={onExport}>
          <Download size={20} />
          Export Lineup
        </button>

        <div className="presentation-controls" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={hideAllPlayers} style={{ flex: 1 }}>Hide All</button>
          <button className="btn-secondary" onClick={revealAllPlayers} style={{ flex: 1 }}>Reveal All</button>
        </div>

        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label>Starting XI (Recording Controls)</label>
          <div className="player-list">
            {players.map(player => (
              <div 
                key={player.id}
                className={`player-list-item ${activePlayerId === player.id ? 'active' : ''}`}
                onClick={() => onPlayerSelect(player)}
              >
                <div className="player-number">{player.number}</div>
                <div className="player-name">{player.name || `Position ${player.id}`}</div>
                <button 
                  className="btn-icon" 
                  style={{ width: 'auto', padding: '0.25rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayerVisibility(player.id);
                  }}
                  title={player.isRevealed ? "Hide Player" : "Reveal Player"}
                >
                  {player.isRevealed ? <Eye size={18} /> : <EyeOff size={18} color="var(--text-muted)" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
