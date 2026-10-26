import { getGeometry } from '../render/geometry';
import { renderScene } from '../render/scene';

/** Draws a rendered scene into an on-screen canvas `width` CSS pixels wide, at device resolution. */
export function paint(canvas, rendered, { width, portraits, style, editor }) {
  if (!canvas || !width) return;
  const { frame } = getGeometry(rendered.orientation);
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(((width * frame.height) / frame.width) * dpr);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  renderScene(canvas.getContext('2d'), rendered, { scale: pixelWidth / frame.width, portraits, style, editor });
}
