export const masterPositions = {
  // Goalkeeper
  'GK': { top: 88, left: 50, role: 'GK' },
  // Defense (Line of 5)
  'LWB': { top: 70, left: 10, role: 'LWB' },
  'LB': { top: 75, left: 15, role: 'LB' },
  'LCB': { top: 78, left: 35, role: 'LCB' },
  'CB': { top: 80, left: 50, role: 'CB' },
  'RCB': { top: 78, left: 65, role: 'RCB' },
  'RB': { top: 75, left: 85, role: 'RB' },
  'RWB': { top: 70, left: 90, role: 'RWB' },
  // Defensive Midfield
  'LDM': { top: 62, left: 35, role: 'LDM' },
  'CDM': { top: 64, left: 50, role: 'CDM' },
  'RDM': { top: 62, left: 65, role: 'RDM' },
  // Midfield
  'LM': { top: 50, left: 15, role: 'LM' },
  'LCM': { top: 52, left: 35, role: 'LCM' },
  'CM': { top: 52, left: 50, role: 'CM' },
  'RCM': { top: 52, left: 65, role: 'RCM' },
  'RM': { top: 50, left: 85, role: 'RM' },
  // Attacking Midfield
  'LAM': { top: 40, left: 25, role: 'LAM' },
  'CAM': { top: 38, left: 50, role: 'CAM' },
  'RAM': { top: 40, left: 75, role: 'RAM' },
  // Forwards
  'LW': { top: 25, left: 15, role: 'LW' },
  'LF': { top: 25, left: 35, role: 'LF' },
  'CF': { top: 28, left: 50, role: 'CF' },
  'RF': { top: 25, left: 65, role: 'RF' },
  'RW': { top: 25, left: 85, role: 'RW' },
  'ST': { top: 18, left: 50, role: 'ST' },
  'LS': { top: 20, left: 35, role: 'LS' },
  'RS': { top: 20, left: 65, role: 'RS' },
};

export const formations = {
  '4-3-3': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CDM', 'RCM', 'LW', 'ST', 'RW'],
  '4-4-2': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LS', 'RS'],
  '4-2-3-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LDM', 'RDM', 'LAM', 'CAM', 'RAM', 'ST'],
  '3-5-2': ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LCM', 'CDM', 'RCM', 'RWB', 'LS', 'RS'],
  '4-3-3 (False 9)': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CDM', 'RCM', 'LW', 'CF', 'RW'],
  '3-4-3': ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'LW', 'ST', 'RW']
};

export const defaultPlayers = [
  { id: 1, name: '', number: '', photo: null, isRevealed: true, positionId: 'GK' },
  { id: 2, name: '', number: '', photo: null, isRevealed: true, positionId: 'LB' },
  { id: 3, name: '', number: '', photo: null, isRevealed: true, positionId: 'LCB' },
  { id: 4, name: '', number: '', photo: null, isRevealed: true, positionId: 'RCB' },
  { id: 5, name: '', number: '', photo: null, isRevealed: true, positionId: 'RB' },
  { id: 6, name: '', number: '', photo: null, isRevealed: true, positionId: 'LCM' },
  { id: 7, name: '', number: '', photo: null, isRevealed: true, positionId: 'CDM' },
  { id: 8, name: '', number: '', photo: null, isRevealed: true, positionId: 'RCM' },
  { id: 9, name: '', number: '', photo: null, isRevealed: true, positionId: 'LW' },
  { id: 10, name: '', number: '', photo: null, isRevealed: true, positionId: 'ST' },
  { id: 11, name: '', number: '', photo: null, isRevealed: true, positionId: 'RW' },
];
