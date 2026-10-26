import { Crosshair, Move } from 'lucide-react';
import { useRef, useState } from 'react';
import PlayerCard from './PlayerCard';
import { getCoordinates, roleMap } from '../utils/formations';

const phaseFor = (unit) => {
  if (unit === 'Goalkeeper') return 0;
  if (unit === 'Back line') return 1;
  if (unit === 'Midfield') return 2;
  return 3;
};

// Check if a point (px, py) in percentage coords is within a radius of a slot
const SNAP_RADIUS_PX = 36; // pixels for swapping two players
const SCALE_PRESET_VALUES = { xs: 0.65, sm: 0.8, md: 1.0, lg: 1.2, xl: 1.4, xxl: 1.65 };

export default function Pitch({
  slots,
  selectedSlotId,
  formation,
  orientation,
  motion,
  circleScale,
  showNames,
  showGrid = true,
  snapToGrid = true,
  positionMode,
  onSelectSlot,
  onMoveSlot,
  onPositionDrag,
  onDeselect,
}) {
  const [draggedSlotId, setDraggedSlotId] = useState(null);
  const [dragCoords, setDragCoords] = useState(null);
  const [activeSnapGuides, setActiveSnapGuides] = useState([]);
  const [hoveredSwapSlotId, setHoveredSwapSlotId] = useState(null);
  const surfaceRef = useRef(null);

  const scaleMultiplier = typeof circleScale === 'number'
    ? circleScale
    : (SCALE_PRESET_VALUES[circleScale] ?? 1.0);

  const GRID_STEP = 2.5; // 2.5% increments for precision alignment

  // Computes snapped coordinates (magnetic teammate lines or 2.5% grid steps)
  const calculateSnappedCoords = (rawPctX, rawPctY, currentSlotId) => {
    if (!snapToGrid) {
      return {
        x: Math.max(4, Math.min(96, Math.round(rawPctX * 10) / 10)),
        y: Math.max(4, Math.min(96, Math.round(rawPctY * 10) / 10)),
        guides: [],
      };
    }

    let snappedX = null;
    let snappedY = null;
    const guides = [];

    // 1. Check teammate magnetic alignment (within 2.2% of any teammate's X or Y)
    for (const slot of slots) {
      if (slot.id === currentSlotId) continue;
      const baseCoords = getCoordinates(slot.positionId, orientation);
      const coords = (slot.customX != null && slot.customY != null)
        ? { x: slot.customX, y: slot.customY }
        : baseCoords;
      const role = roleMap[slot.positionId] || { label: 'Player', unit: 'Squad' };
      const shortName = slot.profile?.name ? slot.profile.name.split(' ').filter(Boolean).at(-1) : role.label;

      if (snappedX == null && Math.abs(rawPctX - coords.x) <= 2.2) {
        snappedX = coords.x;
        guides.push({
          type: 'vertical',
          pos: coords.x,
          label: `Aligned with ${shortName} (${coords.x.toFixed(1)}%)`,
        });
      }

      if (snappedY == null && Math.abs(rawPctY - coords.y) <= 2.2) {
        snappedY = coords.y;
        guides.push({
          type: 'horizontal',
          pos: coords.y,
          label: `Aligned with ${shortName} (${coords.y.toFixed(1)}%)`,
        });
      }
    }

    // 2. Fall back to grid step if not magnetically snapped to a teammate
    const finalX = snappedX != null ? snappedX : Math.round(rawPctX / GRID_STEP) * GRID_STEP;
    const finalY = snappedY != null ? snappedY : Math.round(rawPctY / GRID_STEP) * GRID_STEP;

    return {
      x: Math.max(4, Math.min(96, Math.round(finalX * 10) / 10)),
      y: Math.max(4, Math.min(96, Math.round(finalY * 10) / 10)),
      guides,
    };
  };

  // Common drop execution: if dropped over another player, swap; otherwise place at exact coordinates
  const executeDrop = (sourceSlotId, dropPctX, dropPctY) => {
    if (!surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const dropPxX = (dropPctX / 100) * rect.width;
    const dropPxY = (dropPctY / 100) * rect.height;

    let closestSlot = null;
    let closestDist = Infinity;

    for (const slot of slots) {
      if (slot.id === sourceSlotId) continue;

      const baseCoords = getCoordinates(slot.positionId, orientation);
      const coords = (slot.customX != null && slot.customY != null)
        ? { x: slot.customX, y: slot.customY }
        : baseCoords;

      const slotPxX = (coords.x / 100) * rect.width;
      const slotPxY = (coords.y / 100) * rect.height;
      const dist = Math.hypot(dropPxX - slotPxX, dropPxY - slotPxY);

      if (dist < closestDist) {
        closestDist = dist;
        closestSlot = slot;
      }
    }

    if (closestSlot && closestDist <= SNAP_RADIUS_PX) {
      // Swapping slots
      onMoveSlot(sourceSlotId, closestSlot.id);
    } else if (onPositionDrag) {
      // Free placement with grid/magnetic snap coordinates
      const clampedX = Math.round(Math.max(4, Math.min(96, dropPctX)) * 10) / 10;
      const clampedY = Math.round(Math.max(4, Math.min(96, dropPctY)) * 10) / 10;
      onPositionDrag(sourceSlotId, clampedX, clampedY);
    }
  };

  // ── Smooth Pointer Events (mouse, trackpad, touch, iPad, mobile) ────────
  const handlePointerDown = (event, slotId) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    const startX = event.clientX;
    const startY = event.clientY;
    let hasMoved = false;

    const onPointerMove = (moveEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!hasMoved && dist > 5) {
        hasMoved = true;
        setDraggedSlotId(slotId);
      }

      if (hasMoved && surfaceRef.current) {
        const rect = surfaceRef.current.getBoundingClientRect();
        const rawPctX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const rawPctY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

        const { x, y, guides } = calculateSnappedCoords(rawPctX, rawPctY, slotId);
        setDragCoords({ x, y });
        setActiveSnapGuides(guides);

        // Check if hovering near another slot to highlight swap
        const curPxX = (x / 100) * rect.width;
        const curPxY = (y / 100) * rect.height;
        let swapSlot = null;

        for (const slot of slots) {
          if (slot.id === slotId) continue;
          const baseCoords = getCoordinates(slot.positionId, orientation);
          const coords = (slot.customX != null && slot.customY != null)
            ? { x: slot.customX, y: slot.customY }
            : baseCoords;
          const slotPxX = (coords.x / 100) * rect.width;
          const slotPxY = (coords.y / 100) * rect.height;
          if (Math.hypot(curPxX - slotPxX, curPxY - slotPxY) <= SNAP_RADIUS_PX) {
            swapSlot = slot.id;
            break;
          }
        }
        setHoveredSwapSlotId(swapSlot);
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (!hasMoved) {
        // Just clicked without moving -> select slot
        onSelectSlot(slotId);
        return;
      }

      if (surfaceRef.current) {
        const rect = surfaceRef.current.getBoundingClientRect();
        const dropPxX = upEvent.clientX - rect.left;
        const dropPxY = upEvent.clientY - rect.top;
        const rawPctX = (dropPxX / rect.width) * 100;
        const rawPctY = (dropPxY / rect.height) * 100;
        const { x, y } = calculateSnappedCoords(rawPctX, rawPctY, slotId);

        executeDrop(slotId, x, y);
      }

      setDraggedSlotId(null);
      setDragCoords(null);
      setActiveSnapGuides([]);
      setHoveredSwapSlotId(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // ── HTML5 Drag fallback ────────────────────────────────────────────────
  const startDrag = (event, slotId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', slotId);
    requestAnimationFrame(() => setDraggedSlotId(slotId));
  };

  const finishDrag = () => {
    setDraggedSlotId(null);
    setDragCoords(null);
    setActiveSnapGuides([]);
    setHoveredSwapSlotId(null);
  };

  const handleSurfaceDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleSurfaceDrop = (event) => {
    event.preventDefault();
    const sourceSlotId = event.dataTransfer.getData('text/plain') || draggedSlotId;
    if (!sourceSlotId || !surfaceRef.current) {
      setDraggedSlotId(null);
      return;
    }

    const rect = surfaceRef.current.getBoundingClientRect();
    const dropPxX = event.clientX - rect.left;
    const dropPxY = event.clientY - rect.top;
    const rawPctX = (dropPxX / rect.width) * 100;
    const rawPctY = (dropPxY / rect.height) * 100;
    const { x, y } = calculateSnappedCoords(rawPctX, rawPctY, sourceSlotId);

    executeDrop(sourceSlotId, x, y);
    setDraggedSlotId(null);
    setDragCoords(null);
    setActiveSnapGuides([]);
    setHoveredSwapSlotId(null);
  };

  return (
    <section className="tactical-stage" aria-label="Tactical pitch" onClick={onDeselect}>
      <div
        className={`pitch-artboard is-${orientation} formation-${motion.formationTransition}${showNames === false ? ' hide-names' : ''}${positionMode ? ' position-mode' : ''}`}
        style={{
          '--formation-duration': `${motion.formationDuration}ms`,
          '--circle-multiplier': scaleMultiplier,
        }}
        data-circle-scale={typeof circleScale === 'string' ? circleScale : 'custom'}
      >
        <div
          className="pitch-surface"
          ref={surfaceRef}
          onDragOver={handleSurfaceDragOver}
          onDrop={handleSurfaceDrop}
          aria-label={`${formation.label} tactical layout`}
        >
          <div className="pitch-texture" />
          <div className="pitch-center-line" />
          <div className="pitch-center-circle" />
          <div className="pitch-center-spot" />
          <div className="pitch-box pitch-box-top" />
          <div className="pitch-box pitch-box-bottom" />
          <div className="pitch-six pitch-six-top" />
          <div className="pitch-six pitch-six-bottom" />
          <div className="pitch-spot pitch-spot-top" />
          <div className="pitch-spot pitch-spot-bottom" />
          <div className="pitch-corner pitch-corner-a" />
          <div className="pitch-corner pitch-corner-b" />
          <div className="pitch-corner pitch-corner-c" />
          <div className="pitch-corner pitch-corner-d" />

          {/* Tactical Alignment Grid (Crisp subtle lines & dots only, clean pitch) */}
          {showGrid && (
            <div className={`pitch-tactical-grid is-${orientation}`} aria-hidden="true">
              <div className="grid-dot-matrix" />
              <div className="grid-thirds-guide">
                <div className="grid-third third-1" />
                <div className="grid-third third-2" />
                <div className="grid-third third-3" />
              </div>
              <div className="grid-channels-guide">
                <div className="grid-channel channel-left-flank" />
                <div className="grid-channel channel-left-halfspace" />
                <div className="grid-channel channel-central" />
                <div className="grid-channel channel-right-halfspace" />
                <div className="grid-channel channel-right-flank" />
              </div>
            </div>
          )}

          {/* Active laser alignment guides when magnetically snapping to a teammate */}
          {draggedSlotId && activeSnapGuides.map((guide, idx) => (
            <div
              key={`${guide.type}-${guide.pos}-${idx}`}
              className={`alignment-guide is-${guide.type}`}
              style={{
                [guide.type === 'vertical' ? 'left' : 'top']: `${guide.pos}%`,
              }}
              aria-hidden="true"
            >
              <div className="alignment-guide-badge">
                <span className="guide-dot" />
                <span>{guide.label}</span>
              </div>
            </div>
          ))}

          {/* Floating tactical HUD coordinates while dragging */}
          {draggedSlotId && dragCoords && (
            <div
              className="drag-coord-badge"
              style={{
                left: `${dragCoords.x}%`,
                top: `${dragCoords.y}%`,
              }}
              aria-hidden="true"
            >
              <span className="coord-axis">X:</span>
              <span className="coord-val">{dragCoords.x.toFixed(1)}%</span>
              <span className="coord-sep">·</span>
              <span className="coord-axis">Y:</span>
              <span className="coord-val">{dragCoords.y.toFixed(1)}%</span>
              {snapToGrid && (
                <span className="coord-tag">SNAP</span>
              )}
            </div>
          )}

          {/* Swap indicators when hovering near another player */}
          {draggedSlotId && slots.map((slot) => {
            if (slot.id === draggedSlotId) return null;
            const baseCoords = getCoordinates(slot.positionId, orientation);
            const coordinates = (slot.customX != null && slot.customY != null)
              ? { ...baseCoords, x: slot.customX, y: slot.customY }
              : baseCoords;
            const role = roleMap[slot.positionId] || { label: 'Player', unit: 'Squad' };
            const isHovered = slot.id === hoveredSwapSlotId;

            return (
              <div
                key={`drop-${slot.id}`}
                className={`drop-target ${isHovered ? 'is-active' : ''}`}
                style={{ '--x': `${coordinates.x}%`, '--y': `${coordinates.y}%` }}
                aria-hidden="true"
              >
                <span>{role.label}</span>
              </div>
            );
          })}

          {slots.map((slot) => {
            const baseCoords = getCoordinates(slot.positionId, orientation);
            const standardCoords = (slot.customX != null && slot.customY != null)
              ? { ...baseCoords, x: slot.customX, y: slot.customY }
              : baseCoords;
            const isBeingDragged = slot.id === draggedSlotId;
            const coordinates = isBeingDragged && dragCoords ? dragCoords : standardCoords;
            const role = roleMap[slot.positionId] || { label: 'Player', unit: 'Squad' };

            return (
              <div key={`${slot.id}-${slot.motionKey}`} style={{ '--phase': phaseFor(role.unit) }} className="formation-node">
                <PlayerCard
                  slot={slot}
                  coordinates={coordinates}
                  role={role}
                  selected={slot.id === selectedSlotId}
                  motion={motion}
                  isDragging={isBeingDragged}
                  isSwapTarget={slot.id === hoveredSwapSlotId}
                  onSelect={onSelectSlot}
                  onPointerDown={handlePointerDown}
                  onDragStart={startDrag}
                  onDragEnd={finishDrag}
                />
              </div>
            );
          })}

          {positionMode && !draggedSlotId && (
            <div className="position-mode-pitch-badge" aria-live="polite">
              <Crosshair size={13} />
              <span>Position Mode — Drag players anywhere on the pitch for this cue</span>
            </div>
          )}

          {draggedSlotId && (
            <div className="drag-instruction" aria-hidden="true">
              <Move size={14} />
              Drop on grid to place · Hover over teammate to swap
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
