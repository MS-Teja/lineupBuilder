import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { preparePortraits, rosterPhotos } from '../render/assets';
import { getGeometry } from '../render/geometry';
import { renderScene, renderToCanvas, resolveScene } from '../render/scene';
import { buildTimeline, sampleTimeline } from '../render/timeline';

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

// Lets the progress bar paint between frames. Unlike setTimeout, a
// MessageChannel message isn't throttled when the tab is in the background,
// so an export keeps full speed if you switch away while it runs.
const yieldToBrowser = () => new Promise((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => resolve();
  channel.port2.postMessage(null);
});

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

const abortError = () => new DOMException('Export cancelled.', 'AbortError');

// Steps through the shared playback timeline, drawing each frame into one canvas.
async function* timelineFrames(project, { fps, maxFrames, scale, readback = false, delayStep = 0, signal }) {
  const timeline = buildTimeline(project);
  const seconds = Math.max(timeline.total / 1000, 0.001);
  const safeFps = Math.max(4, Math.min(fps, Math.floor(maxFrames / seconds)));
  // GIF stores delays in hundredths of a second; rounding each frame would drift.
  const delay = delayStep ? Math.ceil(1000 / safeFps / delayStep) * delayStep : 1000 / safeFps;
  const count = Math.max(1, Math.ceil(timeline.total / delay));
  const portraits = await preparePortraits(rosterPhotos(project));
  const { frame } = getGeometry(project.orientation);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frame.width * scale / 2) * 2;
  canvas.height = Math.round(frame.height * scale / 2) * 2;
  const context = canvas.getContext('2d', { willReadFrequently: readback });

  for (let index = 0; index < count; index += 1) {
    if (signal?.aborted) throw abortError();
    const { rendered } = sampleTimeline(timeline, index * delay);
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

export async function exportGif({ project, filename, onProgress, signal }) {
  const gif = GIFEncoder();
  const { frame } = getGeometry(project.orientation);
  const scale = 1280 / Math.max(frame.width, frame.height);

  for await (const { canvas, context, delay, index, count } of timelineFrames(project, { fps: 12.5, maxFrames: 150, scale, readback: true, delayStep: 10, signal })) {
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, { palette, delay: Math.round(delay), repeat: 0 });
    onProgress?.((index + 1) / count);
    await yieldToBrowser();
  }

  gif.finish();
  download(new Blob([gif.bytes()], { type: 'image/gif' }), filename);
}

// H.264 levels as [level_idc, max macroblocks per frame, max macroblocks per second].
const H264_LEVELS = [[0x28, 8192, 245760], [0x2a, 8704, 522240], [0x32, 22080, 589824], [0x33, 36864, 983040], [0x34, 36864, 2073600], [0x3c, 139264, 4177920]];

// Levels big enough for this size and frame rate, smallest first.
const h264Levels = (width, height, fps) => {
  const frameSize = Math.ceil(width / 16) * Math.ceil(height / 16);
  const fitting = H264_LEVELS.filter(([, maxFrame, maxRate]) => frameSize <= maxFrame && frameSize * fps <= maxRate);
  return (fitting.length ? fitting : [H264_LEVELS.at(-1)]).map(([level]) => level.toString(16).padStart(2, '0'));
};

/**
 * First H.264 config this browser can encode offline. Only H.264: it's the
 * codec every player opens (QuickTime, Windows, phones, editors, YouTube). If
 * none is accepted we return null and the caller records in real time, which
 * also yields H.264 MP4 in Safari and Chrome, rather than writing a VP9/AV1
 * file QuickTime can't play.
 *
 * Codec string: avc1.PPCCLL (profile, constraint flags, level).
 */
async function pickEncoderConfig(width, height, fps, bitrate) {
  const profiles = ['6400', '4d00', '42e0']; // High, Main, Constrained Baseline
  for (const profile of profiles) {
    for (const level of h264Levels(width, height, fps)) {
      for (const bitrateMode of ['variable', undefined]) {
        const config = {
          codec: `avc1.${profile}${level}`,
          width,
          height,
          bitrate,
          framerate: fps,
          avc: { format: 'avc' },
          ...(bitrateMode && { bitrateMode }),
        };
        try {
          if ((await VideoEncoder.isConfigSupported(config)).supported) return { config, muxCodec: 'avc' };
        } catch {
          // Rejected outright by this browser; try the next one.
        }
      }
    }
  }
  return null;
}

class EncoderStalledError extends Error {}

// No encoded output for this long means the encoder has hung (seen with
// Safari's hardware encoder), not that it's slow.
const STALL_MS = 8000;

/**
 * Encodes the timeline frame by frame with WebCodecs and muxes it to MP4.
 * We drive VideoEncoder ourselves and poll its queue for backpressure instead
 * of waiting on its 'dequeue' event, which Safari doesn't reliably fire; the
 * old approach could wait for that event forever.
 */
async function encodeOffline({ project, filenameBase, onProgress, scale, fps, signal }) {
  const { BufferTarget, EncodedPacket, EncodedVideoPacketSource, Mp4OutputFormat, Output } = await import('mediabunny');
  const { frame } = getGeometry(project.orientation);
  const width = Math.round((frame.width * scale) / 2) * 2;
  const height = Math.round((frame.height * scale) / 2) * 2;
  // Upload-grade bitrate (YouTube recommends ~12 Mbps for 1080p30), scaled by
  // pixel count and frame rate: 1080p60 ≈ 18 Mbps, 4K60 ≈ 72 Mbps.
  const bitrate = Math.round(12_000_000 * scale * scale * (fps > 30 ? 1.5 : 1));
  const choice = await pickEncoderConfig(width, height, fps, bitrate);
  if (!choice) return null;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const source = new EncodedVideoPacketSource(choice.muxCodec);
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  let failure = null;
  let lastActivity = performance.now();
  let muxing = Promise.resolve();
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      lastActivity = performance.now();
      const packet = EncodedPacket.fromEncodedChunk(chunk);
      muxing = muxing.then(() => source.add(packet, meta));
    },
    error: (error) => {
      failure = error;
    },
  });
  encoder.configure(choice.config);

  const check = () => {
    if (failure) throw failure;
    if (signal?.aborted) throw abortError();
    if (performance.now() - lastActivity > STALL_MS) throw new EncoderStalledError('The video encoder stopped responding.');
  };

  try {
    for await (const { canvas, delay, index, count } of timelineFrames(project, { fps, maxFrames: 7200, scale, signal })) {
      // Photos load before the first frame; don't count that as encoder time.
      if (index === 0) lastActivity = performance.now();
      // Keep at most a couple of frames queued so memory stays flat.
      while (encoder.encodeQueueSize > 2) {
        check();
        await yieldToBrowser();
      }
      check();
      const videoFrame = new VideoFrame(canvas, { timestamp: Math.round(index * delay * 1000), duration: Math.round(delay * 1000) });
      encoder.encode(videoFrame, { keyFrame: index % (fps * 2) === 0 });
      videoFrame.close();
      lastActivity = performance.now();
      onProgress?.((index + 1) / count);
      if (index % 4 === 0) await yieldToBrowser();
    }

    // flush() is a promise the encoder may also never settle, so watch it too.
    let flushed = false;
    encoder.flush().then(() => { flushed = true; }, (error) => { failure = error; });
    lastActivity = performance.now();
    while (!flushed) {
      check();
      await yieldToBrowser();
    }
    await muxing;
    check();
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }

  download(new Blob([output.target.buffer], { type: 'video/mp4' }), `${filenameBase}.mp4`);
  return 'mp4';
}

async function recordRealtime({ project, filenameBase, onProgress, scale, fps, signal }) {
  const format = recorderFormat();
  if (!format) throw new Error('Video export is not supported in this browser. Try GIF instead.');

  let recorder = null;
  let stream = null;
  let startedAt = 0;
  const chunks = [];

  try {
    // MediaRecorder timestamps frames by wall clock, so frames are paced in real time.
    for await (const { canvas, delay, index, count } of timelineFrames(project, { fps, maxFrames: 3600, scale, signal })) {
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
  } catch (error) {
    if (recorder?.state === 'recording') recorder.stop();
    throw error;
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Exports the timeline as video. size: key of VIDEO_SIZES; fps: 30 or 60.
 * Falls back to a real-time recording when this browser can't encode H.264
 * offline (onFallback('unsupported')) or its encoder stalls
 * (onFallback('stalled')). Returns the file extension.
 */
export async function exportVideo({ project, filenameBase, onProgress, onFallback, signal, size = '1080p', fps = 30 }) {
  const options = { project, filenameBase, onProgress, signal, scale: VIDEO_SIZES[size]?.scale ?? 1, fps };
  if (canEncodeOffline()) {
    try {
      const extension = await encodeOffline(options);
      if (extension) return extension;
      onFallback?.('unsupported');
    } catch (error) {
      if (!(error instanceof EncoderStalledError) || !recorderFormat()) throw error;
      onFallback?.('stalled');
      onProgress?.(0);
    }
  }
  return recordRealtime(options);
}
