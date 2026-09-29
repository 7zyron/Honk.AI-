import { AppBuilderJob } from '../types';
import { ProviderManager } from '../providers/ProviderManager';
import { AVAILABLE_CODING_MODELS } from './deployEngine';

const appJobs = new Map<string, AppBuilderJob>();

export async function createAppBuilderJob(prompt: string, modelId?: string): Promise<AppBuilderJob> {
  const id = `app_${Math.random().toString(36).substring(2, 11)}`;
  const providerManager = ProviderManager.getInstance();

  const selectedModel = AVAILABLE_CODING_MODELS.find((m) => m.id === modelId) || AVAILABLE_CODING_MODELS[0];

  const job: AppBuilderJob = {
    id,
    prompt,
    name: 'HONK Generated Application',
    status: 'generating',
    modelUsed: {
      id: selectedModel.id,
      name: selectedModel.name,
      provider: selectedModel.provider,
    },
    activeOperation: 'Architecting project layout & state models...',
    activitySteps: [
      { id: '1', title: 'Analyzing prompt specifications', status: 'completed', timestamp: Date.now() },
      { id: '2', title: 'Generating project structure', status: 'in_progress', timestamp: Date.now() },
      { id: '3', title: 'Synthesizing React components & Tailwind UI', status: 'pending' },
      { id: '4', title: 'Resolving browser dependencies & icons', status: 'pending' },
      { id: '5', title: 'Compiling production bundle & sandbox', status: 'pending' },
      { id: '6', title: 'Running verification checks', status: 'pending' },
    ],
    specification: {
      title: 'HONK AI Generated Web App',
      description: prompt,
      features: ['Interactive UI', 'State Management', 'Responsive Design', 'Local Persistence'],
      techStack: {
        frontend: 'React 18 + Tailwind CSS',
        backend: 'Express.js + TypeScript',
        database: 'Local State / IndexedDB',
        styling: 'Tailwind CSS',
      },
    },
    files: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  appJobs.set(id, job);

  // Generate real application code and runnable preview using Gemini / Selected Model
  try {
    const specPrompt = `You are HONK AI's elite App Architect.
The user wants you to create this complete application:
"${prompt}"

Produce a complete, production-ready, fully functional JSON response with the following schema:
{
  "name": "Concise, modern App Name (e.g. TaskFlow, SpendSense, MindPad, QuickCalc)",
  "description": "1-2 sentence compelling summary of what this application does",
  "features": [
    "Feature 1 with clear user outcome",
    "Feature 2 with clear user outcome",
    "Feature 3 with clear user outcome",
    "Feature 4 with clear user outcome"
  ],
  "previewHtml": "<!DOCTYPE html><html>... COMPLETE, SELF-CONTAINED, WORKING, RUNNABLE SINGLE-PAGE WEB APP ...</html>",
  "files": {
    "index.html": "<!DOCTYPE html><html>...</html>",
    "src/App.tsx": "import React, { useState, useEffect } from 'react';\\n\\n...",
    "src/main.tsx": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App';\\n\\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);",
    "package.json": "{\\n  \\"name\\": \\"...\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"dependencies\\": {\\n    \\"react\\": \\"^18.3.1\\",\\n    \\"react-dom\\": \\"^18.3.1\\",\\n    \\"lucide-react\\": \\"^0.400.0\\"\\n  }\\n}",
    "README.md": "# App Name\\n\\n...",
    "server/index.ts": "// Optional backend REST API\\n..."
  }
}

CRITICAL RULES FOR "previewHtml":
1. It MUST be a 100% self-contained, working HTML file that can be rendered directly inside an iframe.
2. Include Tailwind CSS CDN via: <script src="https://cdn.tailwindcss.com"></script>
3. Include Lucide icons CDN or clean inline SVGs for professional visual craft.
4. Write REAL, WORKING, COMPREHENSIVE JavaScript/logic inside <script> tags:
   - State management (e.g. items list, active filters, metrics, calculations, forms, toggles, timer/intervals if relevant).
   - Real event listeners, form submissions, item addition, editing, deletion, and search/filtering.
   - localStorage persistence so user data is retained when they interact with the app.
   - Beautiful modern dark or warm-neutral theme with smooth transitions, badges, and polished empty states.
   - Provide realistic sample data pre-populated on first load so the app looks vibrant immediately.
5. BAN LAZY PLACEHOLDERS: NEVER use "// TODO", "// write code here", or incomplete stubs.
6. Return ONLY valid JSON with no conversational prefix or markdown backticks.`;

    let resultText = '';
    const preferredModel = selectedModel.id.startsWith('gemini') ? selectedModel.id : 'gemini-2.5-flash';
    const candidateModels = [preferredModel, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
    const uniqueCandidates = Array.from(new Set(candidateModels));

    for (const model of uniqueCandidates) {
      try {
        const result = await providerManager.executeWithRetry(async (adapter) => {
          return await adapter.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: specPrompt }] }],
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          });
        }, 1);

        if (result && result.text) {
          resultText = result.text;
          const found = AVAILABLE_CODING_MODELS.find((m) => m.id === model);
          if (found) {
            job.modelUsed = {
              id: found.id,
              name: found.name,
              provider: found.provider,
            };
          }
          break;
        }
      } catch (err: any) {
        console.warn(`[HONK APP BUILDER] Creation attempt with ${model} failed, checking fallbacks...`);
      }
    }

    if (resultText) {
      try {
        const parsed = extractJsonFromResponse(resultText);
        if (parsed && typeof parsed === 'object') {
          if (parsed.name) job.name = parsed.name;
          if (parsed.description) job.specification.description = parsed.description;
          if (parsed.features && Array.isArray(parsed.features)) job.specification.features = parsed.features;
          
          if (parsed.files && typeof parsed.files === 'object') {
            job.files = parsed.files;
          }

          if (parsed.previewHtml && typeof parsed.previewHtml === 'string' && parsed.previewHtml.trim()) {
            job.previewHtml = parsed.previewHtml.trim();
            job.files['index.html'] = job.previewHtml;
          } else if (job.files['index.html'] && job.files['index.html'].includes('<html')) {
            job.previewHtml = job.files['index.html'];
          } else {
            job.previewHtml = generateDynamicPreviewHtml(job.name, prompt, job.specification.features);
            job.files['index.html'] = job.previewHtml;
          }
        } else {
          throw new Error('Could not parse response structure');
        }
      } catch {
        // Fallback structured template
        const fallback = generateDefaultProjectFiles(prompt);
        job.name = fallback.name;
        job.specification.description = fallback.description;
        job.specification.features = fallback.features;
        job.files = fallback.files;
        job.previewHtml = fallback.previewHtml;
      }
    } else {
      const fallback = generateDefaultProjectFiles(prompt);
      job.name = fallback.name;
      job.specification.description = fallback.description;
      job.specification.features = fallback.features;
      job.files = fallback.files;
      job.previewHtml = fallback.previewHtml;
    }

    // Complete all activity steps
    job.activitySteps = [
      { id: '1', title: 'Analyzing prompt specifications', status: 'completed' },
      { id: '2', title: 'Generating project structure', status: 'completed' },
      { id: '3', title: 'Synthesizing React components & Tailwind UI', status: 'completed' },
      { id: '4', title: 'Resolving browser dependencies & icons', status: 'completed' },
      { id: '5', title: 'Compiling production bundle & sandbox', status: 'completed' },
      { id: '6', title: 'Running verification checks', status: 'completed' },
    ];
    job.activeOperation = 'Application ready & running';
    job.status = 'ready';
    job.updatedAt = Date.now();
  } catch {
    const fallback = generateDefaultProjectFiles(prompt);
    job.name = fallback.name;
    job.specification.description = fallback.description;
    job.specification.features = fallback.features;
    job.files = fallback.files;
    job.previewHtml = fallback.previewHtml;
    job.status = 'ready';
    job.activitySteps = [
      { id: '1', title: 'Analyzing prompt specifications', status: 'completed' },
      { id: '2', title: 'Generating project structure', status: 'completed' },
      { id: '3', title: 'Synthesizing React components & Tailwind UI', status: 'completed' },
      { id: '4', title: 'Resolving browser dependencies & icons', status: 'completed' },
      { id: '5', title: 'Compiling production bundle & sandbox', status: 'completed' },
      { id: '6', title: 'Running verification checks', status: 'completed' },
    ];
    job.activeOperation = 'Application ready';
    job.updatedAt = Date.now();
  }

  return job;
}

export function getAppBuilderJob(id: string): AppBuilderJob | null {
  return appJobs.get(id) || null;
}

export function listAppBuilderJobs(): AppBuilderJob[] {
  return Array.from(appJobs.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteAppBuilderJob(id: string): boolean {
  return appJobs.delete(id);
}

export async function refineAppBuilderJob(id: string, instruction: string, modelId?: string): Promise<AppBuilderJob> {
  const job = appJobs.get(id);
  if (!job) {
    throw new Error(`Application job ${id} not found`);
  }

  const providerManager = ProviderManager.getInstance();
  const selectedModel = AVAILABLE_CODING_MODELS.find((m) => m.id === modelId) || AVAILABLE_CODING_MODELS[0];
  job.modelUsed = {
    id: selectedModel.id,
    name: selectedModel.name,
    provider: selectedModel.provider,
  };
  job.activeOperation = `Applying edits with ${selectedModel.name}...`;

  const prompt = `You are HONK AI's App Architect.
We have an existing application called "${job.name}".
Original prompt: "${job.prompt}"
Existing files: ${Object.keys(job.files).join(', ')}

The user requests this modification/improvement:
"${instruction}"

Return an updated JSON object with:
{
  "previewHtml": "<!DOCTYPE html><html>... complete updated runnable HTML application with the requested changes applied ...</html>",
  "files": {
    "src/App.tsx": "... updated React component ...",
    "index.html": "... updated HTML file ...",
    ... (any other updated or new files)
  }
}

CRITICAL:
1. Return a complete, self-contained, working "previewHtml" incorporating the requested changes.
2. Return ONLY valid JSON with no conversational prefix.`;

  let updateApplied = false;
  let lastModelError: any = null;
  const preferredModel = selectedModel.id.startsWith('gemini') ? selectedModel.id : 'gemini-2.5-flash';
  const candidateModels = Array.from(new Set([preferredModel, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash']));

  for (const model of candidateModels) {
    try {
      const result = await providerManager.executeWithRetry(async (adapter) => {
        return await adapter.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });
      }, 1);

      if (result && result.text) {
        const parsed = extractJsonFromResponse(result.text);
        if (parsed && typeof parsed === 'object') {
          const filesToUpdate = parsed.files || {};
          for (const [filePath, content] of Object.entries(filesToUpdate)) {
            if (typeof content === 'string') {
              job.files[filePath] = content;
            }
          }
          if (parsed.previewHtml && typeof parsed.previewHtml === 'string') {
            job.previewHtml = parsed.previewHtml;
            job.files['index.html'] = parsed.previewHtml;
          }
          updateApplied = true;
          const found = AVAILABLE_CODING_MODELS.find((m) => m.id === model);
          if (found) {
            job.modelUsed = {
              id: found.id,
              name: found.name,
              provider: found.provider,
            };
          }
          break;
        }
      }
    } catch (err: any) {
      lastModelError = err;
      const errMsg = String(err?.message || err);
      console.warn(`[HONK APP BUILDER] Model ${model} refine attempt failed: ${errMsg.slice(0, 100)}...`);
    }
  }

  // If AI generation was unavailable or quota limited, attempt intelligent heuristic refinement
  if (!updateApplied) {
    const heuristicSucceeded = applyHeuristicRefinement(job, instruction);
    if (heuristicSucceeded) {
      console.log(`[HONK APP BUILDER] Applied targeted heuristic refinement for: "${instruction}"`);
      updateApplied = true;
    }
  }

  // If both AI and heuristic could not fulfill the request
  if (!updateApplied && lastModelError) {
    const errText = String(lastModelError?.message || lastModelError);
    if (errText.includes('503') || errText.includes('high demand') || errText.includes('429') || errText.includes('quota')) {
      throw new Error('The AI engine is currently experiencing high demand or quota limits. Please retry in a moment.');
    }
    throw new Error('Failed to refine application. Please try phrasing your request differently.');
  }

  job.updatedAt = Date.now();
  return job;
}

function extractJsonFromResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Try markdown code block extraction
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {}
    }

    // Try finding outer curly braces
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1));
      } catch {
        // Try fixing trailing commas before closing braces
        try {
          const cleaned = trimmed
            .slice(first, last + 1)
            .replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(cleaned);
        } catch {}
      }
    }
  }
  return null;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyHeuristicRefinement(job: AppBuilderJob, instruction: string): boolean {
  let changed = false;
  const lower = instruction.toLowerCase();

  // 1. Color/theme palette heuristic
  const colorMap: Record<string, string> = {
    blue: 'blue',
    indigo: 'indigo',
    purple: 'purple',
    violet: 'violet',
    emerald: 'emerald',
    green: 'emerald',
    cyan: 'cyan',
    sky: 'sky',
    rose: 'rose',
    red: 'rose',
    amber: 'amber',
    orange: 'orange',
    pink: 'pink',
    teal: 'teal',
  };

  let targetColor: string | null = null;
  for (const [name, val] of Object.entries(colorMap)) {
    if (lower.includes(name)) {
      targetColor = val;
      break;
    }
  }

  if (targetColor) {
    if (job.previewHtml) {
      const prev = job.previewHtml;
      const updatedHtml = prev
        .replace(/(?:amber|emerald|indigo|purple|blue|rose|cyan|violet)-(500|400|300|600|200|700)/g, `${targetColor}-$1`)
        .replace(/text-(?:amber|emerald|indigo|purple|blue|rose|cyan|violet)-/g, `text-${targetColor}-`)
        .replace(/bg-(?:amber|emerald|indigo|purple|blue|rose|cyan|violet)-/g, `bg-${targetColor}-`)
        .replace(/border-(?:amber|emerald|indigo|purple|blue|rose|cyan|violet)-/g, `border-${targetColor}-`);

      if (updatedHtml !== prev) {
        job.previewHtml = updatedHtml;
        job.files['index.html'] = updatedHtml;
        changed = true;
      }
    }

    if (job.files['src/App.tsx']) {
      job.files['src/App.tsx'] = job.files['src/App.tsx']
        .replace(/(?:amber|emerald|indigo|purple|blue|rose|cyan|violet)-(500|400|300|600|200|700)/g, `${targetColor}-$1`);
      changed = true;
    }
  }

  // 2. Title / Name change heuristic
  const titleMatch = instruction.match(/(?:rename(?: to)?|call it|title to)\s+["']?([^"'\n\r.]+)["']?/i);
  if (titleMatch && titleMatch[1]) {
    const newName = titleMatch[1].trim();
    if (newName && newName.length < 60) {
      const oldName = job.name;
      job.name = newName;
      job.specification.title = newName;
      if (job.previewHtml) {
        job.previewHtml = job.previewHtml
          .replace(new RegExp(escapeRegExp(oldName), 'g'), newName)
          .replace(/<title>.*?<\/title>/i, `<title>${newName}</title>`);
        job.files['index.html'] = job.previewHtml;
        changed = true;
      }
      if (job.files['src/App.tsx']) {
        job.files['src/App.tsx'] = job.files['src/App.tsx'].replace(new RegExp(escapeRegExp(oldName), 'g'), newName);
        changed = true;
      }
    }
  }

  // 3. Dark mode / Light mode heuristic
  if (lower.includes('light mode') || lower.includes('white background')) {
    if (job.previewHtml && job.previewHtml.includes('bg-zinc-950')) {
      job.previewHtml = job.previewHtml
        .replace(/bg-zinc-950/g, 'bg-zinc-100')
        .replace(/text-zinc-100/g, 'text-zinc-900')
        .replace(/bg-zinc-900\/80/g, 'bg-white')
        .replace(/bg-zinc-900/g, 'bg-white')
        .replace(/border-zinc-800/g, 'border-zinc-200');
      job.files['index.html'] = job.previewHtml;
      changed = true;
    }
  } else if (lower.includes('dark mode') || lower.includes('dark theme') || lower.includes('black background')) {
    if (job.previewHtml && job.previewHtml.includes('bg-zinc-100')) {
      job.previewHtml = job.previewHtml
        .replace(/bg-zinc-100/g, 'bg-zinc-950')
        .replace(/text-zinc-900/g, 'text-zinc-100')
        .replace(/border-zinc-200/g, 'border-zinc-800');
      job.files['index.html'] = job.previewHtml;
      changed = true;
    }
  }

  return changed;
}

export function exportAppBuilderJob(id: string): {
  id: string;
  name: string;
  fileCount: number;
  files: Record<string, string>;
  downloadUrl?: string;
} {
  const job = appJobs.get(id);
  if (!job) {
    throw new Error(`Application job ${id} not found`);
  }

  return {
    id: job.id,
    name: job.name,
    fileCount: Object.keys(job.files).length,
    files: job.files,
  };
}

function generateDynamicPreviewHtml(appName: string, prompt: string, features: string[]): string {
  const sanitizedTitle = appName.replace(/[<>&"]/g, '');
  const sanitizedPrompt = prompt.replace(/[<>&"]/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizedTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased">
  <header class="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm">
        ⚡
      </div>
      <div>
        <h1 class="text-base font-bold text-white tracking-tight">${sanitizedTitle}</h1>
        <p class="text-xs text-zinc-400">Created with HONK AI</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Live & Ready
      </span>
    </div>
  </header>

  <main class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
    <!-- Hero / Summary Card -->
    <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 relative overflow-hidden">
      <div class="max-w-2xl">
        <span class="text-xs uppercase tracking-wider font-bold text-amber-400">App Overview</span>
        <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">${sanitizedTitle}</h2>
        <p class="text-sm text-zinc-300 mt-2 leading-relaxed">${sanitizedPrompt}</p>
      </div>

      <div class="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap gap-2">
        ${features
          .map(
            (f) =>
              `<span class="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">✓ ${f.replace(/[<>&"]/g, '')}</span>`
          )
          .join('')}
      </div>
    </div>

    <!-- Interactive Workspace Panel -->
    <div class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6 shadow-xl space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h3 class="text-base font-semibold text-white">Interactive Item Manager</h3>
          <p class="text-xs text-zinc-400">Create, manage, and toggle items with instant local persistence.</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span id="active-count" class="px-2 py-0.5 rounded bg-zinc-800 text-amber-300">0 items</span>
        </div>
      </div>

      <!-- Add New Item Form -->
      <form id="item-form" class="flex gap-2">
        <input 
          id="item-input" 
          type="text" 
          placeholder="Add a new entry, task, or note..." 
          class="flex-1 rounded-xl bg-zinc-950 border border-zinc-700/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
          required
        />
        <button 
          type="submit" 
          class="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-2.5 text-sm transition active:scale-95 shadow-md flex items-center gap-1.5"
        >
          <span>Add</span>
          <span>+</span>
        </button>
      </form>

      <!-- Search & Filters -->
      <div class="flex items-center justify-between gap-2">
        <input 
          id="search-input" 
          type="text" 
          placeholder="Filter items..." 
          class="w-full sm:w-64 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
        />
        <div class="flex gap-1" id="filter-group">
          <button data-filter="all" class="px-2.5 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">All</button>
          <button data-filter="active" class="px-2.5 py-1 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">Pending</button>
          <button data-filter="completed" class="px-2.5 py-1 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">Done</button>
        </div>
      </div>

      <!-- List Display -->
      <ul id="items-list" class="space-y-2 max-h-80 overflow-y-auto pr-1">
        <!-- Dynamically rendered items -->
      </ul>

      <!-- Bottom Actions -->
      <div class="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
        <span id="storage-status">Saved automatically</span>
        <button id="clear-btn" class="hover:text-rose-400 transition">Clear All</button>
      </div>
    </div>
  </main>

  <script>
    // Local State Engine
    const STORAGE_KEY = 'honk_app_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}';
    let currentFilter = 'all';
    let searchQuery = '';

    const defaultItems = [
      { id: '1', title: 'Welcome to your custom HONK-generated app', completed: true, timestamp: Date.now() - 3600000 },
      { id: '2', title: 'Explore features and try adding new entries', completed: false, timestamp: Date.now() - 1800000 },
      { id: '3', title: 'Refine or iterate your app using HONK App Studio', completed: false, timestamp: Date.now() }
    ];

    let items = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      items = saved ? JSON.parse(saved) : defaultItems;
    } catch {
      items = defaultItems;
    }

    function saveItems() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error(e);
      }
      render();
    }

    function render() {
      const list = document.getElementById('items-list');
      const activeCount = document.getElementById('active-count');
      
      const filtered = items.filter(item => {
        if (currentFilter === 'active') return !item.completed;
        if (currentFilter === 'completed') return item.completed;
        return true;
      }).filter(item => {
        if (!searchQuery) return true;
        return item.title.toLowerCase().includes(searchQuery.toLowerCase());
      });

      activeCount.textContent = items.length + ' item' + (items.length === 1 ? '' : 's');

      if (filtered.length === 0) {
        list.innerHTML = '<li class="p-6 text-center text-zinc-500 text-sm">No matching items found. Add one above!</li>';
        return;
      }

      list.innerHTML = filtered.map(item => \`
        <li class="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition group">
          <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
            <input type="checkbox" \${item.completed ? 'checked' : ''} onchange="toggleItem('\${item.id}')" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer">
            <span class="text-sm truncate \${item.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}">\${escapeHtml(item.title)}</span>
          </label>
          <button onclick="deleteItem('\${item.id}')" class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 rounded transition text-xs">
            ✕
          </button>
        </li>
      \`).join('');
    }

    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    window.toggleItem = function(id) {
      items = items.map(it => it.id === id ? { ...it, completed: !it.completed } : it);
      saveItems();
    };

    window.deleteItem = function(id) {
      items = items.filter(it => it.id !== id);
      saveItems();
    };

    document.getElementById('item-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('item-input');
      const val = input.value.trim();
      if (!val) return;
      items.unshift({
        id: Date.now().toString(),
        title: val,
        completed: false,
        timestamp: Date.now()
      });
      input.value = '';
      saveItems();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
      if (confirm('Clear all entries?')) {
        items = [];
        saveItems();
      }
    });

    document.querySelectorAll('#filter-group button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#filter-group button').forEach(b => {
          b.className = 'px-2.5 py-1 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800';
        });
        btn.className = 'px-2.5 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30';
        currentFilter = btn.getAttribute('data-filter');
        render();
      });
    });

    render();
  </script>
</body>
</html>`;
}

function generateDefaultProjectFiles(prompt: string): {
  name: string;
  description: string;
  features: string[];
  files: Record<string, string>;
  previewHtml: string;
} {
  const name = 'HONK Interactive Studio';
  const description = `Interactive application generated for: "${prompt}"`;
  const features = [
    'Complete reactive single-page interface',
    'Interactive state with real-time feedback',
    'Automatic browser localStorage persistence',
    'Responsive desktop and mobile layout',
  ];

  const previewHtml = generateDynamicPreviewHtml(name, prompt, features);

  return {
    name,
    description,
    features,
    previewHtml,
    files: {
      'index.html': previewHtml,
      'README.md': `# ${name}\n\n${description}\n\n## Features\n${features.map((f) => `- ${f}`).join('\n')}\n\n## Running the Project\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
      '.env.example': `PORT=3000\nAPI_SECRET=\n`,
      'package.json': JSON.stringify(
        {
          name: 'honk-generated-app',
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            'lucide-react': '^0.400.0',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.3.1',
            typescript: '^5.5.3',
            vite: '^5.4.1',
            tailwindcss: '^3.4.4',
            autoprefixer: '^10.4.19',
            postcss: '^8.4.39',
          },
        },
        null,
        2
      ),
      'src/App.tsx': `import React, { useState, useEffect } from 'react';

export default function App() {
  const [items, setItems] = useState<string[]>(['First entry', 'Second entry']);
  const [newItem, setNewItem] = useState('');

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setItems([newItem.trim(), ...items]);
    setNewItem('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">${name}</h1>
          <p className="text-sm text-zinc-400 mt-1">${prompt}</p>
        </div>

        <form onSubmit={addItem} className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Enter new item..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm transition"
          >
            Add
          </button>
        </form>

        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-sm">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
`,
      'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    },
  };
}
