import { demoDirectory } from '../utils/formations';

const PUBLIC_SPORTS_DB_KEY = '123';
const PUBLIC_SPORTS_DB_ROOT = `https://www.thesportsdb.com/api/v1/json/${PUBLIC_SPORTS_DB_KEY}`;

const normalizeText = (value = '') => value.toLocaleLowerCase();

const normalizeSportDbPlayer = (player) => ({
  id: `thesportsdb-${player.idPlayer}`,
  provider: 'thesportsdb',
  providerId: player.idPlayer,
  name: player.strPlayer ?? 'Unnamed player',
  photo: player.strThumb || player.strCutout || null,
  club: player.strTeam || 'Club unavailable',
  country: player.strNationality || 'Country unavailable',
  position: player.strPosition || 'Player',
  number: player.strNumber ? Number(player.strNumber) : null,
});

const searchLocalDirectory = (query) => {
  const term = normalizeText(query.trim());

  return demoDirectory.filter((player) => {
    const searchable = [player.name, player.club, player.country, player.position]
      .filter(Boolean)
      .map(normalizeText)
      .join(' ');

    return searchable.includes(term);
  });
};

const requestJson = async (url, signal) => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Directory request failed (${response.status})`);
  }

  return response.json();
};

/**
 * Player search is deliberately routed through an optional proxy first.
 * Set VITE_PLAYER_DIRECTORY_URL to a serverless endpoint backed by API-Football
 * for production. Without it, the public SportsDB lookup gives the prototype
 * real-world enrichment and always falls back to the editable local catalog.
 */
export async function searchPlayerDirectory(query, { signal } = {}) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return { players: [], source: 'local', message: 'Type at least two characters.' };
  }

  const localMatches = searchLocalDirectory(cleanQuery);
  const proxyUrl = import.meta.env.VITE_PLAYER_DIRECTORY_URL;

  try {
    if (proxyUrl) {
      const url = new URL(proxyUrl, window.location.origin);
      url.searchParams.set('q', cleanQuery);
      const payload = await requestJson(url.toString(), signal);
      const remotePlayers = Array.isArray(payload.players) ? payload.players : [];

      return {
        players: [...remotePlayers, ...localMatches].slice(0, 8),
        source: 'proxy',
        message: remotePlayers.length ? 'Live football directory' : 'Local player library',
      };
    }

    const url = `${PUBLIC_SPORTS_DB_ROOT}/searchplayers.php?p=${encodeURIComponent(cleanQuery)}`;
    const payload = await requestJson(url, signal);
    const remotePlayers = (payload.player ?? []).map(normalizeSportDbPlayer);

    return {
      players: [...remotePlayers, ...localMatches]
        .filter((player, index, all) => all.findIndex(({ name, club }) => name === player.name && club === player.club) === index)
        .slice(0, 8),
      source: remotePlayers.length ? 'public' : 'local',
      message: remotePlayers.length ? 'Public football directory' : 'Local player library',
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    return {
      players: localMatches,
      source: 'local',
      message: 'Directory is offline — showing local players.',
    };
  }
}

export const createManualPlayer = (name) => ({
  id: `manual-${crypto.randomUUID()}`,
  provider: 'manual',
  name: name.trim() || 'Untitled player',
  photo: null,
  club: 'Unassigned club',
  country: 'Unassigned country',
  position: 'Player',
  number: null,
});
