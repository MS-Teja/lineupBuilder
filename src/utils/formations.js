const role = (x, y, label, unit) => ({ x, y, label, unit });

// Portrait coordinates run from the attacking goal at the top to the team's
// own goal at the bottom. Landscape is deliberately a separate map: rotating
// a vertical formation makes the lines read incorrectly on a broadcast pitch.
export const roleMap = {
  GK: role(50, 89, 'Goalkeeper', 'Goalkeeper'),
  LB: role(16, 75, 'Left back', 'Back line'),
  LCB: role(36, 78, 'Left centre-back', 'Back line'),
  CB: role(50, 80, 'Centre-back', 'Back line'),
  RCB: role(64, 78, 'Right centre-back', 'Back line'),
  RB: role(84, 75, 'Right back', 'Back line'),
  LWB: role(10, 67, 'Left wing-back', 'Back line'),
  RWB: role(90, 67, 'Right wing-back', 'Back line'),
  LDM: role(36, 64, 'Left defensive midfield', 'Midfield'),
  CDM: role(50, 64, 'Defensive midfield', 'Midfield'),
  RDM: role(64, 64, 'Right defensive midfield', 'Midfield'),
  LM: role(15, 51, 'Left midfield', 'Midfield'),
  LCM: role(36, 52, 'Left centre midfield', 'Midfield'),
  CM: role(50, 52, 'Centre midfield', 'Midfield'),
  RCM: role(64, 52, 'Right centre midfield', 'Midfield'),
  RM: role(85, 51, 'Right midfield', 'Midfield'),
  LAM: role(27, 41, 'Left attacking midfield', 'Midfield'),
  CAM: role(50, 39, 'Attacking midfield', 'Midfield'),
  RAM: role(73, 41, 'Right attacking midfield', 'Midfield'),
  LW: role(15, 25, 'Left wing', 'Front line'),
  LF: role(35, 25, 'Left forward', 'Front line'),
  CF: role(50, 28, 'Centre forward', 'Front line'),
  RF: role(65, 25, 'Right forward', 'Front line'),
  RW: role(85, 25, 'Right wing', 'Front line'),
  LS: role(35, 18, 'Left striker', 'Front line'),
  ST: role(50, 18, 'Striker', 'Front line'),
  RS: role(65, 18, 'Right striker', 'Front line'),
};

// Horizontal board: defend the left goal, attack the right goal. The x values
// establish the lines (goalkeeper → defence → midfield → attack); y keeps the
// team's left flank at the top of screen. These are tactical placements, not a
// geometric transform of the portrait board.
const landscapeRoleMap = {
  GK: { x: 9, y: 50 },
  LB: { x: 24, y: 16 },
  LCB: { x: 22, y: 38 },
  CB: { x: 21, y: 50 },
  RCB: { x: 22, y: 62 },
  RB: { x: 24, y: 84 },
  LWB: { x: 32, y: 13 },
  RWB: { x: 32, y: 87 },
  LDM: { x: 40, y: 36 },
  CDM: { x: 41, y: 50 },
  RDM: { x: 40, y: 64 },
  LM: { x: 48, y: 14 },
  LCM: { x: 48, y: 29 },
  CM: { x: 49, y: 50 },
  RCM: { x: 48, y: 71 },
  RM: { x: 48, y: 86 },
  LAM: { x: 62, y: 29 },
  CAM: { x: 64, y: 50 },
  RAM: { x: 62, y: 71 },
  LW: { x: 74, y: 14 },
  LF: { x: 76, y: 33 },
  CF: { x: 79, y: 50 },
  RF: { x: 76, y: 67 },
  RW: { x: 74, y: 86 },
  LS: { x: 80, y: 36 },
  ST: { x: 82, y: 50 },
  RS: { x: 80, y: 64 },
};

export const formationCatalog = [
  {
    id: '4-3-3',
    label: '4–3–3',
    eyebrow: 'Control the thirds',
    detail: 'Wide front three · single pivot',
    roles: ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CDM', 'RCM', 'LW', 'ST', 'RW'],
  },
  {
    id: '4-2-3-1',
    label: '4–2–3–1',
    eyebrow: 'Between the lines',
    detail: 'Double pivot · central creator',
    roles: ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LDM', 'RDM', 'LAM', 'CAM', 'RAM', 'ST'],
  },
  {
    id: '3-4-2-1',
    label: '3–4–2–1',
    eyebrow: 'Occupy the half-spaces',
    detail: 'Wing-backs · narrow creators',
    roles: ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LCM', 'RCM', 'RWB', 'LAM', 'RAM', 'ST'],
  },
  {
    id: '4-4-2',
    label: '4–4–2',
    eyebrow: 'Two banks, two threats',
    detail: 'Compact midfield · paired strikers',
    roles: ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LS', 'RS'],
  },
  {
    id: '3-5-2',
    label: '3–5–2',
    eyebrow: 'Own the central lane',
    detail: 'Three at the back · midfield overload',
    roles: ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LCM', 'CDM', 'RCM', 'RWB', 'LS', 'RS'],
  },
];

export const getFormation = (id) =>
  formationCatalog.find((formation) => formation.id === id) ?? formationCatalog[0];

export const getCoordinates = (positionId, orientation = 'portrait') => {
  const coordinates = roleMap[positionId] ?? roleMap.CM;

  if (orientation === 'landscape') {
    return {
      ...coordinates,
      ...(landscapeRoleMap[positionId] ?? landscapeRoleMap.CM),
    };
  }

  return coordinates;
};

const seed = (id, positionId, profile, accent) => ({
  id,
  positionId,
  profile,
  isRevealed: true,
  isRemoving: false,
  motionKey: 0,
  accent,
});

export const emptySlot = (id, positionId, motionKey = 0) => ({
  id,
  positionId,
  profile: null,
  isRevealed: false,
  isRemoving: false,
  motionKey,
  accent: 'var(--slot-accent)',
});

export const initialSlots = [
  seed('slot-01', 'GK', { name: 'G. Donnarumma', number: 1, club: 'Paris Saint-Germain', country: 'Italy', position: 'Goalkeeper' }, '#c7a35c'),
  seed('slot-02', 'LB', { name: 'N. Mendes', number: 25, club: 'Paris Saint-Germain', country: 'Portugal', position: 'Left-back' }, '#d28c4f'),
  seed('slot-03', 'LCB', { name: 'W. Saliba', number: 2, club: 'Arsenal', country: 'France', position: 'Centre-back' }, '#cf725e'),
  seed('slot-04', 'RCB', { name: 'R. Araújo', number: 4, club: 'Barcelona', country: 'Uruguay', position: 'Centre-back' }, '#b56d85'),
  seed('slot-05', 'RB', { name: 'J. Koundé', number: 23, club: 'Barcelona', country: 'France', position: 'Right-back' }, '#8d769f'),
  seed('slot-06', 'LCM', { name: 'J. Bellingham', number: 5, club: 'Real Madrid', country: 'England', position: 'Midfield' }, '#8466a8'),
  seed('slot-07', 'CDM', { name: 'Rodri', number: 16, club: 'Manchester City', country: 'Spain', position: 'Midfield' }, '#557da1'),
  seed('slot-08', 'RCM', { name: 'F. Valverde', number: 8, club: 'Real Madrid', country: 'Uruguay', position: 'Midfield' }, '#4d9491'),
  seed('slot-09', 'LW', { name: 'K. Mbappé', number: 9, club: 'Real Madrid', country: 'France', position: 'Forward' }, '#5d9a71'),
  seed('slot-10', 'ST', { name: 'E. Haaland', number: 9, club: 'Manchester City', country: 'Norway', position: 'Forward' }, '#94a354'),
  seed('slot-11', 'RW', { name: 'L. Yamal', number: 19, club: 'Barcelona', country: 'Spain', position: 'Forward' }, '#b7954c'),
];

export const demoDirectory = initialSlots.map((slot) => ({
  id: `demo-${slot.id}`,
  provider: 'demo',
  ...slot.profile,
  photo: null,
}));

export const roleInitials = (positionId) => positionId.replace(/[^A-Z]/g, '').slice(0, 3);

// ─── Custom formation helpers ─────────────────────────────────────────────────

export const allRoleOptions = Object.entries(roleMap).map(([id, data]) => ({
  id,
  label: data.label,
  unit: data.unit,
}));

/**
 * Given a line index, total number of lines, and the count of players on that
 * line, return a list of role IDs from the roleMap. The mapping follows common
 * tactical conventions — a back line of 4 yields LB/LCB/RCB/RB, while a
 * midfield triple maps to LCM/CDM/RCM, and so on.
 */
const backLineRoles = {
  2: ['LCB', 'RCB'],
  3: ['LCB', 'CB', 'RCB'],
  4: ['LB', 'LCB', 'RCB', 'RB'],
  5: ['LWB', 'LCB', 'CB', 'RCB', 'RWB'],
};

const midLowRoles = {
  1: ['CDM'],
  2: ['LDM', 'RDM'],
  3: ['LCM', 'CDM', 'RCM'],
  4: ['LM', 'LCM', 'RCM', 'RM'],
  5: ['LM', 'LCM', 'CDM', 'RCM', 'RM'],
};

const midHighRoles = {
  1: ['CAM'],
  2: ['LAM', 'RAM'],
  3: ['LAM', 'CAM', 'RAM'],
  4: ['LW', 'LAM', 'RAM', 'RW'],
  5: ['LW', 'LAM', 'CAM', 'RAM', 'RW'],
};

const midGenericRoles = {
  1: ['CM'],
  2: ['LCM', 'RCM'],
  3: ['LCM', 'CM', 'RCM'],
  4: ['LM', 'LCM', 'RCM', 'RM'],
  5: ['LM', 'LCM', 'CM', 'RCM', 'RM'],
};

const frontLineRoles = {
  1: ['ST'],
  2: ['LS', 'RS'],
  3: ['LW', 'ST', 'RW'],
  4: ['LW', 'LF', 'RF', 'RW'],
  5: ['LW', 'LF', 'CF', 'RF', 'RW'],
};

export function rolesForLine(lineIndex, count, totalLines) {
  const clamped = Math.min(Math.max(count, 1), 5);
  const outfieldLines = totalLines; // number of outfield lines (GK excluded)

  // First outfield line is always defence
  if (lineIndex === 0) return (backLineRoles[clamped] ?? backLineRoles[4]).slice();

  // Last outfield line is always attack
  if (lineIndex === outfieldLines - 1) return (frontLineRoles[clamped] ?? frontLineRoles[1]).slice();

  // Middle lines: if exactly one middle line → generic midfield
  // If two middle lines → lower is defensive, upper is attacking
  const middleCount = outfieldLines - 2; // number of non-back, non-front lines

  if (middleCount <= 1) return (midGenericRoles[clamped] ?? midGenericRoles[3]).slice();

  const middleIndex = lineIndex - 1; // 0-based within middle lines
  if (middleIndex < middleCount / 2) return (midLowRoles[clamped] ?? midLowRoles[1]).slice();

  return (midHighRoles[clamped] ?? midHighRoles[1]).slice();
}

/**
 * Parse a dash-separated formation string (e.g. "4-3-3", "4-1-4-1") into a
 * formation object with auto-mapped roles. Returns null for invalid input.
 */
export function parseFormationString(input) {
  const cleaned = input.replace(/\s+/g, '').replace(/–/g, '-');

  if (!/^\d(-\d){1,5}$/.test(cleaned)) return null;

  const lines = cleaned.split('-').map(Number);
  const outfieldTotal = lines.reduce((sum, n) => sum + n, 0);

  if (outfieldTotal !== 10 || lines.some((n) => n < 1 || n > 5)) return null;

  const roles = ['GK'];
  lines.forEach((count, index) => {
    roles.push(...rolesForLine(index, count, lines.length));
  });

  return {
    id: `custom-${cleaned}`,
    label: cleaned.split('-').join('–'),
    eyebrow: 'Custom shape',
    detail: 'User-defined formation',
    roles,
  };
}
