import { useEffect, useRef } from 'react';
import { paint } from '../../stage/paint';

const HEIGHT = 63;
const BOX_WIDTH = 112;

/** Small preview of a scene exactly as it will export (hidden players omitted). */
export default function SceneThumb({ rendered, portraits, style }) {
  const ref = useRef(null);
  const width = rendered.orientation === 'landscape' ? Math.round((HEIGHT * 16) / 9) : Math.round((HEIGHT * 9) / 16);

  useEffect(() => {
    paint(ref.current, rendered, { width, portraits, style, editor: false });
  }, [rendered, width, portraits, style]);

  return (
    <span className="scene-thumb" style={{ width: BOX_WIDTH, height: HEIGHT }} aria-hidden="true">
      <canvas ref={ref} style={{ width, height: HEIGHT }} />
    </span>
  );
}
