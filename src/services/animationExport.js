import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { interpolateScene, prepareSceneAssets, renderSceneToCanvas } from './sceneRenderer';

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

const even = (value) => Math.max(2, Math.floor(value / 2) * 2);

const scaleCanvas = (source, maxWidth) => {
  const scale = Math.min(1, maxWidth / source.width);
  const width = even(source.width * scale);
  const height = even(source.height * scale);
  if (width === source.width && height === source.height) return source;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return canvas;
};

const getFramePlan = (frames, requestedFps, maximumFrames) => {
  const totalMilliseconds = frames.reduce((total, frame) => total + frame.duration, 0);
  const safeFps = Math.max(3, Math.min(requestedFps, Math.floor(maximumFrames / Math.max(totalMilliseconds / 1000, 1))));
  const frameDelay = Math.round(1000 / safeFps);
  const steps = frames.map((frame) => Math.max(1, Math.round(frame.duration / frameDelay)));

  return {
    frameDelay,
    totalFrames: steps.reduce((total, count) => total + count, 0),
    steps,
  };
};

async function* timelineFrames({ frames, motion, onProgress, maxWidth, fps, maximumFrames, displaySettings }) {
  if (!frames.length) throw new Error('Add at least one keyframe before exporting.');

  const plan = getFramePlan(frames, fps, maximumFrames);
  const portraits = await prepareSceneAssets(frames.map((frame) => frame.scene));
  let captured = 0;

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    const frame = frames[frameIndex];
    const nextFrame = frames[frameIndex + 1];

    for (let step = 0; step < plan.steps[frameIndex]; step += 1) {
      const scene = nextFrame
        ? interpolateScene(frame.scene, nextFrame.scene, step / plan.steps[frameIndex], motion)
        : frame.scene;
      const rendered = scaleCanvas(renderSceneToCanvas(scene, { portraits, displaySettings }), maxWidth);
      captured += 1;
      onProgress?.({ captured, total: plan.totalFrames, keyframe: frame });
      yield { canvas: rendered, delay: plan.frameDelay };
      await wait(plan.frameDelay);
    }
  }
}

const getVideoFormat = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1.4D401F', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  return candidates.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
};

export const exportStill = async ({ scene, filename, displaySettings }) => {
  const portraits = await prepareSceneAssets([scene]);
  // Render at 2x super-sampled resolution (3840×2160 for landscape 4K, 2160×3840 for portrait) for razor-sharp still graphics
  const canvas = renderSceneToCanvas(scene, { portraits, displaySettings, resolutionMultiplier: 2 });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  if (!blob) throw new Error('Could not render the still image.');
  download(blob, filename);
};

export const exportGif = async ({ frames, motion, onProgress, filename, displaySettings }) => {
  const gif = GIFEncoder();
  let didWriteFrame = false;

  for await (const { canvas, delay } of timelineFrames({
    frames,
    motion,
    onProgress,
    maxWidth: 1280,
    fps: 12,
    maximumFrames: 120,
    displaySettings,
  })) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(imageData.data, 256);
    const indexed = applyPalette(imageData.data, palette);
    gif.writeFrame(indexed, canvas.width, canvas.height, {
      palette,
      delay,
      repeat: 0,
    });
    didWriteFrame = true;
  }

  if (!didWriteFrame) throw new Error('No frames were available to encode.');
  gif.finish();
  download(new Blob([gif.bytes()], { type: 'image/gif' }), filename);
};

export const exportVideo = async ({ frames, motion, onProgress, filenameBase, displaySettings }) => {
  const format = getVideoFormat();
  if (format === null || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    throw new Error('Video export is not supported by this browser. Try GIF export instead.');
  }

  let recordingCanvas = null;
  let context = null;
  let recorder = null;
  let stream = null;
  const chunks = [];

  try {
    for await (const { canvas } of timelineFrames({
      frames,
      motion,
      onProgress,
      maxWidth: 1920,
      fps: 30,
      maximumFrames: 360,
      displaySettings,
    })) {
      if (!recordingCanvas) {
        recordingCanvas = document.createElement('canvas');
        recordingCanvas.width = canvas.width;
        recordingCanvas.height = canvas.height;
        context = recordingCanvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        stream = recordingCanvas.captureStream(30);
        recorder = new MediaRecorder(stream, {
          mimeType: format.mimeType,
          videoBitsPerSecond: 25_000_000,
        });
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.start();
      }

      context.drawImage(canvas, 0, 0);
      stream.getVideoTracks()[0]?.requestFrame?.();
    }

    if (!recorder) throw new Error('No frames were available to encode.');

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
};
