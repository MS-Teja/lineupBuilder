import { useState } from 'react';
import { initialsFor } from '../state/project';
import { frameOf } from '../render/photoFrame';
import FramedPhoto from './FramedPhoto';
import './overlays.css';

/** Round player portrait framed like its pitch marker, falling back to initials. */
export default function Avatar({ player, size = 36, accent }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const photo = player?.photo;

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, '--avatar-accent': accent }}>
      {photo && failedSrc !== photo
        ? <FramedPhoto key={photo} src={photo} frame={frameOf(player)} size={size} onFail={() => setFailedSrc(photo)} />
        : initialsFor(player?.name)}
    </span>
  );
}
