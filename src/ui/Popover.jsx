import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './overlays.css';

const GAP = 8;
const EDGE = 12;

const anchorRect = (anchor) => {
  if (typeof anchor === 'function') return anchor();
  return anchor?.current?.getBoundingClientRect() ?? null;
};

/**
 * Floating panel anchored to an element ref or a function returning a
 * viewport rect. Flips above the anchor when there's no room below and is
 * clamped to the viewport. Closes on outside pointerdown and Escape.
 */
export default function Popover({ anchor, onClose, placement = 'bottom-start', className = '', label, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const position = () => {
      const rect = anchorRect(anchor);
      if (!rect) return;
      const { width, height } = element.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = placement.startsWith('top') || (spaceBelow < height + GAP + EDGE && rect.top > height + GAP)
        ? rect.top - height - GAP
        : rect.bottom + GAP;
      let left = rect.left;
      if (placement.endsWith('end')) left = rect.right - width;
      if (placement.endsWith('center')) left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(left, EDGE), window.innerWidth - width - EDGE);
      // When it fits neither above nor below, overlap the anchor rather than leave the viewport.
      const clampedTop = Math.max(EDGE, Math.min(top, window.innerHeight - height - EDGE));
      element.style.transform = `translate(${Math.round(left)}px, ${Math.round(clampedTop)}px)`;
      element.style.visibility = 'visible';
    };

    position();
    const observer = new ResizeObserver(position);
    observer.observe(element);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
    };
  }, [anchor, placement]);

  useLayoutEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current?.contains(event.target)) return;
      const anchorElement = typeof anchor === 'function' ? null : anchor?.current;
      if (anchorElement?.contains(event.target)) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} className={`popover ${className}`} role="dialog" aria-label={label} style={{ visibility: 'hidden' }}>
      {children}
    </div>,
    document.body,
  );
}
