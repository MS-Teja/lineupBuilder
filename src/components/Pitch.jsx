import { Move } from 'lucide-react';
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
const SNAP_RADIUS_PX = 42; // pixels — roughly the size of a player circle

export default function Pitch({
  slots,
  selectedSlotId,
  formation,
  orientation,
  motion,
  onSelectSlot,
  onMoveSlot,
  onFreeDrag,
  onDeselect,
}) {
  const [draggedSlotId, setDraggedSlotId] = useState(null);
  const surfaceRef = useRef(null);

  const startDrag = (event, slotId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', slotId);
    requestAnimationFrame(() => setDraggedSlotId(slotId));
  };

  const finishDrag = () => setDraggedSlotId(null);

  const handleSurfaceDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Unified drop handler: checks if the drop is near another slot (→ swap)
  // or on open pitch (→ free position).
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
    const dropPctX = (dropPxX / rect.width) * 100;
    const dropPctY = (dropPxY / rect.height) * 100;

    // Check if the drop landed close to another player → swap
    let closestSlot = null;
    let closestDist = Infinity;

    for (const slot of slots) {
      if (slot.id === sourceSlotId) continue;

      const baseCoords = getCoordinates(slot.positionId, orientation);
      const coords = (slot.customX != null && slot.customY != null)
        ? { x: slot.customX, y: slot.customY }
        : baseCoords;

      // Convert slot percentage to pixel position for distance check
      const slotPxX = (coords.x / 100) * rect.width;
      const slotPxY = (coords.y / 100) * rect.height;
      const dist = Math.hypot(dropPxX - slotPxX, dropPxY - slotPxY);

      if (dist < closestDist) {
        closestDist = dist;
        closestSlot = slot;
      }
    }

    if (closestSlot && closestDist <= SNAP_RADIUS_PX) {
      // Snap to slot → swap
      onMoveSlot(sourceSlotId, closestSlot.id);
    } else if (onFreeDrag) {
      // Find the closest predefined position
      let closestRole = null;
      let closestRoleDist = Infinity;

      for (const roleId of Object.keys(roleMap)) {
        const coords = getCoordinates(roleId, orientation);
        const rolePxX = (coords.x / 100) * rect.width;
        const rolePxY = (coords.y / 100) * rect.height;
        const dist = Math.hypot(dropPxX - rolePxX, dropPxY - rolePxY);

        if (dist < closestRoleDist) {
          closestRoleDist = dist;
          closestRole = roleId;
        }
      }

      if (closestRole) {
        // Is this role currently occupied by another slot?
        const occupant = slots.find(s => s.id !== sourceSlotId && s.positionId === closestRole && s.customX == null && s.customY == null);
        if (occupant) {
          onMoveSlot(sourceSlotId, occupant.id);
        } else {
          onFreeDrag(sourceSlotId, closestRole);
        }
      }
    }

    setDraggedSlotId(null);
  };

  return (
    <section className="tactical-stage" aria-label="Tactical pitch" onClick={onDeselect}>
      <div
        className={`pitch-artboard is-${orientation} formation-${motion.formationTransition}`}
        style={{ '--formation-duration': `${motion.formationDuration}ms` }}
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

          {/* Swap indicators — visual only, no drop handler */}
          {draggedSlotId && slots.map((slot) => {
            if (slot.id === draggedSlotId) return null;
            const baseCoords = getCoordinates(slot.positionId, orientation);
            const coordinates = (slot.customX != null && slot.customY != null)
              ? { ...baseCoords, x: slot.customX, y: slot.customY }
              : baseCoords;
            const role = roleMap[slot.positionId];

            return (
              <div
                key={`drop-${slot.id}`}
                className="drop-target"
                style={{ '--x': `${coordinates.x}cqw`, '--y': `${coordinates.y}cqh` }}
                aria-hidden="true"
              >
                <span>{role.label}</span>
              </div>
            );
          })}

          {slots.map((slot) => {
            const baseCoords = getCoordinates(slot.positionId, orientation);
            const coordinates = (slot.customX != null && slot.customY != null)
              ? { ...baseCoords, x: slot.customX, y: slot.customY }
              : baseCoords;
            const role = roleMap[slot.positionId];

            return (
              <div key={`${slot.id}-${slot.motionKey}`} style={{ '--phase': phaseFor(role.unit) }} className="formation-node">
                <PlayerCard
                  slot={slot}
                  coordinates={coordinates}
                  role={role}
                  selected={slot.id === selectedSlotId}
                  motion={motion}
                  onSelect={onSelectSlot}
                  onDragStart={startDrag}
                  onDragEnd={finishDrag}
                />
              </div>
            );
          })}

          {draggedSlotId && (
            <div className="drag-instruction" aria-hidden="true">
              <Move size={14} />
              Drop anywhere to position, or near a player to swap
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
