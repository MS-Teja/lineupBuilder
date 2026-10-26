import { useProject } from '../../state/context';
import PlayerInspector from './PlayerInspector';
import SceneInspector from './SceneInspector';
import StyleInspector from './StyleInspector';
import './inspector.css';

export default function Inspector() {
  const { ui } = useProject();

  let content = <StyleInspector />;
  if (ui.focus === 'slot' && ui.selectedSlotId) content = <PlayerInspector key={ui.selectedSlotId} slotId={ui.selectedSlotId} />;
  if (ui.focus === 'scene') content = <SceneInspector />;

  return (
    <aside className={`inspector ${ui.isInspectorOpen ? 'is-open' : ''}`} aria-label="Inspector">
      {content}
    </aside>
  );
}
