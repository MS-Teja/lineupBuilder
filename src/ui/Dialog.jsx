import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './controls';
import './overlays.css';

export default function Dialog({ title, subtitle, onClose, canClose = true, footer, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      if (canClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      previous?.focus?.();
    };
  }, [onClose, canClose]);

  return createPortal(
    <div className="dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && canClose) onClose(); }}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="dialog-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} disabled={!canClose} />
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
