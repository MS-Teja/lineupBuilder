import { useEffect, useState } from 'react';
import { loadPortrait, rosterPhotos } from '../render/assets';

/** Loads every roster photo; returns a Map(url → image) that grows as images arrive. */
export default function usePortraits(project) {
  const urls = rosterPhotos(project);
  const key = urls.join('\n');
  const [loaded, setLoaded] = useState(() => new Map());

  useEffect(() => {
    let cancelled = false;
    key.split('\n').filter(Boolean).forEach((url) => {
      loadPortrait(url).then((image) => {
        if (cancelled || !image) return;
        setLoaded((current) => (current.get(url) === image ? current : new Map(current).set(url, image)));
      });
    });
    // Fonts arriving late would otherwise leave canvas text in a fallback face.
    document.fonts?.ready.then(() => {
      if (!cancelled) setLoaded((current) => new Map(current));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return loaded;
}
