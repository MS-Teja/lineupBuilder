import { Maximize, Minimize, ScanFace } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FRAME_PRESETS, MAX_ZOOM, MIN_ZOOM, fitZoom, focusFor, frameOf, photoRect } from '../../render/photoFrame';
import { Button, Slider } from '../../ui/controls';
import FramedPhoto from '../../ui/FramedPhoto';
import './players.css';

const SIZE = 168;
const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Frame a player's photo inside their marker: drag to pan, scroll or use the
 * slider to zoom. The dimmed area outside the circle shows what's cropped.
 */
export default function PhotoFramer({ player, accent, onFrameChange }) {
  const [natural, setNatural] = useState(null);
  const [failed, setFailed] = useState(false);
  const stageRef = useRef(null);
  const drag = useRef(null);
  const latest = useRef(null);
  const frame = frameOf(player);

  // Pan from where the photo visibly is, not from a focus point the clamp
  // may be hiding, so the first pixels of a drag always move the photo.
  const visibleFocus = () => {
    const rect = photoRect(natural.width, natural.height, SIZE, frame);
    return { rect, focus: focusFor(rect, SIZE) };
  };

  const change = (next) => onFrameChange({ zoom: clampZoom(next.zoom), x: clamp01(next.x), y: clamp01(next.y) });

  const zoomBy = (factor) => {
    if (!natural) return;
    const { focus } = visibleFocus();
    change({ ...focus, zoom: frame.zoom * factor });
  };

  useEffect(() => {
    latest.current = zoomBy;
  });

  // Native, non-passive wheel listener so zooming doesn't scroll the inspector.
  useEffect(() => {
    const stage = stageRef.current;
    const onWheel = (event) => {
      event.preventDefault();
      latest.current?.(Math.exp(-event.deltaY * 0.0025));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event) => {
    if (!natural || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ...visibleFocus() };
  };

  const onPointerMove = (event) => {
    if (!drag.current) return;
    const { x, y, rect, focus } = drag.current;
    change({
      zoom: frame.zoom,
      x: focus.x - (event.clientX - x) / rect.width,
      y: focus.y - (event.clientY - y) / rect.height,
    });
  };

  const onKeyDown = (event) => {
    const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!natural || (!pan && !['+', '=', '-'].includes(event.key))) return;
    // Keep arrows from also nudging the player on the pitch.
    event.preventDefault();
    event.stopPropagation();
    if (!pan) {
      zoomBy(event.key === '-' ? 1 / 1.1 : 1.1);
      return;
    }
    const { focus, rect } = visibleFocus();
    const step = (event.shiftKey ? 20 : 4);
    change({ zoom: frame.zoom, x: focus.x + (pan[0] * step) / rect.width, y: focus.y + (pan[1] * step) / rect.height });
  };

  if (failed) return <p className="form-error">This photo couldn’t be loaded for framing.</p>;

  return (
    <div className="framer">
      <div
        ref={stageRef}
        className={`framer-stage ${natural ? '' : 'is-loading'}`}
        role="group"
        tabIndex={0}
        aria-label="Photo framing. Drag or use arrow keys to move, scroll or plus and minus to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={onKeyDown}
      >
        <div className="framer-ghost" style={{ width: SIZE, height: SIZE }} aria-hidden="true">
          <FramedPhoto src={player.photo} frame={frame} size={SIZE} />
        </div>
        <div className="framer-circle" style={{ width: SIZE, height: SIZE, '--avatar-accent': accent }}>
          <FramedPhoto src={player.photo} frame={frame} size={SIZE} onNatural={setNatural} onFail={() => setFailed(true)} />
        </div>
        <span className="framer-hint">Drag to move · scroll to zoom</span>
      </div>

      <Slider
        label="Zoom"
        value={Math.round(frame.zoom * 100) / 100}
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.01}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(zoom) => {
          if (!natural) return;
          change({ ...visibleFocus().focus, zoom });
        }}
      />

      <div className="framer-presets">
        <Button size="sm" variant="ghost" icon={Maximize} onClick={() => change(FRAME_PRESETS.fill)}>Fill</Button>
        <Button size="sm" variant="ghost" icon={Minimize} disabled={!natural} onClick={() => change({ zoom: fitZoom(natural.width, natural.height), x: 0.5, y: 0.5 })}>
          Fit
        </Button>
        <Button size="sm" variant="ghost" icon={ScanFace} onClick={() => change(FRAME_PRESETS.face)}>Close-up</Button>
      </div>
    </div>
  );
}
