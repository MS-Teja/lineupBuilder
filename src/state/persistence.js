import { createDefaultProject, normalizeProject } from './project';

const STORAGE_KEY = 'lineup-studio/project';

export function loadProject() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return (stored && normalizeProject(JSON.parse(stored))) || createDefaultProject();
  } catch {
    return createDefaultProject();
  }
}

// Returns true on success; false when storage is full or blocked.
export function saveProject(project) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}
