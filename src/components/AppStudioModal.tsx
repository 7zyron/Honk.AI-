import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Code2,
  Eye,
  FileText,
  RotateCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  Send,
  Plus,
  FolderCode,
  Layers,
  CheckCircle2,
  AlertCircle,
  History,
  Trash2,
  Upload,
  Boxes,
  UploadCloud,
  Globe,
  Activity,
  Cpu,
} from 'lucide-react';
import { AppBuilderJob, DeploymentRecord } from '../types';
import { HonkProject } from '../lib/imports/types';
import { HonkLogo } from './HonkLogo';
import {
  createApplication,
  refineApplication,
  fetchRecentApplications,
  deleteApplication,
} from '../lib/appBuilderService';
import { AICodingIndicator } from './AICodingIndicator';
import { LiveActivityPanel, ActivityTaskStep } from './LiveActivityPanel';
import { PublishModal } from './developer/PublishModal';

interface AppStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onOpenImportModal?: () => void;
  onOpenStudio?: (project: HonkProject) => void;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';
type ActiveTab = 'preview' | 'code' | 'specs' | 'activity';

const STARTER_PROMPTS = [
  {
    title: 'Habit & Daily Streak Tracker',
    prompt: 'Create a clean, responsive habit tracker with streak counters, completion checkboxes, daily progress ring, and categories.',
    icon: '🔥',
  },
  {
    title: 'Personal Budget & Expense Log',
    prompt: 'Build a personal finance tracker where I can log income/expenses, filter by category, see total savings, and view a visual breakdown.',
    icon: '💰',
  },
  {
    title: 'Focus Pomodoro & Sound Session',
    prompt: 'Build a minimalist Pomodoro timer with 25/5 min cycles, session progress bar, task checklist, and sound notification toggle.',
    icon: '⏱️',
  },
  {
    title: 'Flashcard Quiz & Memory Booster',
    prompt: 'Create an interactive flashcard quiz app with flip animations, know/unsure buttons, score tracker, and custom card creator.',
    icon: '🧠',
  },
  {
    title: 'Kanban Task Board',
    prompt: 'Build a visual Kanban board with To Do, In Progress, and Done columns, drag-and-drop or column move buttons, priority tags, and search.',
    icon: '📋',
  },
  {
    title: 'Markdown Note Taking Studio',
    prompt: 'Create a split-screen live Markdown editor with instant preview, word count, dark mode styling, and download as .md file.',
    icon: '📝',
  },
];

export const AppStudioModal: React.FC<AppStudioModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  onOpenImportModal,
  onOpenStudio,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [currentJob, setCurrentJob] = useState<AppBuilderJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [selectedFile, setSelectedFile] = useState<string>('src/App.tsx');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);
  const [recentJobs, setRecentJobs] = useState<AppBuilderJob[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Model & Publishing States
  const [activeModelId, setActiveModelId] = useState<string>('gemini-2.5-flash');
  const [activeModelInfo, setActiveModelInfo] = useState({
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google Gemini',
  });
  const [aiCodingStatus, setAiCodingStatus] = useState<'idle' | 'working' | 'generating' | 'refining' | 'repairing' | 'published'>('idle');
  const [activeOperation, setActiveOperation] = useState<string>('Ready');
  const [codingStartTime, setCodingStartTime] = useState<number | undefined>(undefined);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [latestDeployment, setLatestDeployment] = useState<DeploymentRecord | null>(null);
  const [activitySteps, setActivitySteps] = useState<ActivityTaskStep[]>([
    { id: '1', title: 'Analyzing request specifications', status: 'completed' },
    { id: '2', title: 'Synthesizing application structure', status: 'pending' },
    { id: '3', title: 'Writing React components & interactive state', status: 'pending' },
    { id: '4', title: 'Bundling standalone sandbox & styles', status: 'pending' },
  ]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync initialPrompt if provided
  useEffect(() => {
    if (initialPrompt && !currentJob) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Load recent applications
  useEffect(() => {
    if (isOpen) {
      fetchRecentApplications().then((jobs) => {
        setRecentJobs(jobs);
        if (!currentJob && jobs.length > 0 && !initialPrompt) {
          // Keep prompt screen open by default or show latest
        }
      });
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating && !isRefining && !isPublishModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, isRefining, isPublishModalOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateApp = async (promptToUse?: string) => {
    const targetPrompt = (promptToUse || prompt).trim();
    if (!targetPrompt) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setAiCodingStatus('generating');
    setActiveOperation(`Architecting "${targetPrompt.slice(0, 30)}..."`);
    setCodingStartTime(Date.now());
    setGenerationStep('Architecting application structure & UI layout...');

    setActivitySteps([
      { id: '1', title: 'Analyzing prompt specifications', status: 'completed' },
      { id: '2', title: `Generating project structure with ${activeModelInfo.name}`, status: 'in_progress' },
      { id: '3', title: 'Synthesizing React components & Tailwind UI', status: 'pending' },
      { id: '4', title: 'Resolving browser dependencies & icons', status: 'pending' },
      { id: '5', title: 'Compiling production sandbox & testing runtime', status: 'pending' },
    ]);

    const stepTimer1 = setTimeout(() => {
      setGenerationStep('Writing React components & interactive state...');
      setActivitySteps((prev) =>
        prev.map((s, idx) =>
          idx === 1 ? { ...s, status: 'completed' } : idx === 2 ? { ...s, status: 'in_progress' } : s
        )
      );
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Compiling live preview bundle & styles...');
      setActivitySteps((prev) =>
        prev.map((s, idx) =>
          idx <= 2 ? { ...s, status: 'completed' } : idx === 3 ? { ...s, status: 'in_progress' } : s
        )
      );
    }, 2800);

    try {
      const job = await createApplication(targetPrompt, activeModelId);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setCurrentJob(job);
      setActiveTab('preview');
      setAiCodingStatus('idle');
      setActiveOperation('Ready');
      
      setActivitySteps([
        { id: '1', title: 'Analyzing prompt specifications', status: 'completed' },
        { id: '2', title: `Generated project structure with ${activeModelInfo.name}`, status: 'completed' },
        { id: '3', title: 'Synthesized React components & Tailwind UI', status: 'completed' },
        { id: '4', title: 'Resolved browser dependencies & icons', status: 'completed' },
        { id: '5', title: 'Compiled production sandbox & verified runtime', status: 'completed' },
      ]);

      // Set initial selected file
      const files = Object.keys(job.files || {});
      if (files.includes('src/App.tsx')) setSelectedFile('src/App.tsx');
      else if (files.includes('index.html')) setSelectedFile('index.html');
      else if (files.length > 0) setSelectedFile(files[0]);

      // Update recent list
      const updatedRecent = await fetchRecentApplications();
      setRecentJobs(updatedRecent);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAiCodingStatus('idle');
      setActiveOperation('Error encountered');
      setErrorMessage(err.message || 'Failed to generate application. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
      setCodingStartTime(undefined);
    }
  };

  const handleRefineApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !refineInstruction.trim() || isRefining) return;

    const instruction = refineInstruction.trim();
    setRefineInstruction('');
    setIsRefining(true);
    setErrorMessage(null);
    setAiCodingStatus('refining');
    setActiveOperation(`Applying: "${instruction.slice(0, 30)}..."`);
    setCodingStartTime(Date.now());

    setActivitySteps([
      { id: '1', title: `Processing edit: "${instruction.slice(0, 35)}"`, status: 'in_progress' },
      { id: '2', title: `Synthesizing code edits via ${activeModelInfo.name}`, status: 'pending' },
      { id: '3', title: 'Updating AST & hot-reloading iframe', status: 'pending' },
    ]);

    try {
      const updated = await refineApplication(currentJob.id, instruction, activeModelId);
      setCurrentJob({ ...updated });
      // Reload iframe
      if (iframeRef.current && updated.previewHtml) {
        iframeRef.current.srcdoc = updated.previewHtml;
      }
      setAiCodingStatus('idle');
      setActiveOperation('Ready');
      setActivitySteps([
        { id: '1', title: `Processed edit: "${instruction.slice(0, 35)}"`, status: 'completed' },
        { id: '2', title: `Synthesized code edits via ${activeModelInfo.name}`, status: 'completed' },
        { id: '3', title: 'Updated AST & hot-reloaded preview', status: 'completed' },
      ]);
      const updatedRecent = await fetchRecentApplications();
      setRecentJobs(updatedRecent);
    } catch (err: any) {
      setAiCodingStatus('idle');
      setActiveOperation('Error encountered');
      setErrorMessage(err.message || 'Failed to update application');
    } finally {
      setIsRefining(false);
      setCodingStartTime(undefined);
    }
  };

  const handleCopyCode = () => {
    if (!currentJob || !selectedFile) return;
    const content = currentJob.files[selectedFile] || '';
    navigator.clipboard.writeText(content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadApp = () => {
    if (!currentJob) return;
    // Export single combined package or HTML
    const content = currentJob.previewHtml || currentJob.files['index.html'] || currentJob.files['src/App.tsx'] || '';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentJob.name || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    if (!currentJob) return;
    const content = currentJob.previewHtml || currentJob.files['index.html'] || '';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRefreshPreview = () => {
    if (iframeRef.current && currentJob?.previewHtml) {
      iframeRef.current.srcdoc = '';
      setTimeout(() => {
        if (iframeRef.current && currentJob?.previewHtml) {
          iframeRef.current.srcdoc = currentJob.previewHtml;
        }
      }, 50);
    }
  };

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteApplication(id);
    const updated = recentJobs.filter((j) => j.id !== id);
    setRecentJobs(updated);
    if (currentJob?.id === id) {
      if (updated.length > 0) setCurrentJob(updated[0]);
      else setCurrentJob(null);
    }
  };

  const getViewportClass = () => {
    switch (viewport) {
      case 'mobile':
        return 'w-[390px] h-[720px] rounded-3xl border-4 border-zinc-800 shadow-2xl overflow-hidden my-auto';
      case 'tablet':
        return 'w-[768px] h-full rounded-2xl border-2 border-zinc-800 shadow-xl overflow-hidden';
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div
      id="app-studio-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        id="app-studio-modal-container"
        className="relative flex flex-col w-full h-[95vh] max-w-7xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/60 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <HonkLogo size="sm" glow alt="Honk App Studio Logo" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {currentJob ? currentJob.name : 'Honk App Studio'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  ⚡ Honk Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">
                {currentJob ? currentJob.specification.description : 'Create full-stack, interactive web applications on demand'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* AI Coding Indicator */}
            <AICodingIndicator
              currentModel={activeModelInfo}
              status={aiCodingStatus}
              operation={activeOperation}
              startTime={codingStartTime}
              onSelectModel={(modelId) => {
                setActiveModelId(modelId);
                const names: Record<string, { name: string; provider: string }> = {
                  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google Gemini' },
                  'gemini-3.1-flash-lite': { name: 'Gemini 3.1 Flash-Lite', provider: 'Google Gemini' },
                  'gemini-3.8-flash': { name: 'Gemini 3.8 Flash', provider: 'Google Gemini' },
                  'kimi-k2.7-code': { name: 'Kimi K2.7 Code', provider: 'Moonshot AI / Cerebras' },
                  'honk-pro-reasoning': { name: 'Honk Pro Architect', provider: 'Google Gemini' },
                };
                if (names[modelId]) {
                  setActiveModelInfo({ id: modelId, ...names[modelId] });
                }
              }}
            />

            {/* Real PUBLISH Button (when job is active) */}
            {currentJob && (
              <button
                id="app-studio-publish-btn"
                type="button"
                onClick={() => setIsPublishModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs transition active:scale-95 shadow-lg shadow-emerald-500/20 border border-emerald-400/40"
                title="Publish Live Application to HONK Edge CDN"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>PUBLISH</span>
              </button>
            )}

            {/* Recent Apps History Dropdown */}
            {recentJobs.length > 0 && (
              <div className="relative">
                <button
                  id="app-studio-history-btn"
                  type="button"
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition"
                  title="Previous generated apps"
                >
                  <History className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden md:inline">My Apps ({recentJobs.length})</span>
                </button>

                {showHistoryDropdown && (
                  <div className="absolute right-0 mt-2 w-72 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl z-50 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Saved Applications
                    </div>
                    {recentJobs.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => {
                          setCurrentJob(j);
                          setShowHistoryDropdown(false);
                        }}
                        className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                          currentJob?.id === j.id
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'hover:bg-zinc-800/80 text-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-semibold truncate">{j.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{new Date(j.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteJob(j.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                          title="Delete app"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New App Button */}
            {currentJob && (
              <button
                id="app-studio-new-btn"
                type="button"
                onClick={() => {
                  setCurrentJob(null);
                  setPrompt('');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New App</span>
              </button>
            )}

            {/* Import App Button */}
            {onOpenImportModal && (
              <button
                id="app-studio-import-app-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImportModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition shadow-sm"
                title="Import existing project from GitHub, ZIP, URL, or AI builders"
              >
                <Upload className="h-3.5 w-3.5 text-amber-400" />
                <span>Import App</span>
              </button>
            )}

            {/* Close Modal Button */}
            <button
              id="app-studio-close-btn"
              type="button"
              onClick={onClose}
              disabled={isGenerating || isRefining}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        {!currentJob ? (
          /* INITIAL PROMPT / CREATE SCREEN */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
            <div className="text-center space-y-3 mb-6">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-xl mb-1">
                <FolderCode className="h-7 w-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                What would you like Honk to build?
              </h1>
              <p className="text-sm text-zinc-400 max-w-lg mx-auto">
                Honk AI uses its backend intelligence to architect, code, and launch a complete, interactive, self-contained application in seconds.
              </p>
            </div>

            {/* Prompt Input Form */}
            <div className="w-full space-y-4">
              <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 transition p-3 sm:p-4">
                <textarea
                  id="app-studio-prompt-input"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your app in plain words (e.g. 'Build a Pomodoro timer with task checklist, sound cues, and session analytics' or 'Create a split-wise bill divider with tip calculation and currency toggle')..."
                  className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
                  disabled={isGenerating}
                />

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                  <div className="text-xs text-zinc-500">
                    {isGenerating ? (
                      <span className="flex items-center gap-2 text-amber-400 font-medium">
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        {generationStep}
                      </span>
                    ) : (
                      <span>Generates full React + Tailwind code with live interactive runner</span>
                    )}
                  </div>

                  <button
                    id="app-studio-submit-btn"
                    type="button"
                    onClick={() => handleCreateApp()}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold px-5 py-2.5 text-sm transition active:scale-95 disabled:opacity-50 shadow-lg cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        <span>Building...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Create Application</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Starter Ideas Grid */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Or pick an instant starter template:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {STARTER_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(item.prompt);
                        handleCreateApp(item.prompt);
                      }}
                      disabled={isGenerating}
                      className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-amber-500/40 text-left transition active:scale-[0.98] group cursor-pointer"
                    >
                      <span className="text-xl shrink-0 p-1 rounded-lg bg-zinc-800/80 group-hover:scale-110 transition">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 transition">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* WORKSPACE VIEW (LIVE PREVIEW, CODE, SPECS & REFINE BAR) */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/40 shrink-0">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'code'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Code & Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'specs'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Specification</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'activity'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Live Activity</span>
                </button>
              </div>

              {/* Viewport & Utility Actions */}
              <div className="flex items-center gap-2">
                {activeTab === 'preview' && (
                  <div className="hidden sm:flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setViewport('desktop')}
                      className={`p-1.5 rounded transition ${viewport === 'desktop' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Desktop viewport"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewport('tablet')}
                      className={`p-1.5 rounded transition ${viewport === 'tablet' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Tablet viewport (768px)"
                    >
                      <Tablet className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewport('mobile')}
                      className={`p-1.5 rounded transition ${viewport === 'mobile' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Mobile viewport (390px)"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <button
                    type="button"
                    onClick={handleRefreshPreview}
                    className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition"
                    title="Reload preview"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition"
                  title="Open runnable app in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition"
                  title="Download standalone HTML application"
                >
                  <Download className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            {/* Main Stage Content */}
            <div className="flex-1 overflow-hidden relative bg-zinc-950">
              {/* TAB 1: LIVE PREVIEW */}
              {activeTab === 'preview' && (
                <div className="h-full w-full flex items-center justify-center p-2 sm:p-4 overflow-auto bg-zinc-950">
                  <div className={`${getViewportClass()} transition-all duration-300 relative bg-zinc-900`}>
                    <iframe
                      ref={iframeRef}
                      title="Honk Live App Preview"
                      srcDoc={currentJob.previewHtml || currentJob.files['index.html'] || ''}
                      sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                      className="w-full h-full border-0 bg-white"
                    />
                    {isRefining && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-30">
                        <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-700 px-4 py-2.5 rounded-xl shadow-xl">
                          <RotateCw className="h-4 w-4 animate-spin text-amber-400" />
                          <span className="text-xs font-medium">Honk is updating your app...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CODE & FILES */}
              {activeTab === 'code' && (
                <div className="h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                  {/* File List */}
                  <div className="w-full md:w-64 bg-zinc-950 p-3 space-y-1 overflow-y-auto shrink-0">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1 block">
                      Generated Files ({Object.keys(currentJob.files).length})
                    </span>
                    {Object.keys(currentJob.files).map((filePath) => (
                      <button
                        key={filePath}
                        type="button"
                        onClick={() => setSelectedFile(filePath)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                          selectedFile === filePath
                            ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{filePath}</span>
                      </button>
                    ))}
                  </div>

                  {/* Code Viewer */}
                  <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-400">
                      <span className="font-mono text-zinc-300">{selectedFile}</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                      >
                        {copiedFile ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy File</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-200 bg-zinc-950 leading-relaxed whitespace-pre select-text">
                      {currentJob.files[selectedFile] || '// Select a file to view code'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SPECIFICATIONS */}
              {activeTab === 'specs' && (
                <div className="h-full overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold text-amber-400">Application Title</span>
                      <h3 className="text-2xl font-bold text-white mt-1">{currentJob.name}</h3>
                      <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                        {currentJob.specification.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                      <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Key Features</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentJob.specification.features.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-300"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                      <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Technology Stack</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
                          <p className="text-zinc-500 font-medium">Frontend</p>
                          <p className="text-zinc-200 font-semibold mt-1">{currentJob.specification.techStack.frontend}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
                          <p className="text-zinc-500 font-medium">Styling</p>
                          <p className="text-zinc-200 font-semibold mt-1">{currentJob.specification.techStack.styling}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
                          <p className="text-zinc-500 font-medium">Backend</p>
                          <p className="text-zinc-200 font-semibold mt-1">{currentJob.specification.techStack.backend}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
                          <p className="text-zinc-500 font-medium">State / Storage</p>
                          <p className="text-zinc-200 font-semibold mt-1">{currentJob.specification.techStack.database}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* TAB 4: LIVE ACTIVITY */}
              {activeTab === 'activity' && (
                <div className="h-full overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto space-y-4">
                  <LiveActivityPanel
                    steps={activitySteps}
                    modelName={activeModelInfo.name}
                    activeOperation={activeOperation}
                    isWorking={aiCodingStatus !== 'idle'}
                  />
                </div>
              )}
            </div>

            {/* Bottom Refinement Bar */}
            <footer className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur shrink-0">
              <form onSubmit={handleRefineApp} className="flex gap-2 max-w-5xl mx-auto items-center">
                <div className="relative flex-1">
                  <input
                    id="app-studio-refine-input"
                    type="text"
                    value={refineInstruction}
                    onChange={(e) => setRefineInstruction(e.target.value)}
                    placeholder="Refine or iterate your app (e.g. 'Add a search bar', 'Switch to dark purple theme', 'Add sound effects', 'Add CSV export')..."
                    disabled={isRefining}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
                <button
                  id="app-studio-refine-btn"
                  type="submit"
                  disabled={isRefining || !refineInstruction.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer shadow-md"
                >
                  {isRefining ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Update App</span>
                    </>
                  )}
                </button>
              </form>
            </footer>
          </div>
        )}
      </div>

      {/* Real Publish & Deployment Pipeline Modal */}
      {currentJob && (
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          project={{
            id: currentJob.id,
            name: currentJob.name,
            description: currentJob.specification?.description,
            files: currentJob.files,
            previewHtml: currentJob.previewHtml,
          }}
          activeModelId={activeModelId}
          onPublished={(dep) => {
            setLatestDeployment(dep);
            setAiCodingStatus('published');
            if (currentJob) {
              currentJob.deploymentId = dep.id;
              currentJob.deploymentUrl = dep.url;
            }
          }}
        />
      )}
    </div>
  );
};
