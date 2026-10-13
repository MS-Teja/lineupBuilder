import { demoDirectory } from '../utils/formations.js';

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const FOOTBALL_KEYWORDS = [
  'football',
  'soccer',
  'midfielder',
  'striker',
  'forward',
  'defender',
  'winger',
  'goalkeeper',
  'player',
  'f.c.',
  'fc',
];

export const isFootballDescription = (description = '') => {
  const normalized = normalizeText(description);
  return FOOTBALL_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const searchLocalDirectory = (query) => {
  const term = normalizeText(query);
  if (!term) return [];

  return demoDirectory.filter((player) => {
    const searchable = [player.name, player.club, player.country, player.position]
      .filter(Boolean)
      .map(normalizeText)
      .join(' ');

    return searchable.includes(term);
  });
};

const requestJson = async (url, signal) => {
  const response = await fetch(url, {
    signal,
    headers: {
      'Api-User-Agent': 'LineupStudio/1.0 (tactical-lineup-app)',
    },
  });
  if (!response.ok) {
    throw new Error(`Directory request failed (${response.status})`);
  }
  return response.json();
};

const imageElementToDataUrl = (img, maxSize = 400) => {
  const canvas = document.createElement('canvas');
  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  const targetDimension = Math.min(maxSize, Math.max(sourceWidth, sourceHeight));

  canvas.width = targetDimension;
  canvas.height = targetDimension;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Crop into a centered square cover
  const minSide = Math.min(sourceWidth, sourceHeight);
  const startX = (sourceWidth - minSide) / 2;
  const startY = (sourceHeight - minSide) / 2;

  ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetDimension, targetDimension);
  return canvas.toDataURL('image/png');
};

/**
 * Optimizes an uploaded image file into a clean square base64 data URL.
 * Resizes down to maxSize (default 400x400) to keep memory footprint light
 * while ensuring high-definition sharpness for canvas and video export.
 */
export const processImageFile = (file, maxSize = 400) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not parse image data.'));
      img.onload = () => {
        try {
          resolve(imageElementToDataUrl(img, maxSize));
        } catch {
          reject(new Error('Could not process image file.'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/**
 * Loads an external image URL, resolving CORS restrictions via a reliable proxy
 * if direct access fails, and converts it into a clean square base64 data URL.
 * Ensures the photo renders in preview and never taints export canvases.
 */
export const processImageUrl = async (rawUrl, maxSize = 400) => {
  let url = (rawUrl || '').trim();
  if (!url) {
    throw new Error('Please enter an image URL.');
  }

  if (url.startsWith('data:image/') || url.startsWith('blob:')) {
    return url;
  }

  // Handle scheme-relative or protocol-less URLs
  if (url.startsWith('//')) {
    url = `https:${url}`;
  } else if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // If user pasted a Wikimedia/Wikipedia File page, resolve to the direct image URL
  const wikiFileMatch = url.match(/wikipedia\.org\/wiki\/File:(.+)$|wikimedia\.org\/wiki\/File:(.+)$/i);
  if (wikiFileMatch) {
    const fileName = decodeURIComponent(wikiFileMatch[1] || wikiFileMatch[2]);
    try {
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = await res.json();
        const pages = json.query?.pages || {};
        const firstPage = Object.values(pages)[0];
        const directUrl = firstPage?.imageinfo?.[0]?.url;
        if (directUrl) url = directUrl;
      }
    } catch {
      // Proceed with original URL if resolution fails
    }
  }

  const tryLoadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image from source'));
      img.src = src;
    });

  const tryFetchBlob = async (fetchUrl) => {
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('The URL is a webpage, not an image. Right-click the image and choose "Copy Image Address", or upload the photo file.');
    }
    const blobUrl = URL.createObjectURL(blob);
    try {
      const img = await tryLoadImage(blobUrl);
      return imageElementToDataUrl(img, maxSize);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  // 1. Try direct anonymous load
  try {
    const directImg = await tryLoadImage(url);
    return imageElementToDataUrl(directImg, maxSize);
  } catch {
    // 2. Direct anonymous load failed (CORS/hotlinking). Try via wsrv.nl proxy.
    try {
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
      const proxyImg = await tryLoadImage(proxyUrl);
      return imageElementToDataUrl(proxyImg, maxSize);
    } catch {
      // 3. Try fetching blob via wsrv proxy
      try {
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
        return await tryFetchBlob(proxyUrl);
      } catch {
        // 4. Fallback to allorigins raw proxy
        try {
          const fallbackProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          return await tryFetchBlob(fallbackProxyUrl);
        } catch {
          throw new Error('Could not load image from this URL. Make sure it is a direct image link (PNG, JPG, WebP) or upload a photo file.');
        }
      }
    }
  }
};

/**
 * Search TheSportsDB for official footballer cutouts and profiles.
 */
async function searchTheSportsDb(query, signal) {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query)}`;
    const data = await requestJson(url, signal);
    const rawPlayers = Array.isArray(data.player) ? data.player : [];

    return rawPlayers
      .filter((p) => !p.strSport || p.strSport === 'Soccer')
      .map((p) => ({
        id: `tsdb-${p.idPlayer}`,
        provider: 'sportsdb',
        providerId: p.idPlayer,
        name: p.strPlayer,
        photo: p.strCutout || p.strThumb || null,
        club: p.strTeam?.startsWith('_') ? 'Unattached' : (p.strTeam || 'Unassigned club'),
        country: p.strNationality || 'Unknown',
        position: p.strPosition || 'Player',
        number: p.strNumber && !isNaN(Number(p.strNumber)) ? Number(p.strNumber) : null,
        hasCutout: Boolean(p.strCutout),
        relevance: 12 + (p.strCutout ? 4 : (p.strThumb ? 2 : 0)),
      }));
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return [];
  }
}

/**
 * Search Wikipedia using OpenSearch and footballer title search,
 * retrieving descriptions and high-resolution thumbnail pageimages.
 */
async function searchWikipedia(query, signal) {
  try {
    // 1. Run OpenSearch + query search in parallel
    const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json&origin=*`;
    const footballSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' footballer')}&gsrlimit=6&prop=pageimages|description&piprop=thumbnail&pithumbsize=500&format=json&origin=*`;

    const [openSearchRes, footballRes] = await Promise.allSettled([
      requestJson(openSearchUrl, signal),
      requestJson(footballSearchUrl, signal),
    ]);

    const titleSet = new Set();
    const collectedPages = [];

    // Add pages from football search
    if (footballRes.status === 'fulfilled' && footballRes.value?.query?.pages) {
      Object.values(footballRes.value.query.pages).forEach((page) => {
        if (page.title && !titleSet.has(page.title)) {
          titleSet.add(page.title);
          collectedPages.push(page);
        }
      });
    }

    // Check OpenSearch titles that might need details fetched
    const openSearchTitles = (openSearchRes.status === 'fulfilled' && openSearchRes.value?.[1]) || [];
    const titlesToFetch = openSearchTitles.filter((title) => !titleSet.has(title));

    if (titlesToFetch.length > 0) {
      try {
        const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titlesToFetch.slice(0, 8).join('|'))}&prop=pageimages|description&piprop=thumbnail&pithumbsize=500&format=json&origin=*`;
        const detailsPayload = await requestJson(detailsUrl, signal);
        if (detailsPayload.query?.pages) {
          Object.values(detailsPayload.query.pages).forEach((page) => {
            if (page.title && !titleSet.has(page.title)) {
              titleSet.add(page.title);
              collectedPages.push(page);
            }
          });
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
      }
    }

    return collectedPages.map((page) => {
      const desc = page.description || '';
      const isFooty = isFootballDescription(desc) || page.title.toLowerCase().includes('footballer');
      const hasThumb = Boolean(page.thumbnail?.source);

      let relevance = 2;
      if (isFooty) relevance += 6;
      if (hasThumb) relevance += 3;

      // Extract neat club / descriptor
      const clubDesc = isFooty && desc ? desc : 'Wikipedia Result';

      return {
        id: `wiki-${page.pageid}`,
        provider: 'wikipedia',
        providerId: page.pageid,
        name: page.title.replace(/\s*\([^)]*\)$/, '').trim(),
        photo: page.thumbnail?.source || null,
        club: clubDesc,
        country: isFooty ? 'Footballer' : 'Unknown',
        position: 'Player',
        number: null,
        hasCutout: false,
        relevance,
      };
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return [];
  }
}

/**
 * Searches across TheSportsDB, Wikipedia, and Local Player catalog.
 * Merges and scores relevance so high quality football cutout images are prioritized.
 */
export async function searchPlayerDirectory(query, { signal } = {}) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return { players: [], source: 'local', message: 'Type at least two characters.' };
  }

  const normalizedQuery = normalizeText(cleanQuery);
  const localMatches = searchLocalDirectory(cleanQuery).map((p) => ({
    ...p,
    provider: 'local',
    relevance: normalizeText(p.name).includes(normalizedQuery) ? 14 : 8,
  }));

  const proxyUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_PLAYER_DIRECTORY_URL : undefined;

  try {
    if (proxyUrl) {
      const url = new URL(proxyUrl, window.location.origin);
      url.searchParams.set('q', cleanQuery);
      const payload = await requestJson(url.toString(), signal);
      const remotePlayers = Array.isArray(payload.players) ? payload.players : [];

      return {
        players: [...remotePlayers, ...localMatches].slice(0, 10),
        source: 'proxy',
        message: remotePlayers.length ? 'Live football directory' : 'Local player library',
      };
    }

    // Run parallel searches across TheSportsDB and Wikipedia
    const [tsdbResults, wikiResults] = await Promise.all([
      searchTheSportsDb(cleanQuery, signal),
      searchWikipedia(cleanQuery, signal),
    ]);

    const calculateScore = (player) => {
      const normName = normalizeText(player.name);
      const nameWords = normName.split(/\s+/);
      let score = player.relevance || 0;

      // Exact full name match
      if (normName === normalizedQuery) score += 25;
      // Exact word in name match (e.g. "Saka" in "Bukayo Saka", "Yamal" in "Lamine Yamal")
      else if (nameWords.includes(normalizedQuery)) score += 18;
      // Starts with query
      else if (normName.startsWith(normalizedQuery)) score += 12;
      // Substring match
      else if (normName.includes(normalizedQuery)) score += 6;

      if (player.photo) score += 4;
      if (player.hasCutout) score += 3;

      return score;
    };

    const combined = [...localMatches, ...tsdbResults, ...wikiResults].map((p) => ({
      ...p,
      finalScore: calculateScore(p),
    }));

    // Filter out obvious noise if we have high scoring results
    const maxScore = Math.max(0, ...combined.map((p) => p.finalScore));
    const candidates = maxScore >= 18 ? combined.filter((p) => p.finalScore >= 12) : combined;

    // Deduplicate by normalized player name
    const seenNames = new Set();
    const uniquePlayers = [];

    // Sort by finalScore (higher first)
    candidates.sort((a, b) => b.finalScore - a.finalScore);

    for (const player of candidates) {
      const norm = normalizeText(player.name);
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        uniquePlayers.push(player);
      }
    }

    const players = uniquePlayers.slice(0, 10);

    let source = 'local';
    if (tsdbResults.length > 0) source = 'sportsdb';
    else if (wikiResults.length > 0) source = 'wikipedia';

    return {
      players,
      source,
      message: players.length ? `${players.length} players found` : 'No players found — try creating a custom player.',
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    return {
      players: localMatches,
      source: 'local',
      message: 'Network directory offline — showing local catalog.',
    };
  }
}

/**
 * Creates a custom / manual player object with full support for
 * custom uploaded photos, position, number, club, and country.
 */
export const createManualPlayer = (input = {}) => {
  const data = typeof input === 'string' ? { name: input } : input;
  const rawName = (data.name || '').trim();
  const rawNumber = data.number !== undefined && data.number !== null && data.number !== '' ? Number(data.number) : null;

  return {
    id: `manual-${crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).slice(2)}`,
    provider: 'manual',
    name: rawName || 'Untitled player',
    photo: data.photo || null,
    club: (data.club || '').trim() || 'Custom club',
    country: (data.country || '').trim() || 'Custom country',
    position: (data.position || '').trim() || 'Player',
    number: isNaN(rawNumber) ? null : rawNumber,
  };
};
