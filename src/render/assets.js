const cache = new Map();

export const proxiedImageUrl = (url) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;

export const isLocalImage = (url = '') => url.startsWith('data:') || url.startsWith('blob:');

const loadImage = (src, crossOrigin) => new Promise((resolve) => {
  const image = new Image();
  if (crossOrigin) image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => resolve(image.naturalWidth ? image : null);
  image.onerror = () => resolve(null);
  image.src = src;
});

// Remote photos load CORS-clean (directly, else through the wsrv proxy) so
// they never taint export canvases.
export function loadPortrait(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) {
    cache.set(url, isLocalImage(url)
      ? loadImage(url, false)
      : loadImage(url, true).then((image) => image ?? loadImage(proxiedImageUrl(url), true)));
  }
  return cache.get(url);
}

export const rosterPhotos = (project) =>
  [...new Set(Object.values(project.roster).map((profile) => profile?.photo).filter(Boolean))];

export async function preparePortraits(urls) {
  await document.fonts?.ready;
  const loaded = await Promise.all(urls.map(async (url) => [url, await loadPortrait(url)]));
  return new Map(loaded.filter(([, image]) => image));
}
