import { AppBuilderJob, DeploymentRecord } from '../types';
import { defaultImporterRegistry, ImportPayload, ImportResult, HonkProject } from './imports';
import { saveStoredProject, getStoredProjects, deleteStoredProject } from './projectStorage';
import { applyTechnicalSeoOptimization } from './seoAnalyzer';

const LOCAL_STORAGE_KEY = 'honk_created_apps_cache';

export interface CodingModelOption {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  category: string;
  isDefault?: boolean;
}

export async function fetchCodingModels(): Promise<{ models: CodingModelOption[]; defaultModel: string }> {
  try {
    const res = await fetch('/api/app-builder/models');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch coding models, using defaults', err);
  }
  return {
    models: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'Google Gemini',
        tagline: 'Ultra-fast sub-second generation & precision coding',
        category: 'ultra-fast',
        isDefault: true,
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        provider: 'Google Gemini',
        tagline: 'High-speed lightweight syntax & structure builder',
        category: 'lite',
        isDefault: false,
      },
      {
        id: 'kimi-k2.7-code',
        name: 'Kimi K2.7 Code',
        provider: 'Moonshot AI / Cerebras',
        tagline: 'Long-context algorithmic code generation & refactoring',
        category: 'code',
        isDefault: false,
      },
      {
        id: 'honk-pro-reasoning',
        name: 'Honk Pro Architect (Gemini 3.1 Pro)',
        provider: 'Google Gemini',
        tagline: 'Deep architectural verification & error repair engine',
        category: 'reasoning',
        isDefault: false,
      },
    ],
    defaultModel: 'gemini-2.5-flash',
  };
}

export async function createApplication(prompt: string, modelId?: string): Promise<AppBuilderJob> {
  const res = await fetch('/api/app-builder/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, modelId }),
  });

  if (!res.ok) {
    let errMessage = 'Failed to generate application';
    try {
      const data = await res.json();
      if (data.error) errMessage = data.error;
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }

  const job: AppBuilderJob = await res.json();
  saveJobToLocalCache(job);
  return job;
}

export async function refineApplication(id: string, instruction: string, modelId?: string): Promise<AppBuilderJob> {
  const res = await fetch('/api/app-builder/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, instruction, modelId }),
  });

  if (!res.ok) {
    let errMessage = 'Failed to update application';
    try {
      const data = await res.json();
      if (data.error) errMessage = data.error;
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }

  const job: AppBuilderJob = await res.json();
  saveJobToLocalCache(job);
  return job;
}

export async function publishApplication(payload: {
  projectId?: string;
  name?: string;
  description?: string;
  files: Record<string, string>;
  previewHtml?: string;
  customSlug?: string;
  modelId?: string;
}): Promise<{
  success: boolean;
  deployment: DeploymentRecord;
  url: string;
  liveUrl: string;
}> {
  const res = await fetch('/api/app-builder/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errMsg = 'Failed to publish application';
    try {
      const data = await res.json();
      if (data.error) errMsg = data.error;
    } catch {}
    throw new Error(errMsg);
  }

  return await res.json();
}

export async function fetchDeployments(): Promise<DeploymentRecord[]> {
  try {
    const res = await fetch('/api/app-builder/deployments');
    if (res.ok) {
      const data = await res.json();
      return data.deployments || [];
    }
  } catch (err) {
    console.warn('Failed to fetch deployments', err);
  }
  return [];
}

export async function deleteDeploymentRecord(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/app-builder/deployments/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function importProjectAnywhere(payload: ImportPayload): Promise<ImportResult> {
  const result = await defaultImporterRegistry.importProject(payload);
  if (result.success && result.project) {
    saveStoredProject(result.project);
  }
  return result;
}

export async function repairProjectWithAi(
  files: Record<string, string>,
  errorDiagnostics: string,
  userNote?: string
): Promise<{
  updatedFiles: Record<string, string>;
  changesSummary: string[];
  resolvedPreviewHtml?: string;
}> {
  const res = await fetch('/api/app-builder/repair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files,
      errors: errorDiagnostics,
      description: userNote,
    }),
  });

  if (!res.ok) {
    let errMsg = 'AI repair request failed';
    try {
      const data = await res.json();
      if (data.error) errMsg = data.error;
    } catch {}
    throw new Error(errMsg);
  }

  return await res.json();
}

export function optimizeProjectSeo(
  project: HonkProject
): HonkProject {
  const updatedFiles = applyTechnicalSeoOptimization(
    project.files,
    project.name,
    project.description
  );

  const updatedProject: HonkProject = {
    ...project,
    files: updatedFiles,
    previewHtml: updatedFiles['index.html'] || project.previewHtml,
    updatedAt: Date.now(),
  };

  saveStoredProject(updatedProject);
  return updatedProject;
}

export async function fetchApplication(id: string): Promise<AppBuilderJob | null> {
  try {
    const res = await fetch(`/api/app-builder/jobs/${id}`);
    if (!res.ok) {
      // Check local cache
      const cached = getCachedJobs().find((j) => j.id === id);
      return cached || null;
    }
    const job: AppBuilderJob = await res.json();
    saveJobToLocalCache(job);
    return job;
  } catch {
    const cached = getCachedJobs().find((j) => j.id === id);
    return cached || null;
  }
}

export async function fetchRecentApplications(): Promise<AppBuilderJob[]> {
  try {
    const res = await fetch('/api/app-builder/jobs');
    if (res.ok) {
      const serverJobs: AppBuilderJob[] = await res.json();
      if (Array.isArray(serverJobs) && serverJobs.length > 0) {
        const local = getCachedJobs();
        const map = new Map<string, AppBuilderJob>();
        serverJobs.forEach((j) => map.set(j.id, j));
        local.forEach((j) => {
          if (!map.has(j.id)) map.set(j.id, j);
        });
        const merged = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch jobs from server, using local cache', err);
  }
  return getCachedJobs();
}

export async function deleteApplication(id: string): Promise<void> {
  try {
    await fetch(`/api/app-builder/jobs/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Error calling delete API', e);
  }
  const filtered = getCachedJobs().filter((j) => j.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  deleteStoredProject(id);
}

function getCachedJobs(): AppBuilderJob[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveJobToLocalCache(job: AppBuilderJob) {
  try {
    const current = getCachedJobs().filter((j) => j.id !== job.id);
    current.unshift(job);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current.slice(0, 30)));
  } catch {
    // ignore
  }
}
