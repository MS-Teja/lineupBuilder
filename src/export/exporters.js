import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { preparePortraits, rosterPhotos } from '../render/assets';
import { getGeometry } from '../render/geometry';
import { renderScene, renderToCanvas, resolveScene } from '../render/scene';
import { buildTimeline, sampleTimeline } from '../render/timeline';

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const fileStem = (name) =>
  (name || 'lineup').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lineup';

export function videoFormat() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
  return [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1.4D401F', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ].find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

// Steps through the shared playback timeline, drawing each frame into one canvas.
async function* timelineFrames(project, { fps, maxFrames, scale, readback = false }) {
  const timeline = buildTimeline(project);
  const seconds = Math.max(timeline.total / 1000, 0.001);
  const safeFps = Math.max(4, Math.min(fps, Math.floor(maxFrames / seconds)));
  const delay = 1000 / safeFps;
  const count = Math.max(1, Math.ceil(timeline.total / delay));
  const portraits = await preparePortraits(rosterPhotos(project));
  const { frame } = getGeometry(project.orientation);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frame.width * scale / 2) * 2;
  canvas.height = Math.round(frame.height * scale / 2) * 2;
  const context = canvas.getContext('2d', { willReadFrequently: readback });

  for (let index = 0; index < count; index += 1) {
    const { rendered } = sampleTimeline(timeline, Math.min(index * delay, timeline.total - 1));
    renderScene(context, rendered, { scale, portraits, style: project.style });
    yield { canvas, context, delay, index, count };
  }
}

export async function exportStill({ project, scene, filename }) {
  const portraits = await preparePortraits(rosterPhotos(project));
  // 2× logical size: 3840×2160 (or 2160×3840) for razor-sharp stills.
  const canvas = renderToCanvas(resolveScene(project, scene), { scale: 2, portraits, style: project.style });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not render the still image.');
  download(blob, filename);
}

export async function exportGif({ project, filename, onProgress }) {
  const gif = GIFEncoder();
  const { frame } = getGeometry(project.orientation);
  const scale = 1280 / Math.max(frame.width, frame.height);

  for await (const { canvas, context, delay, index, count } of timelineFrames(project, { fps: 12, maxFrames: 150, scale, readback: true })) {
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, { palette, delay: Math.round(delay), repeat: 0 });
    onProgress?.((index + 1) / count);
    // Yield to the browser so the progress bar can paint.
    await wait(0);
  }

  gif.finish();
  download(new Blob([gif.bytes()], { type: 'image/gif' }), filename);
}

export async function exportVideo({ project, filenameBase, onProgress }) {
  const format = videoFormat();
  if (!format) throw new Error('Video export is not supported in this browser. Try GIF instead.');

  let recorder = null;
  let stream = null;
  let startedAt = 0;
  const chunks = [];

  try {
    // MediaRecorder timestamps frames by wall clock, so frames are paced in real time.
    for await (const { canvas, delay, index, count } of timelineFrames(project, { fps: 30, maxFrames: 3600, scale: 1 })) {
      if (!recorder) {
        stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 25_000_000 });
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.start();
        startedAt = performance.now();
      }
      stream.getVideoTracks()[0]?.requestFrame?.();
      onProgress?.((index + 1) / count);
      await wait(Math.max(0, startedAt + (index + 1) * delay - performance.now()));
    }

    const blob = await new Promise((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || format.mimeType }));
      recorder.onerror = () => reject(new Error('The browser stopped the video encoder.'));
      recorder.stop();
    });

    download(blob, `${filenameBase}.${format.extension}`);
    return format.extension;
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}
