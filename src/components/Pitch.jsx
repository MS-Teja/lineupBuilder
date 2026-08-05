import { GripVertical } from 'lucide-react';
import { useState } from 'react';
import PlayerCard from './PlayerCard';
import { getCoordinates, roleMap } from '../utils/formations';

const phaseFor = (unit) => {
  if (unit === 'Goalkeeper') return 0;
  if (unit === 'Back line') return 1;
  if (unit === 'Midfield') return 2;
  return 3;
};

export default function Pitch({
  slots,
  selectedSlotId,
  formation,
  orientation,
  motion,
  onSelectSlot,
  onMoveSlot,
}) {
  const [draggedSlotId, setDraggedSlotId] = useState(null);

  const startDrag = (event, slotId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', slotId);
    requestAnimationFrame(() => setDraggedSlotId(slotId));
  };

  const finishDrag = () => setDraggedSlotId(null);

  const handleDrop = (event, destinationSlotId) => {
    event.preventDefault();
    const sourceSlotId = event.dataTransfer.getData('text/plain') || draggedSlotId;

    if (sourceSlotId && sourceSlotId !== destinationSlotId) {
      onMoveSlot(sourceSlotId, destinationSlotId);
    }

    setDraggedSlotId(null);
  };

  return (
    <section className="tactical-stage" aria-label="Tactical pitch">
      <div
        className={`pitch-artboard is-${orientation} formation-${motion.formationTransition}`}
        style={{ '--formation-duration': `${motion.formationDuration}ms` }}
      >
        <div className="pitch-surface" aria-label={`${formation.label} tactical layout`}>
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

          {draggedSlotId && slots.map((slot) => {
            const coordinates = getCoordinates(slot.positionId, orientation);
            const role = roleMap[slot.positionId];

            return (
              <div
                key={`drop-${slot.id}`}
                className={`drop-target ${slot.id === draggedSlotId ? 'is-source' : ''}`}
                style={{ '--x': `${coordinates.x}cqw`, '--y': `${coordinates.y}cqh` }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, slot.id)}
                aria-hidden="true"
              >
                <span>{role.label}</span>
              </div>
            );
          })}

          {slots.map((slot) => {
            const coordinates = getCoordinates(slot.positionId, orientation);
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
              <GripVertical size={14} />
              Drop to swap roles
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
