import { X } from 'lucide-react';
import { useProject } from '../../state/context';
import { IconButton } from '../../ui/controls';

export default function InspectorHeader({ eyebrow, title, children, closable = true }) {
  const { setUi } = useProject();
  return (
    <header className="inspector-header">
      {children}
      <div className="inspector-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {closable && (
        <IconButton
          size="sm"
          icon={X}
          label="Back to lineup style (Esc)"
          onClick={() => setUi({ focus: 'style', selectedSlotId: null, popover: null })}
        />
      )}
    </header>
  );
}
