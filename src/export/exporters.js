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

// Video sizes, as multiples of the 1920×1080 logical frame.
export const VIDEO_SIZES = {
  '1080p': { scale: 1, label: '1080p' },
  '1440p': { scale: 4 / 3, label: '1440p' },
  '4k': { scale: 2, label: '4K' },
};

// WebCodecs encodes frame by frame, faster than real time and with no dropped
// frames. MediaRecorder (real-time capture) is the fallback.
export const canEncodeOffline = () => typeof VideoEncoder !== 'undefined';

function recorderFormat() {
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

/** What the video export will produce here: { extension, offline } or null if unsupported. */
export function videoFormat() {
  if (canEncodeOffline()) return { extension: 'mp4', offline: true };
  const recorder = recorderFormat();
  return recorder && { extension: recorder.extension, offline: false };
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

async function encodeOffline({ project, filenameBase, onProgress, scale, fps }) {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, getFirstEncodableVideoCodec } = await import('mediabunny');
  const { frame } = getGeometry(project.orientation);
  const width = Math.round((frame.width * scale) / 2) * 2;
  const height = Math.round((frame.height * scale) / 2) * 2;
  const codec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, frameRate: fps });
  if (!codec) return null;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  let source = null;

  try {
    for await (const { canvas, delay, index, count } of timelineFrames(project, { fps, maxFrames: 7200, scale })) {
      if (!source) {
        // Upload-grade bitrate (YouTube recommends ~12 Mbps for 1080p30), scaled by
        // pixel count and frame rate: 1080p60 ≈ 18 Mbps, 4K60 ≈ 72 Mbps.
        const bitrate = Math.round(12_000_000 * scale * scale * (fps > 30 ? 1.5 : 1));
        source = new CanvasSource(canvas, { codec, quality: new Quality({ bitrate, bitrateMode: 'variable' }), keyFrameInterval: 2 });
        output.addVideoTrack(source, { frameRate: Math.round(1000 / delay) });
        await output.start();
      }
      await source.add((index * delay) / 1000, delay / 1000);
      onProgress?.((index + 1) / count);
      // Let the progress bar paint now and then.
      if (index % 6 === 0) await wait(0);
    }
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  }

  download(new Blob([output.target.buffer], { type: 'video/mp4' }), `${filenameBase}.mp4`);
  return 'mp4';
}

async function recordRealtime({ project, filenameBase, onProgress, scale, fps }) {
  const format = recorderFormat();
  if (!format) throw new Error('Video export is not supported in this browser. Try GIF instead.');

  let recorder = null;
  let stream = null;
  let startedAt = 0;
  const chunks = [];

  try {
    // MediaRecorder timestamps frames by wall clock, so frames are paced in real time.
    for await (const { canvas, delay, index, count } of timelineFrames(project, { fps, maxFrames: 3600, scale })) {
      if (!recorder) {
        stream = canvas.captureStream(fps);
        recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: Math.round(25_000_000 * scale * scale) });
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

/** Exports the timeline as video. size: key of VIDEO_SIZES; fps: 30 or 60. Returns the file extension. */
export async function exportVideo({ project, filenameBase, onProgress, size = '1080p', fps = 30 }) {
  const options = { project, filenameBase, onProgress, scale: VIDEO_SIZES[size]?.scale ?? 1, fps };
  if (canEncodeOffline()) {
    const extension = await encodeOffline(options);
    if (extension) return extension;
  }
  return recordRealtime(options);
}
