import { useState } from 'react';
import { isLocalImage, proxiedImageUrl } from '../render/assets';
import { photoRect } from '../render/photoFrame';

/**
 * A photo placed inside a size×size square exactly as the canvas draws it in
 * a marker. Falls back to the CORS proxy, then calls onFail.
 */
export default function FramedPhoto({ src, frame, size, onFail, onNatural }) {
  const [useProxy, setUseProxy] = useState(false);
  const [natural, setNatural] = useState(null);
  const rect = natural ? photoRect(natural.width, natural.height, size, frame) : null;

  return (
    <img
      src={useProxy ? proxiedImageUrl(src) : src}
      alt=""
      draggable={false}
      className="framed-photo"
      style={rect
        ? { left: rect.x, top: rect.y, width: rect.width, height: rect.height }
        : { inset: 0, width: '100%', height: '100%', objectFit: 'cover', visibility: 'hidden' }}
      onLoad={(event) => {
        const next = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
        setNatural(next);
        onNatural?.(next);
      }}
      onError={() => {
        if (!useProxy && !isLocalImage(src)) setUseProxy(true);
        else onFail?.();
      }}
    />
  );
}
