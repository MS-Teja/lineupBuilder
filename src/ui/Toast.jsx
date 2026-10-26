import { X } from 'lucide-react';
import { useProject } from '../state/context';
import './overlays.css';

export default function Toast() {
  const { toast, dismissToast } = useProject();
  if (!toast) return null;

  return (
    <div key={toast.id} className="toast" role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button type="button" className="toast-action" onClick={() => { toast.action.onClick(); dismissToast(); }}>
          {toast.action.label}
        </button>
      )}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={dismissToast}>
        <X size={14} />
      </button>
    </div>
  );
}
