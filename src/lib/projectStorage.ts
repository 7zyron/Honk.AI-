import JSZip from 'jszip';
import { HonkProject } from './imports/types';

const PROJECTS_STORAGE_KEY = 'honk_imported_projects_v2';
const ACTIVE_PROJECT_KEY = 'honk_active_project_id';

export function getStoredProjects(): HonkProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load stored projects:', err);
  }
  return [];
}

export function saveStoredProject(project: HonkProject): void {
  try {
    const existing = getStoredProjects().filter(p => p.id !== project.id);
    const updated = [project, ...existing].slice(0, 50); // keep up to 50 projects
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
  } catch (err) {
    console.error('Failed to save project:', err);
  }
}

export function getStoredProjectById(id: string): HonkProject | null {
  const list = getStoredProjects();
  return list.find(p => p.id === id) || null;
}

export function deleteStoredProject(id: string): void {
  try {
    const existing = getStoredProjects().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(existing));
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === id) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}

export async function exportProjectAsZip(project: HonkProject): Promise<Blob> {
  const zip = new JSZip();

  for (const [filePath, content] of Object.entries(project.files)) {
    // JSZip handles folder paths in keys automatically
    zip.file(filePath, content);
  }

  return zip.generateAsync({ type: 'blob' });
}

export function downloadProjectZip(project: HonkProject): void {
  exportProjectAsZip(project).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedName = (project.name || 'honk-project').toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `${sanitizedName}-honk-export.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
