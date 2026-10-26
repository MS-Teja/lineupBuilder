import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePlayerCommands from '../features/players/usePlayerCommands';
import PlayerSearch from '../features/players/PlayerSearch';
import { useProject } from '../state/context';
import { formationLabel } from '../state/project';
import { playhead } from '../state/playhead';
import { getGeometry, markerSize, toFramePoint } from '../render/geometry';
import { resolveScene } from '../render/scene';
import { sampleTimeline } from '../render/timeline';
import Popover from '../ui/Popover';
import HitLayer from './HitLayer';
import { paint } from './paint';
import PlayerActions from './PlayerActions';
import usePortraits from './usePortraits';
import './stage.css';

const PAD = 32;

export default function Stage() {
  const { project, activeScene, ui, setUi, dispatch, playback } = useProject();
  const { timeline } = playback;
  const { assignPlayer } = usePlayerCommands();
  const areaRef = useRef(null);
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState(null);
  const portraits = usePortraits(project);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, []);

  const geometry = getGeometry(project.orientation);
  const fit = Math.max(0, Math.min(
    (area.width - PAD * 2) / geometry.frame.width,
    (area.height - PAD * 2) / geometry.frame.height,
  ));
  const frameWidth = Math.floor(geometry.frame.width * fit);
  const frameHeight = Math.floor(geometry.frame.height * fit);
  const cssScale = frameWidth / geometry.frame.width;
  const markerPx = markerSize(geometry, project.style.markerScale) * cssScale;

  const resolved = useMemo(() => resolveScene(project, activeScene), [project, activeScene]);
  const rendered = useMemo(() => (
    drag
      ? { ...resolved, slots: resolved.slots.map((slot) => (slot.id === drag.slotId ? { ...slot, coord: { x: drag.x, y: drag.y } } : slot)) }
      : resolved
  ), [resolved, drag]);

  // Editing: redraw the active scene whenever anything it depends on changes.
  useEffect(() => {
    if (!ui.isPreviewing) paint(canvasRef.current, rendered, { width: frameWidth, portraits, style: project.style, editor: true });
  }, [rendered, frameWidth, portraits, project.style, ui.isPreviewing]);

  // Previewing (playing, scrubbing, paused mid-transition): paint the shared
  // timeline at the playhead on every playhead change, outside React renders.
  useEffect(() => {
    if (!ui.isPreviewing) return undefined;
    const draw = () => {
      const { rendered: frame } = sampleTimeline(timeline, playhead.get());
      paint(canvasRef.current, frame, { width: frameWidth, portraits, style: project.style, editor: false });
    };
    draw();
    return playhead.subscribe(draw);
  }, [ui.isPreviewing, timeline, frameWidth, portraits, project.style]);

  const field = {
    left: geometry.field.x * cssScale,
    top: geometry.field.y * cssScale,
    width: geometry.field.width * cssScale,
    height: geometry.field.height * cssScale,
  };

  const pointFor = useCallback((slotId) => {
    const slot = rendered.slots.find((item) => item.id === slotId);
    const point = toFramePoint(geometry.field, slot.coord);
    return { x: point.x * cssScale, y: point.y * cssScale };
  }, [rendered, geometry.field, cssScale]);

  const popoverSlotId = ui.popover?.type === 'search' ? ui.popover.slotId : null;

  const searchAnchor = useCallback(() => {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame || !popoverSlotId) return null;
    const point = pointFor(popoverSlotId);
    const radius = markerPx / 2;
    const left = frame.left + point.x - radius;
    const top = frame.top + point.y - radius;
    return { left, top, right: left + markerPx, bottom: top + markerPx, width: markerPx, height: markerPx };
  }, [pointFor, popoverSlotId, markerPx]);

  const closePopover = useCallback(() => setUi({ popover: null }), [setUi]);

  const deselect = () => setUi({ selectedSlotId: null, focus: 'style', popover: null });

  const selectSlot = (slotId) => {
    setUi({
      selectedSlotId: slotId,
      focus: 'slot',
      popover: project.roster[slotId] ? null : { type: 'search', slotId },
    });
  };

  const dropSlot = ({ slotId, x, y, swapId }) => {
    if (swapId) dispatch({ type: 'swapSlots', a: slotId, b: swapId });
    else dispatch({ type: 'moveSlot', slotId, x, y });
    setUi({ selectedSlotId: slotId, focus: 'slot', popover: null });
  };

  const selected = !ui.isPreviewing && !drag && !popoverSlotId && ui.selectedSlotId;
  const sceneIndex = project.scenes.indexOf(activeScene);

  return (
    <section
      ref={areaRef}
      className="stage-area"
      aria-label="Pitch"
      onPointerDown={(event) => {
        if (ui.isPreviewing) playback.exitPreview();
        else if (event.target === event.currentTarget) deselect();
      }}
    >
      <div className="stage-frame" ref={frameRef} style={{ width: frameWidth, height: frameHeight }}>
        <div className="stage-meta" aria-hidden="true">
          <span className="stage-meta-scene">
            <b className="tabular">{String(sceneIndex + 1).padStart(2, '0')}</b>
            {activeScene.label}
          </span>
          <span>{formationLabel(activeScene)}</span>
          <span>{project.orientation === 'landscape' ? '16:9 · 1920×1080' : '9:16 · 1080×1920'}</span>
          {ui.scope === 'scene' && !ui.isPreviewing && <span className="stage-meta-scope">Editing this scene only</span>}
          {ui.isPreviewing && !ui.isPlaying && <span className="stage-meta-scope">Preview · click the pitch to edit</span>}
        </div>

        <canvas ref={canvasRef} className="stage-canvas" />

        {!ui.isPreviewing && frameWidth > 0 && (
          <HitLayer
            slots={rendered.slots}
            field={field}
            markerPx={markerPx}
            selectedSlotId={ui.selectedSlotId}
            snap={project.style.snap}
            drag={drag}
            onDrag={setDrag}
            onSelect={selectSlot}
            onDrop={dropSlot}
            onBackground={deselect}
          />
        )}

        {selected && project.roster[selected] && (
          <PlayerActions slotId={selected} point={pointFor(selected)} markerPx={markerPx} />
        )}
      </div>

      {popoverSlotId && (
        <Popover anchor={searchAnchor} onClose={closePopover} label="Find a player" className="search-popover">
          <PlayerSearch
            key={popoverSlotId}
            slotId={popoverSlotId}
            positionId={activeScene.slots[popoverSlotId].positionId}
            current={project.roster[popoverSlotId]}
            onAssign={assignPlayer}
          />
        </Popover>
      )}
    </section>
  );
}
