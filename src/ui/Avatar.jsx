import { useState } from 'react';
import { initialsFor } from '../state/project';
import { isLocalImage, proxiedImageUrl } from '../render/assets';
import './overlays.css';

function Photo({ src, cropY, onFail }) {
  const [useProxy, setUseProxy] = useState(false);
  return (
    <img
      src={useProxy ? proxiedImageUrl(src) : src}
      alt=""
      style={{ objectPosition: `50% ${cropY}%` }}
      onError={() => {
        if (!useProxy && !isLocalImage(src)) setUseProxy(true);
        else onFail();
      }}
    />
  );
}

/** Round player portrait with proxy fallback, then initials. */
export default function Avatar({ player, size = 36, accent }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const photo = player?.photo;

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, '--avatar-accent': accent }}>
      {photo && failedSrc !== photo
        ? <Photo key={photo} src={photo} cropY={player.photoCropY ?? 0} onFail={() => setFailedSrc(photo)} />
        : initialsFor(player?.name)}
    </span>
  );
}
