import { useRef } from 'react';
import { roleMap } from '../utils/formations';
import { snapPosition } from './snapping';

const DRAG_THRESHOLD = 4;

/**
 * Invisible, focusable targets laid over the canvas — one per slot — that
 * handle select, drag-to-move and drop-on-teammate-to-swap. Drawing stays in
 * the canvas; this layer only adds interaction, focus rings and snap guides.
 */
export default function HitLayer({ slots, field, markerPx, selectedSlotId, snap, drag, onDrag, onSelect, onDrop, onBackground }) {
  const layerRef = useRef(null);

  const handlePointerDown = (event, slot) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    const rect = layerRef.current.getBoundingClientRect();
    const others = slots.filter((other) => other.id !== slot.id);
    const startX = event.clientX;
    const startY = event.clientY;
    let current = null;

    const measure = (pointer) => {
      const rawX = ((pointer.clientX - rect.left) / rect.width) * 100;
      const rawY = ((pointer.clientY - rect.top) / rect.height) * 100;
      const { x, y, guides } = snapPosition(rawX, rawY, others.map((other) => other.coord), snap);
      const swap = others.find((other) => Math.hypot(
        ((other.coord.x - x) / 100) * rect.width,
        ((other.coord.y - y) / 100) * rect.height,
      ) < markerPx * 0.55);
      return { slotId: slot.id, moved: true, x, y, guides: swap ? [] : guides, swapId: swap?.id ?? null };
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const onMove = (pointer) => {
      if (!current && Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < DRAG_THRESHOLD) return;
      current = measure(pointer);
      onDrag(current);
    };

    const onUp = (pointer) => {
      cleanup();
      if (!current) {
        onSelect(slot.id);
        return;
      }
      onDrag(null);
      onDrop(measure(pointer));
    };

    const onCancel = () => {
      cleanup();
      onDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  return (
    <div
      ref={layerRef}
      className={`hit-layer ${drag ? 'is-dragging' : ''}`}
      style={{ left: field.left, top: field.top, width: field.width, height: field.height }}
      onPointerDown={onBackground}
    >
      {drag?.guides.map((guide) => (
        <div
          key={guide.axis}
          className={`snap-guide is-${guide.axis}`}
          style={guide.axis === 'x' ? { left: `${guide.at}%` } : { top: `${guide.at}%` }}
          aria-hidden="true"
        />
      ))}

      {slots.map((slot) => {
        const coord = drag?.slotId === slot.id ? drag : slot.coord;
        const role = roleMap[slot.positionId]?.label ?? 'Player';
        const state = [
          slot.id === selectedSlotId && 'is-selected',
          !slot.profile && 'is-empty',
          drag?.slotId === slot.id && 'is-dragged',
          drag?.swapId === slot.id && 'is-swap',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={slot.id}
            type="button"
            className={`hit-target ${state}`}
            style={{ left: `${coord.x}%`, top: `${coord.y}%`, width: markerPx, height: markerPx }}
            aria-label={slot.profile ? `${slot.profile.name}, ${role}` : `Empty ${role} — add a player`}
            aria-pressed={slot.id === selectedSlotId}
            onPointerDown={(event) => handlePointerDown(event, slot)}
            // Keyboard activation only; pointer selection happens on pointerup.
            onClick={(event) => { if (event.detail === 0) onSelect(slot.id); }}
          />
        );
      })}
    </div>
  );
}
