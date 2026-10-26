import { Link, LoaderCircle, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { processImageFile, processImageUrl } from '../../services/playerDirectory';
import Avatar from '../../ui/Avatar';
import { Button, IconButton, Slider } from '../../ui/controls';
import './players.css';

/** Upload a file or paste a URL for a player photo, with an optional crop-focus slider. */
export default function PhotoInput({ player, accent, onPhotoChange, onCropChange }) {
  const inputId = useId();
  const fileRef = useRef(null);
  const [url, setUrl] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (task) => {
    setIsBusy(true);
    setError(null);
    try {
      onPhotoChange(await task());
      setUrl('');
    } catch (failure) {
      setError(failure.message || 'Could not load that image.');
    } finally {
      setIsBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyUrl = () => {
    if (url.trim()) run(() => processImageUrl(url.trim()));
  };

  return (
    <div className="photo-input">
      <div className="photo-input-main">
        <Avatar player={player} size={56} accent={accent} />
        <div className="photo-input-actions">
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) run(() => processImageFile(file));
            }}
          />
          <label htmlFor={inputId} className="btn btn-secondary btn-sm">
            {isBusy ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}
            {player?.photo ? 'Replace photo' : 'Upload photo'}
          </label>
          {player?.photo && (
            <Button size="sm" variant="ghost" icon={X} onClick={() => onPhotoChange(null)}>Remove</Button>
          )}
        </div>
      </div>

      <div className="url-row">
        <Link size={14} aria-hidden="true" />
        <input
          className="input"
          type="url"
          value={url}
          placeholder="Or paste an image URL"
          aria-label="Photo URL"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyUrl();
            }
          }}
        />
        <IconButton size="sm" variant="solid" icon={isBusy ? LoaderCircle : Upload} label="Use URL" onClick={applyUrl} disabled={!url.trim() || isBusy} />
      </div>

      {error && <p className="form-error">{error}</p>}

      {player?.photo && onCropChange && (
        <Slider
          label="Crop focus"
          value={player.photoCropY ?? 0}
          min={0}
          max={100}
          step={1}
          format={(value) => (value < 34 ? 'Top' : value > 66 ? 'Bottom' : 'Centre')}
          onChange={onCropChange}
        />
      )}
    </div>
  );
}
