import { getCoordinates } from '../utils/formations.js';

const FIELD = { length: 105, width: 68 };
const PITCH = {
  penaltyDepth: 16.5,
  penaltyWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  penaltySpot: 11,
  centreCircleRadius: 9.15,
  cornerRadius: 1,
};

const EXPORT_SIZES = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

const portraitCache = new Map();

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const mix = (from, to, progress) => from + (to - from) * progress;

const easeOutQuint = (progress) => 1 - ((1 - progress) ** 5);

const easeInOutQuint = (progress) => (
  progress < 0.5
    ? 16 * (progress ** 5)
    : 1 - ((-2 * progress + 2) ** 5) / 2
);

const labelFor = (name = '') => name.split(' ').filter(Boolean).at(-1) || name || 'Player';

const validAccent = (accent) => (typeof accent === 'string' && accent.startsWith('#') ? accent : '#57635a');

const loadPortrait = (url) => {
  if (!url) return Promise.resolve(null);
  if (portraitCache.has(url)) return portraitCache.get(url);

  const isLocalData = url.startsWith('data:') || url.startsWith('blob:');

  const promise = new Promise((resolve) => {
    const image = new Image();
    if (!isLocalData) {
      image.crossOrigin = 'anonymous';
    }
    image.decoding = 'async';
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // The decoded image remains drawable after a decode race.
      }
      resolve(image.naturalWidth ? image : null);
    };
    image.onerror = () => {
      // If anonymous load fails and it wasn't a local data URL, try via CORS-friendly wsrv proxy with anonymous crossOrigin
      if (!isLocalData) {
        const proxyImage = new Image();
        proxyImage.crossOrigin = 'anonymous';
        proxyImage.decoding = 'async';
        proxyImage.onload = () => resolve(proxyImage.naturalWidth ? proxyImage : null);
        proxyImage.onerror = () => resolve(null);
        proxyImage.src = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
        return;
      }
      resolve(null);
    };
    image.src = url;
  });

  portraitCache.set(url, promise);
  return promise;
};

export const prepareSceneAssets = async (scenes) => {
  await document.fonts?.ready;
  const urls = [...new Set(
    scenes
      .flatMap((scene) => scene.slots)
      .map((slot) => slot.profile?.photo)
      .filter(Boolean),
  )];
  const loaded = await Promise.all(urls.map(async (url) => [url, await loadPortrait(url)]));
  return new Map(loaded.filter(([, image]) => image));
};

export const getExportGeometry = (orientation = 'landscape', resolutionMultiplier = 1) => {
  const baseFrame = EXPORT_SIZES[orientation] ?? EXPORT_SIZES.landscape;
  const frame = {
    width: Math.round(baseFrame.width * resolutionMultiplier),
    height: Math.round(baseFrame.height * resolutionMultiplier),
  };
  const isLandscape = orientation === 'landscape';
  const fieldRatio = isLandscape ? FIELD.length / FIELD.width : FIELD.width / FIELD.length;
  const fieldWidth = Math.min(frame.width, frame.height * fieldRatio);
  const fieldHeight = Math.min(frame.height, frame.width / fieldRatio);

  return {
    frame,
    field: {
      x: (frame.width - fieldWidth) / 2,
      y: (frame.height - fieldHeight) / 2,
      width: fieldWidth,
      height: fieldHeight,
      scale: isLandscape ? fieldWidth / FIELD.length : fieldHeight / FIELD.length,
    },
  };
};

const pitchPoint = (field, orientation, alongLength, acrossWidth) => {
  if (orientation === 'landscape') {
    return {
      x: field.x + (alongLength / FIELD.length) * field.width,
      y: field.y + (acrossWidth / FIELD.width) * field.height,
    };
  }

  return {
    x: field.x + (acrossWidth / FIELD.width) * field.width,
    y: field.y + (alongLength / FIELD.length) * field.height,
  };
};

const drawPitchRect = (context, field, orientation, alongLength, acrossWidth, length, width) => {
  const point = pitchPoint(field, orientation, alongLength, acrossWidth);
  if (orientation === 'landscape') {
    context.strokeRect(
      point.x,
      point.y,
      (length / FIELD.length) * field.width,
      (width / FIELD.width) * field.height,
    );
  } else {
    context.strokeRect(
      point.x,
      point.y,
      (width / FIELD.width) * field.width,
      (length / FIELD.length) * field.height,
    );
  }
};

const drawPitch = (context, geometry, orientation) => {
  const { frame, field } = geometry;
  const isLandscape = orientation === 'landscape';
  const unit = field.scale;
  const lineWidth = Math.max(3.5, unit * 0.175);
  const line = '#ffffff';

  context.fillStyle = '#0a1710';
  context.fillRect(0, 0, frame.width, frame.height);

  const gradient = isLandscape
    ? context.createLinearGradient(field.x, field.y, field.x + field.width, field.y)
    : context.createLinearGradient(field.x, field.y, field.x, field.y + field.height);
  gradient.addColorStop(0, '#1c4c31');
  gradient.addColorStop(0.5, '#296340');
  gradient.addColorStop(1, '#1c4c31');
  context.fillStyle = gradient;
  context.fillRect(field.x, field.y, field.width, field.height);

  context.save();
  context.beginPath();
  context.rect(field.x, field.y, field.width, field.height);
  context.clip();
  context.globalAlpha = 0.03;
  context.fillStyle = '#ffffff';
  const stripeCount = 10;
  for (let index = 0; index < stripeCount; index += 1) {
    if (index % 2) continue;
    if (isLandscape) {
      const x0 = Math.round(field.x + (field.width / stripeCount) * index);
      const x1 = Math.round(field.x + (field.width / stripeCount) * (index + 1));
      context.fillRect(x0, field.y, x1 - x0, field.height);
    } else {
      const y0 = Math.round(field.y + (field.height / stripeCount) * index);
      const y1 = Math.round(field.y + (field.height / stripeCount) * (index + 1));
      context.fillRect(field.x, y0, field.width, y1 - y0);
    }
  }
  context.restore();

  context.save();
  context.strokeStyle = line;
  context.lineWidth = lineWidth;
  context.strokeRect(field.x + lineWidth / 2, field.y + lineWidth / 2, field.width - lineWidth, field.height - lineWidth);

  if (isLandscape) {
    context.beginPath();
    context.moveTo(field.x + field.width / 2, field.y);
    context.lineTo(field.x + field.width / 2, field.y + field.height);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(field.x, field.y + field.height / 2);
    context.lineTo(field.x + field.width, field.y + field.height / 2);
    context.stroke();
  }

  const middle = pitchPoint(field, orientation, FIELD.length / 2, FIELD.width / 2);
  context.beginPath();
  context.arc(middle.x, middle.y, PITCH.centreCircleRadius * unit, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = line;
  context.beginPath();
  context.arc(middle.x, middle.y, Math.max(4.5, unit * 0.28), 0, Math.PI * 2);
  context.fill();

  const penaltyY = (FIELD.width - PITCH.penaltyWidth) / 2;
  const goalAreaY = (FIELD.width - PITCH.goalAreaWidth) / 2;
  drawPitchRect(context, field, orientation, 0, penaltyY, PITCH.penaltyDepth, PITCH.penaltyWidth);
  drawPitchRect(context, field, orientation, FIELD.length - PITCH.penaltyDepth, penaltyY, PITCH.penaltyDepth, PITCH.penaltyWidth);
  drawPitchRect(context, field, orientation, 0, goalAreaY, PITCH.goalAreaDepth, PITCH.goalAreaWidth);
  drawPitchRect(context, field, orientation, FIELD.length - PITCH.goalAreaDepth, goalAreaY, PITCH.goalAreaDepth, PITCH.goalAreaWidth);

  [PITCH.penaltySpot, FIELD.length - PITCH.penaltySpot].forEach((distance) => {
    const spot = pitchPoint(field, orientation, distance, FIELD.width / 2);
    context.beginPath();
    context.arc(spot.x, spot.y, Math.max(4.5, unit * 0.28), 0, Math.PI * 2);
    context.fill();
  });

  const corners = [
    [0, 0, 0, Math.PI / 2],
    [0, FIELD.width, Math.PI / 2, Math.PI],
    [FIELD.length, FIELD.width, Math.PI, (Math.PI * 3) / 2],
    [FIELD.length, 0, (Math.PI * 3) / 2, Math.PI * 2],
  ];
  corners.forEach(([alongLength, acrossWidth, start, end]) => {
    const point = pitchPoint(field, orientation, alongLength, acrossWidth);
    context.beginPath();
    context.arc(point.x, point.y, PITCH.cornerRadius * unit, start, end);
    context.stroke();
  });

  context.restore();
};

const drawCover = (context, image, x, y, size, cropY = 0) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = 1;
  let width = size;
  let height = size;
  let drawX = x;
  let drawY = y;

  if (sourceRatio > targetRatio) {
    width = size * sourceRatio;
    drawX -= (width - size) / 2;
  } else {
    // Tall photos: use cropY to control vertical anchor.
    // cropY 0 = top (default), 50 = center, 100 = bottom.
    height = size / sourceRatio;
    const maxShift = height - size;
    drawY -= maxShift * (cropY / 100);
  }

  context.drawImage(image, drawX, drawY, width, height);
};

const CIRCLE_SCALE_MAP = { xs: 0.65, sm: 0.8, md: 1, lg: 1.2, xl: 1.4, xxl: 1.65 };

const drawPlayer = (context, slot, coordinate, field, portraits, orientation, displaySettings = {}) => {
  const displayCoordinate = slot.renderCoordinate ?? coordinate;
  const point = {
    x: field.x + (displayCoordinate.x / 100) * field.width,
    y: field.y + (displayCoordinate.y / 100) * field.height,
  };
  const scaleFactor = typeof displaySettings.circleScale === 'number'
    ? displaySettings.circleScale
    : (CIRCLE_SCALE_MAP[displaySettings.circleScale] ?? 1);
  const marker = clamp(Math.round(field.scale * 6 * scaleFactor), 36, 180);
  const radius = marker / 2;
  const profile = slot.profile;
  const hidden = Boolean(profile) && !slot.isRevealed && slot.renderOpacity === undefined;
  const opacity = slot.renderOpacity ?? 1;

  if (profile && slot.renderPlaceholder === 'hidden') {
    context.save();
    context.translate(point.x, point.y);
    context.scale(slot.renderScale ?? 1, slot.renderScale ?? 1);
    context.translate(0, (slot.renderOffsetY ?? 0) * marker);
    context.fillStyle = '#4c584f';
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(222, 230, 218, 0.42)';
    context.lineWidth = Math.max(3, marker * 0.042);
    context.beginPath();
    context.arc(0, 0, radius - context.lineWidth / 2, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  if (opacity <= 0.01) return;

  context.save();
  context.globalAlpha = opacity;
  context.translate(point.x, point.y);
  context.scale(slot.renderScale ?? 1, slot.renderScale ?? 1);
  context.translate(0, (slot.renderOffsetY ?? 0) * marker);
  context.shadowColor = 'rgba(0, 0, 0, 0.55)';
  context.shadowBlur = marker * 0.16;
  context.shadowOffsetY = marker * 0.08;
  context.fillStyle = profile ? (hidden ? '#4c584f' : validAccent(slot.accent)) : '#58645c';
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';

  const portrait = !hidden && profile?.photo ? portraits.get(profile.photo) : null;
  if (portrait) {
    context.save();
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    drawCover(context, portrait, -radius, -radius, marker, profile.photoCropY ?? 0);
    context.restore();
  }

  // Crisp outer dark contrast ring
  context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  context.lineWidth = Math.max(1.5, marker * 0.02);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();

  // Crisp inner white ring
  context.strokeStyle = profile ? '#ffffff' : 'rgba(255, 255, 255, 0.45)';
  const strokeWidth = Math.max(3.5, marker * 0.05);
  context.lineWidth = strokeWidth;
  context.beginPath();
  context.arc(0, 0, radius - strokeWidth / 2, 0, Math.PI * 2);
  context.stroke();

  if (!profile) {
    context.fillStyle = '#ffffff';
    context.font = `700 ${Math.round(marker * 0.44)}px Outfit, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('+', 0, 1);
    context.restore();
    return;
  }

  if (!hidden) {
    if (!portrait) {
      context.fillStyle = '#142218';
      context.font = `800 ${Math.round(marker * 0.32)}px Outfit, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(profile.number ?? '—'), 0, 1);
    }

    const showNames = displaySettings.showNames !== false;
    if (showNames) {
      const name = labelFor(profile.name);
      const isPortrait = orientation === 'portrait';
      const detailsY = radius + marker * (isPortrait ? 0.16 : 0.18);
      const fontSize = Math.round(marker * (isPortrait ? 0.20 : 0.22));

      context.save();
      context.font = `700 ${fontSize}px Outfit, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'top';

      // Draw subtle pill background for high contrast in broadcast videos
      const textMetrics = context.measureText(name);
      const textWidth = textMetrics.width;
      const padX = marker * 0.12;
      const padY = marker * 0.05;
      const pillHeight = fontSize + padY * 2;
      const pillWidth = textWidth + padX * 2;
      const pillX = -pillWidth / 2;
      const pillY = detailsY - padY;
      const pillRadius = pillHeight / 2;

      context.fillStyle = 'rgba(10, 18, 12, 0.88)';
      context.beginPath();
      if (typeof context.roundRect === 'function') {
        context.roundRect(pillX, pillY, pillWidth, pillHeight, pillRadius);
      } else {
        context.rect(pillX, pillY, pillWidth, pillHeight);
      }
      context.fill();
      context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      context.lineWidth = 1;
      context.stroke();

      context.fillStyle = '#ffffff';
      context.fillText(name, 0, detailsY);
      context.restore();
    }
  }

  context.restore();
};

const transitionProgressFor = (progress, style) => {
  if (style === 'cut') return progress < 1 ? 0 : 1;
  if (style === 'glide') return easeOutQuint(progress);
  return easeInOutQuint(progress);
};

const playerMotionFor = ({ fromVisible, toVisible, progress, motion }) => {
  if (fromVisible === toVisible) {
    return { opacity: fromVisible ? 1 : 0, scale: 1, offsetY: 0 };
  }

  const entering = toVisible;
  const amount = entering ? easeOutQuint(progress) : 1 - easeOutQuint(progress);
  const style = entering ? motion.playerEntry : motion.playerExit;
  const result = { opacity: amount, scale: 1, offsetY: 0 };

  if (style === 'lift') result.offsetY = (1 - amount) * 0.62;
  if (style === 'sink') result.offsetY = (1 - amount) * 0.62;
  if (style === 'scale') result.scale = 0.54 + amount * 0.46;

  return result;
};

export const interpolateScene = (fromScene, toScene, progress, motion) => {
  const orientation = fromScene.orientation === 'portrait' ? 'portrait' : 'landscape';
  const bySlotId = new Map(toScene.slots.map((slot) => [slot.id, slot]));
  const movementProgress = transitionProgressFor(progress, motion.formationTransition);

  return {
    orientation,
    slots: fromScene.slots.map((fromSlot) => {
      const toSlot = bySlotId.get(fromSlot.id) ?? fromSlot;
      const rawFrom = getCoordinates(fromSlot.positionId, orientation);
      const rawTo = getCoordinates(toSlot.positionId, orientation);
      const fromCoordinate = (fromSlot.customX != null && fromSlot.customY != null)
        ? { ...rawFrom, x: fromSlot.customX, y: fromSlot.customY } : rawFrom;
      const toCoordinate = (toSlot.customX != null && toSlot.customY != null)
        ? { ...rawTo, x: toSlot.customX, y: toSlot.customY } : rawTo;
      const fromVisible = Boolean(fromSlot.profile && fromSlot.isRevealed);
      const toVisible = Boolean(toSlot.profile && toSlot.isRevealed);
      const playerMotion = playerMotionFor({ fromVisible, toVisible, progress, motion });
      const profile = toSlot.profile ?? fromSlot.profile;

      return {
        ...toSlot,
        profile,
        accent: toSlot.accent ?? fromSlot.accent,
        isRevealed: fromVisible || toVisible,
        renderPlaceholder: Boolean(profile) && (fromVisible !== toVisible)
          ? (fromSlot.profile && toSlot.profile ? 'hidden' : 'empty')
          : false,
        renderCoordinate: {
          x: mix(fromCoordinate.x, toCoordinate.x, movementProgress),
          y: mix(fromCoordinate.y, toCoordinate.y, movementProgress),
        },
        renderOpacity: profile ? playerMotion.opacity : 1,
        renderScale: playerMotion.scale,
        renderOffsetY: playerMotion.offsetY,
      };
    }),
  };
};

export const renderSceneToCanvas = (scene, { portraits = new Map(), displaySettings = {}, resolutionMultiplier = 1 } = {}) => {
  const orientation = scene.orientation === 'portrait' ? 'portrait' : 'landscape';
  const geometry = getExportGeometry(orientation, resolutionMultiplier);
  const canvas = document.createElement('canvas');
  canvas.width = geometry.frame.width;
  canvas.height = geometry.frame.height;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  drawPitch(context, geometry, orientation);
  scene.slots.forEach((slot) => {
    const rawCoord = getCoordinates(slot.positionId, orientation);
    const coordinate = (slot.customX != null && slot.customY != null)
      ? { ...rawCoord, x: slot.customX, y: slot.customY } : rawCoord;
    drawPlayer(context, slot, coordinate, geometry.field, portraits, orientation, displaySettings);
  });

  return canvas;
};
