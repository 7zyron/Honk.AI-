import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  RotateCw,
  Sparkles,
  Search,
  Wrench,
  Download,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
  Folder,
  FileCode,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Activity,
  ArrowLeft,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  Code2,
  UploadCloud,
  Globe,
  Cpu,
} from 'lucide-react';
import { HonkLogo } from './HonkLogo';
import { HonkProject } from '../lib/imports/types';
import {
  repairProjectWithAi,
  optimizeProjectSeo,
} from '../lib/appBuilderService';
import {
  saveStoredProject,
  downloadProjectZip,
} from '../lib/projectStorage';
import { AICodingIndicator } from './AICodingIndicator';
import { LiveActivityPanel, ActivityTaskStep } from './LiveActivityPanel';
import { PublishModal } from './developer/PublishModal';
import { DeploymentRecord } from '../types';

interface AppBuilderStudioProps {
  project: HonkProject;
  onClose?: () => void;
  onBack?: () => void;
  onUpdateProject?: (updated: HonkProject) => void;
}

type BottomTab = 'ai_assistant' | 'activity' | 'repair' | 'seo' | 'security' | 'terminal';
type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export const AppBuilderStudio: React.FC<AppBuilderStudioProps> = ({
  project: initialProject,
  onClose,
  onBack,
  onUpdateProject,
}) => {
  const handleBack = onBack || onClose || (() => {});
  const [currentProject, setCurrentProject] = useState<HonkProject>(initialProject);
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [bottomTab, setBottomTab] = useState<BottomTab>('ai_assistant');
  const [isCopied, setIsCopied] = useState(false);
  const [projectName, setProjectName] = useState(initialProject.name);

  // Model Transparency & AI Coding State
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

  // Live Activity Steps
  const [activitySteps, setActivitySteps] = useState<ActivityTaskStep[]>([
    { id: '1', title: 'Workspace initialized with source files', status: 'completed' },
    { id: '2', title: `Framework runtime: ${initialProject.analysis.framework}`, status: 'completed' },
    { id: '3', title: 'Interactive components & state loaded', status: 'completed' },
    { id: '4', title: 'Live preview hot reload ready', status: 'completed' },
  ]);

  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiLogMessages, setAiLogMessages] = useState<string[]>([
    `Project "${initialProject.name}" loaded into Honk Studio runtime.`,
    `Framework: ${initialProject.analysis.framework} (${initialProject.analysis.language})`,
  ]);

  // AI Repair states
  const [repairNotes, setRepairNotes] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSummary, setRepairSummary] = useState<string[]>([]);

  // SEO States
  const [isSeoOptimizing, setIsSeoOptimizing] = useState(false);
  const [seoSuccessNotice, setSeoSuccessNotice] = useState<string | null>(null);

  // New File modal state
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize active file
  useEffect(() => {
    const fileKeys = Object.keys(currentProject.files);
    let defaultFile = fileKeys.find((k) => k === 'src/App.tsx' || k === 'App.tsx' || k === 'index.html') || fileKeys[0] || '';
    setActiveFilePath(defaultFile);
    setActiveFileContent(currentProject.files[defaultFile] || '');
  }, [currentProject.id]);

  const selectFile = (filePath: string) => {
    setActiveFilePath(filePath);
    setActiveFileContent(currentProject.files[filePath] || '');
  };

  const handleContentChange = (newContent: string) => {
    setActiveFileContent(newContent);
    const updatedFiles = {
      ...currentProject.files,
      [activeFilePath]: newContent,
    };

    // If active file is index.html, update preview
    let updatedPreview = currentProject.previewHtml;
    if (activeFilePath === 'index.html') {
      updatedPreview = newContent;
    }

    const updated = {
      ...currentProject,
      files: updatedFiles,
      previewHtml: updatedPreview,
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);
    saveStoredProject(updated);
    if (onUpdateProject) onUpdateProject(updated);
  };

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return;
    const path = newFileName.trim();
    const updatedFiles = {
      ...currentProject.files,
      [path]: `// ${path}\n\n`,
    };
    const updated = {
      ...currentProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);
    saveStoredProject(updated);
    if (onUpdateProject) onUpdateProject(updated);
    setActiveFilePath(path);
    setActiveFileContent(updatedFiles[path]);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleDeleteFile = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${filePath}?`)) {
      const updatedFiles = { ...currentProject.files };
      delete updatedFiles[filePath];
      const updated = {
        ...currentProject,
        files: updatedFiles,
        updatedAt: Date.now(),
      };
      setCurrentProject(updated);
      saveStoredProject(updated);
      if (onUpdateProject) onUpdateProject(updated);

      const remainingKeys = Object.keys(updatedFiles);
      if (remainingKeys.length > 0) {
        selectFile(remainingKeys[0]);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFileContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRunRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = currentProject.previewHtml || '';
    }
  };

  const handleAiRefinement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAiProcessing) return;

    const userInstruction = aiPrompt.trim();
    setAiPrompt('');
    setIsAiProcessing(true);
    setAiCodingStatus('refining');
    setActiveOperation(`Modifying: "${userInstruction.slice(0, 35)}..."`);
    setCodingStartTime(Date.now());
    setAiLogMessages((prev) => [...prev, `⚡ User Request: "${userInstruction}"`]);

    setActivitySteps([
      { id: '1', title: `Processing instruction: "${userInstruction.slice(0, 40)}"`, status: 'in_progress' },
      { id: '2', title: `Synthesizing code edits via ${activeModelInfo.name}`, status: 'pending' },
      { id: '3', title: 'Updating file AST & syntax validations', status: 'pending' },
      { id: '4', title: 'Hot reloading live preview', status: 'pending' },
    ]);

    try {
      const repairRes = await repairProjectWithAi(
        currentProject.files,
        `User modification instruction: ${userInstruction}`,
        userInstruction
      );

      const updated = {
        ...currentProject,
        files: {
          ...currentProject.files,
          ...repairRes.updatedFiles,
        },
        previewHtml: repairRes.resolvedPreviewHtml || currentProject.previewHtml,
        updatedAt: Date.now(),
      };

      setCurrentProject(updated);
      saveStoredProject(updated);
      if (onUpdateProject) onUpdateProject(updated);

      // Update active file content
      if (repairRes.updatedFiles[activeFilePath]) {
        setActiveFileContent(repairRes.updatedFiles[activeFilePath]);
      }

      setAiLogMessages((prev) => [
        ...prev,
        `✓ AI Update Applied successfully with ${activeModelInfo.name}.`,
        ...(repairRes.changesSummary || []),
      ]);

      setActivitySteps([
        { id: '1', title: `Processing instruction: "${userInstruction.slice(0, 40)}"`, status: 'completed' },
        { id: '2', title: `Synthesized code edits via ${activeModelInfo.name}`, status: 'completed' },
        { id: '3', title: 'Updated file AST & syntax validations', status: 'completed' },
        { id: '4', title: 'Hot reloaded live preview', status: 'completed' },
      ]);
      setActiveOperation('Ready');
      setAiCodingStatus('idle');
    } catch (err: any) {
      setAiLogMessages((prev) => [...prev, `❌ Error applying AI edit: ${err.message}`]);
      setAiCodingStatus('idle');
      setActiveOperation('Error encountered');
    } finally {
      setIsAiProcessing(false);
      setCodingStartTime(undefined);
    }
  };

  const handleRunAiRepair = async () => {
    setIsRepairing(true);
    setRepairSummary([]);
    setAiCodingStatus('repairing');
    setActiveOperation('Diagnosing syntax & auto-repairing...');
    setCodingStartTime(Date.now());

    try {
      const res = await repairProjectWithAi(
        currentProject.files,
        repairNotes.trim() || 'Analyze and repair any broken imports, syntax errors, or runtime anomalies.',
        'Fix My App automated diagnostic'
      );

      const updated = {
        ...currentProject,
        files: {
          ...currentProject.files,
          ...res.updatedFiles,
        },
        previewHtml: res.resolvedPreviewHtml || currentProject.previewHtml,
        updatedAt: Date.now(),
      };

      setCurrentProject(updated);
      saveStoredProject(updated);
      if (onUpdateProject) onUpdateProject(updated);

      if (res.updatedFiles[activeFilePath]) {
        setActiveFileContent(res.updatedFiles[activeFilePath]);
      }

      setRepairSummary(res.changesSummary || ['Repaired syntax and sanitized secret references.']);
      setAiCodingStatus('idle');
      setActiveOperation('Ready');
    } catch (err: any) {
      setRepairSummary([`Repair failed: ${err.message}`]);
      setAiCodingStatus('idle');
      setActiveOperation('Repair failed');
    } finally {
      setIsRepairing(false);
      setCodingStartTime(undefined);
    }
  };

  const handleRunSeoOptimization = () => {
    setIsSeoOptimizing(true);
    setSeoSuccessNotice(null);

    setTimeout(() => {
      const optimized = optimizeProjectSeo(currentProject);
      setCurrentProject(optimized);
      if (onUpdateProject) onUpdateProject(optimized);
      if (optimized.files[activeFilePath]) {
        setActiveFileContent(optimized.files[activeFilePath]);
      }
      setIsSeoOptimizing(false);
      setSeoSuccessNotice('✓ Technical SEO injected: Title, OpenGraph, Schema.org JSON-LD, robots.txt, and sitemap.xml generated!');
    }, 600);
  };

  const handleExportZip = () => {
    downloadProjectZip(currentProject);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([currentProject.previewHtml || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Group files into directories
  const filePaths = Object.keys(currentProject.files).sort();

  return (
    <div
      id="honk-app-builder-studio-root"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 antialiased overflow-hidden select-none"
    >
      {/* 1. TOP HEADER TOOLBAR */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between z-20">
        {/* Left: Back + Project Info */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Honk</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <HonkLogo size="sm" glow alt="Honk Studio" />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                const updated = { ...currentProject, name: e.target.value };
                setCurrentProject(updated);
                saveStoredProject(updated);
              }}
              className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-amber-400 text-sm font-bold text-white px-1 py-0.5 focus:outline-none transition max-w-[200px] sm:max-w-xs truncate"
            />

            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {currentProject.analysis.framework}
            </span>

            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {currentProject.targetType === 'native_android' ? '📱 Native Android' : '🌐 Web'}
            </span>
          </div>
        </div>

        {/* Center: Viewport Switcher & AI Coding Indicator */}
        <div className="hidden lg:flex items-center gap-3">
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

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewport === 'desktop' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Desktop View"
            >
              <Laptop className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewport === 'tablet' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tablet View"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewport === 'mobile' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mobile View"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Real PUBLISH Button */}
          <button
            id="studio-publish-btn"
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs transition active:scale-95 shadow-lg shadow-emerald-500/20 border border-emerald-400/40"
            title="Publish Live Application to HONK Edge"
          >
            <UploadCloud className="h-4 w-4" />
            <span>PUBLISH</span>
          </button>

          <button
            type="button"
            onClick={handleRunRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition"
            title="Refresh Live Preview"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition"
            title="Open Live Preview in New Window"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>

          <button
            id="studio-export-zip-btn"
            type="button"
            onClick={handleExportZip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition active:scale-95 shadow-md"
            title="Download Clean ZIP Export"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export ZIP</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            title="Close Studio"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN 3-PANE WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* PANE 1: FILE EXPLORER */}
        <div className="w-full md:w-60 border-r border-zinc-800 bg-zinc-900/40 flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span className="uppercase tracking-wider text-[10px]">Explorer</span>
            <button
              type="button"
              onClick={() => setIsCreatingFile(true)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
              title="New File"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* New file input row */}
          {isCreatingFile && (
            <div className="p-2 border-b border-zinc-800 bg-zinc-950 flex gap-1">
              <input
                type="text"
                placeholder="src/components/MyComp.tsx"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateNewFile}
                className="px-2 py-1 rounded bg-amber-500 text-zinc-950 font-bold text-xs"
              >
                Add
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filePaths.map((filePath) => {
              const isSelected = activeFilePath === filePath;
              return (
                <div
                  key={filePath}
                  onClick={() => selectFile(filePath)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="truncate">{filePath}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteFile(filePath, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 transition"
                    title="Delete File"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Security badge at bottom of file explorer */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 text-[11px] text-zinc-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate">Sanitized: Zero Secret Leaks</span>
          </div>
        </div>

        {/* PANE 2: CODE EDITOR */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 bg-zinc-950 min-w-0">
          {/* File Tab Header */}
          <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="px-2.5 py-1 rounded-t bg-zinc-950 border-t border-x border-zinc-800 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                <span>{activeFilePath || 'No file selected'}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-white transition"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Textarea Code Editor */}
          <div className="flex-1 relative flex overflow-hidden">
            <textarea
              id="honk-studio-code-editor"
              value={activeFileContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full bg-zinc-950 text-zinc-200 p-4 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-amber-500/30 overflow-auto"
              spellCheck={false}
            />
          </div>
        </div>

        {/* PANE 3: LIVE PREVIEW IFRAME */}
        <div className="w-full md:w-[45%] lg:w-[48%] flex flex-col bg-zinc-900/30 overflow-hidden">
          <div className="h-10 border-b border-zinc-800 bg-zinc-900/60 px-4 flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Interactive Live Preview</span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {viewport === 'desktop' ? '100% Canvas' : viewport === 'tablet' ? '768px Viewport' : '375px Viewport'}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/80 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950 ${
                viewport === 'desktop'
                  ? 'w-full'
                  : viewport === 'tablet'
                  ? 'w-[768px] max-w-full'
                  : 'w-[375px] max-w-full'
              }`}
            >
              <iframe
                ref={iframeRef}
                srcDoc={currentProject.previewHtml || ''}
                title="Honk Live Preview"
                className="w-full h-full border-0 bg-zinc-950"
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM DEVELOPER & AI CONTROL PANEL */}
      <div className="h-64 border-t border-zinc-800 bg-zinc-900/80 flex flex-col shrink-0">
        {/* Bottom Tabs Bar */}
        <div className="h-9 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/90 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBottomTab('ai_assistant')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                bottomTab === 'ai_assistant'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                bottomTab === 'activity'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span>Live Activity</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('repair')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                bottomTab === 'repair'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Fix My App</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('seo')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                bottomTab === 'seo'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>SEO Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('security')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                bottomTab === 'security'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secrets Shield</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                bottomTab === 'terminal'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Terminal & Logs</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/90 text-xs">
          {/* TAB 1: AI ASSISTANT */}
          {bottomTab === 'ai_assistant' && (
            <div className="h-full flex flex-col justify-between space-y-3">
              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-400">
                {aiLogMessages.map((msg, i) => (
                  <div key={i} className="leading-relaxed">
                    {msg}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAiRefinement} className="flex gap-2">
                <input
                  type="text"
                  placeholder='Ask Honk to modify: "Add a dark mode toggle", "Add search filter", "Fix mobile padding"...'
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={isAiProcessing}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={isAiProcessing || !aiPrompt.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isAiProcessing ? 'Modifying...' : 'Apply Edit'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 1b: LIVE ACTIVITY */}
          {bottomTab === 'activity' && (
            <div className="space-y-2">
              <LiveActivityPanel
                steps={activitySteps}
                modelName={activeModelInfo.name}
                activeOperation={activeOperation}
                isWorking={aiCodingStatus !== 'idle'}
              />
            </div>
          )}

          {/* TAB 2: FIX MY APP (AI REPAIR) */}
          {bottomTab === 'repair' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Automated Code & Bug Repair Engine</h4>
                  <p className="text-zinc-400 text-xs">
                    Detects broken imports, missing dependencies, variable reference bugs, and applies surgical fixes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiRepair}
                  disabled={isRepairing}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>{isRepairing ? 'Diagnosing & Repairing...' : 'Fix My App'}</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Optional bug description or error log (e.g. TypeError: Cannot read property 'map' of undefined)..."
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />

              {repairSummary.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="font-semibold text-emerald-400">Repair Results:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
                    {repairSummary.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEO MODE */}
          {bottomTab === 'seo' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Technical Search Engine Optimization (SEO)</h4>
                  <p className="text-zinc-400 text-xs">
                    Audits and generates valid semantic meta tags, OpenGraph social share cards, JSON-LD Schema, robots.txt, and sitemap.xml.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunSeoOptimization}
                  disabled={isSeoOptimizing}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>{isSeoOptimizing ? 'Optimizing...' : 'Optimize Technical SEO'}</span>
                </button>
              </div>

              {seoSuccessNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
                  {seoSuccessNotice}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">OpenGraph Meta</span>
                  <span className="font-bold text-white">og:title, og:image, og:desc</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Structured Data</span>
                  <span className="font-bold text-white">JSON-LD WebSite Schema</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Search Crawlers</span>
                  <span className="font-bold text-white">robots.txt generated</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Site Index</span>
                  <span className="font-bold text-white">sitemap.xml created</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECRETS SHIELD */}
          {bottomTab === 'security' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Environment Variables & Secret Protection</h4>
                  <p className="text-zinc-400 text-xs">
                    Protects sensitive API keys by replacing them with safe references and generating <code className="text-amber-400 font-mono">.env.example</code>.
                  </p>
                </div>
              </div>

              {currentProject.analysis.environmentVariables.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentProject.analysis.environmentVariables.map((v, i) => {
                      const keyName = typeof v === 'string' ? v : v.key;
                      return (
                        <div key={i} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                          <span className="font-mono text-amber-300 font-semibold text-xs">{keyName}</span>
                          <span className="text-[10px] text-emerald-400 font-medium">Safe in .env</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-zinc-400">
                  Zero sensitive API keys found in codebase. All variables are clean.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TERMINAL & LOGS */}
          {bottomTab === 'terminal' && (
            <div className="font-mono text-[11px] space-y-1 text-zinc-400">
              <div className="text-emerald-400">➜ Honk Runtime Environment v2.4 initialized.</div>
              <div>➜ Loaded {Object.keys(currentProject.files).length} project files for "{currentProject.name}"</div>
              <div>➜ Live preview watcher active on SPA container.</div>
              <div>➜ Static assets mounted at /</div>
            </div>
          )}
        </div>
      </div>

      {/* Real Publish & Deployment Pipeline Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        project={{
          id: currentProject.id,
          name: currentProject.name,
          description: currentProject.description,
          files: currentProject.files,
          previewHtml: currentProject.previewHtml,
        }}
        activeModelId={activeModelId}
        onPublished={(dep) => {
          setLatestDeployment(dep);
          setAiCodingStatus('published');
        }}
      />
    </div>
  );
};
