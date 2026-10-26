import ExportDialog from './features/export/ExportDialog';
import Inspector from './features/inspector/Inspector';
import SceneStrip from './features/scenes/SceneStrip';
import useShortcuts from './features/shortcuts/useShortcuts';
import TopBar from './features/topbar/TopBar';
import Stage from './stage/Stage';
import { useProject } from './state/context';
import ProjectProvider from './state/ProjectProvider';
import Toast from './ui/Toast';
import './app.css';

function Studio() {
  const { ui } = useProject();
  useShortcuts();

  return (
    <div className="studio">
      <TopBar />
      <main className="workspace">
        <Stage />
        <Inspector />
      </main>
      <SceneStrip />
      {ui.isExportOpen && <ExportDialog />}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <Studio />
    </ProjectProvider>
  );
}
