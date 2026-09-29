import React, { useState, useRef } from 'react';
import {
  X,
  Github,
  Upload,
  Globe,
  Boxes,
  FileCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  ArrowRight,
  Loader2,
  Lock,
  Layers,
  Code2,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { HonkLogo } from './HonkLogo';
import {
  ImportSourceType,
  AppTargetType,
  ImportPayload,
  HonkProject,
} from '../lib/imports/types';
import { importProjectAnywhere } from '../lib/appBuilderService';

interface ImportAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectImported: (project: HonkProject) => void;
}

type Step = 'select_source' | 'analyzing' | 'analysis_result' | 'error';

export const ImportAppModal: React.FC<ImportAppModalProps> = ({
  isOpen,
  onClose,
  onProjectImported,
}) => {
  const [sourceType, setSourceType] = useState<ImportSourceType>('github');
  const [step, setStep] = useState<Step>('select_source');
  const [targetType, setTargetType] = useState<AppTargetType>('web');

  // Input states
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubSubpath, setGithubSubpath] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [builderType, setBuilderType] = useState('react-vite');
  const [projectName, setProjectName] = useState('');
  
  // File paste states
  const [pastedFiles, setPastedFiles] = useState<{ [path: string]: string }>({
    'src/App.tsx': `import React, { useState } from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-6 text-white">\n      <h1 className="text-2xl font-bold">Imported App</h1>\n    </div>\n  );\n}`,
    'package.json': `{\n  "name": "pasted-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1"\n  }\n}`,
  });
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [activePastedFile, setActivePastedFile] = useState('src/App.tsx');

  // ZIP upload
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis result states
  const [analyzingStatus, setAnalyzingStatus] = useState('Connecting to source...');
  const [analyzedProject, setAnalyzedProject] = useState<HonkProject | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDiagnostic, setErrorDiagnostic] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleZipFileChange = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please upload a valid .zip archive.');
      return;
    }

    setZipFileName(file.name);
    if (!projectName) {
      setProjectName(file.name.replace(/\.zip$/i, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setZipBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleZipFileChange(e.dataTransfer.files[0]);
    }
  };

  const startImport = async () => {
    setStep('analyzing');
    setErrorMessage(null);
    setErrorDiagnostic(null);

    const payload: ImportPayload = {
      sourceType,
      targetType,
      projectName: projectName.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      githubBranch: githubBranch.trim() || undefined,
      githubSubpath: githubSubpath.trim() || undefined,
      url: publicUrl.trim() || undefined,
      builderType: sourceType === 'builder' ? builderType : undefined,
      zipBase64: zipBase64 || undefined,
      zipFileName: zipFileName || undefined,
      files: sourceType === 'manual' ? pastedFiles : undefined,
    };

    setAnalyzingStatus('Fetching project source & repository files...');
    const t1 = setTimeout(() => setAnalyzingStatus('Validating file trees & dependencies...'), 800);
    const t2 = setTimeout(() => setAnalyzingStatus('Scanning for secrets & sanitizing credentials...'), 1600);
    const t3 = setTimeout(() => setAnalyzingStatus('Detecting frameworks, routes & API endpoints...'), 2400);
    const t4 = setTimeout(() => setAnalyzingStatus('Normalizing architecture for Honk Studio...'), 3200);

    try {
      const res = await importProjectAnywhere(payload);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      if (res.success && res.project) {
        setAnalyzedProject(res.project);
        setStep('analysis_result');
      } else {
        setErrorMessage(res.error || 'Import failed');
        setErrorDiagnostic(res.diagnosticInfo || null);
        setStep('error');
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setErrorMessage(err.message || 'Import failed unexpectedly');
      setErrorDiagnostic(err.stack || String(err));
      setStep('error');
    }
  };

  const handleConfirmConvert = () => {
    if (analyzedProject) {
      onProjectImported(analyzedProject);
      onClose();
    }
  };

  const addPastedFile = () => {
    if (!newFilePath.trim()) return;
    const path = newFilePath.trim();
    setPastedFiles({
      ...pastedFiles,
      [path]: newFileContent || '// New file\n',
    });
    setActivePastedFile(path);
    setNewFilePath('');
    setNewFileContent('');
  };

  return (
    <div
      id="import-app-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        id="import-app-modal-container"
        className="relative flex flex-col w-full h-[90vh] max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <HonkLogo size="sm" glow alt="Honk App Builder" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  HONK APP BUILDER → IMPORT ANY APP
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Universal Importer
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Build anywhere. Import into Honk. Keep building.
              </p>
            </div>
          </div>

          <button
            id="close-import-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Source Selection & Input */}
          {step === 'select_source' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-white">Select Import Source</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Bring an existing app from GitHub, ZIP file, public project, AI builder export, or pasted code.
                </p>
              </div>

              {/* Source Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  id="tab-source-github"
                  type="button"
                  onClick={() => setSourceType('github')}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition ${
                    sourceType === 'github'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Github className="h-5 w-5" />
                  <span>GitHub Repo</span>
                </button>

                <button
                  id="tab-source-zip"
                  type="button"
                  onClick={() => setSourceType('zip')}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition ${
                    sourceType === 'zip'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span>ZIP / Upload</span>
                </button>

                <button
                  id="tab-source-url"
                  type="button"
                  onClick={() => setSourceType('url')}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition ${
                    sourceType === 'url'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Globe className="h-5 w-5" />
                  <span>Public URL</span>
                </button>

                <button
                  id="tab-source-builder"
                  type="button"
                  onClick={() => setSourceType('builder')}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition ${
                    sourceType === 'builder'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Boxes className="h-5 w-5" />
                  <span>AI Builder</span>
                </button>

                <button
                  id="tab-source-manual"
                  type="button"
                  onClick={() => setSourceType('manual')}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition ${
                    sourceType === 'manual'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <FileCode className="h-5 w-5" />
                  <span>Paste Files</span>
                </button>
              </div>

              {/* Source Forms */}
              <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-4">
                {/* 1. GITHUB SOURCE */}
                {sourceType === 'github' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        GitHub Repository URL <span className="text-amber-400">*</span>
                      </label>
                      <input
                        id="import-github-url"
                        type="text"
                        placeholder="https://github.com/owner/repository"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Branch (Optional, default: main)
                        </label>
                        <input
                          type="text"
                          placeholder="main"
                          value={githubBranch}
                          onChange={(e) => setGithubBranch(e.target.value)}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Subdirectory / Folder (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="packages/frontend or app"
                          value={githubSubpath}
                          onChange={(e) => setGithubSubpath(e.target.value)}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ZIP UPLOAD */}
                {sourceType === 'zip' && (
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Upload Project ZIP Archive <span className="text-amber-400">*</span>
                    </label>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                        isDragging
                          ? 'border-amber-400 bg-amber-500/10'
                          : 'border-zinc-700/80 bg-zinc-950/60 hover:border-zinc-600 hover:bg-zinc-900/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleZipFileChange(e.target.files[0]);
                          }
                        }}
                      />
                      <Upload className="h-8 w-8 text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {zipFileName ? zipFileName : 'Click to upload or drag & drop project .zip'}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Supports exports from Vite, Next.js, React, or any modern web codebase
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PUBLIC URL */}
                {sourceType === 'url' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Public Project or Source URL <span className="text-amber-400">*</span>
                      </label>
                      <input
                        id="import-public-url"
                        type="text"
                        placeholder="https://example.com/project or raw gist URL"
                        value={publicUrl}
                        onChange={(e) => setPublicUrl(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-3.5 text-xs text-zinc-400 space-y-1">
                      <p className="font-semibold text-zinc-300">⚠️ Live Preview vs Source Code Notice</p>
                      <p>
                        If a URL points only to a live preview or compiled website without accessible source code, Honk will prompt you to provide the project's GitHub repository or ZIP export instead.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. BUILDER TEMPLATES */}
                {sourceType === 'builder' && (
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Select Builder / Framework Preset
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'react-vite', name: 'React + Vite Application', desc: 'Standard modern React 18 SPA with Tailwind CSS' },
                        { id: 'lovable-tailwind', name: 'AI Builder / Dashboard Export', desc: 'Interactive metrics dashboard with analytics cards' },
                        { id: 'bolt-vite-react', name: 'Bolt / Cursor Project Format', desc: 'Modular component architecture with TypeScript' },
                        { id: 'v0-dashboard', name: 'v0 / Next.js Component Export', desc: 'Modern responsive layout with clean state' },
                      ].map((b) => (
                        <div
                          key={b.id}
                          onClick={() => setBuilderType(b.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition ${
                            builderType === b.id
                              ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-sm'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <p className="text-sm font-bold text-zinc-200">{b.name}</p>
                          <p className="text-xs text-zinc-400 mt-1">{b.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. PASTE FILES */}
                {sourceType === 'manual' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex gap-2 overflow-x-auto">
                        {Object.keys(pastedFiles).map((fp) => (
                          <button
                            key={fp}
                            type="button"
                            onClick={() => setActivePastedFile(fp)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                              activePastedFile === fp
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {fp}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={8}
                      value={pastedFiles[activePastedFile] || ''}
                      onChange={(e) =>
                        setPastedFiles({
                          ...pastedFiles,
                          [activePastedFile]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                    />

                    {/* Add new file row */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="src/components/MyComponent.tsx"
                        value={newFilePath}
                        onChange={(e) => setNewFilePath(e.target.value)}
                        className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={addPastedFile}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
                      >
                        Add File
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Project Name & Target Type */}
                <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Project Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="My Custom App"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Target Project Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetType('web')}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                          targetType === 'web'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        🌐 Web Application
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetType('native_android')}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                          targetType === 'native_android'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        📱 Native Android
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  id="start-analyze-import-btn"
                  type="button"
                  onClick={startImport}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition active:scale-95 shadow-lg flex items-center gap-2"
                >
                  <span>Analyze & Import</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Analyzing Loading State */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center max-w-md mx-auto">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-8 w-8 text-amber-400 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Analyzing Project Structure</h3>
                <p className="text-xs text-amber-400 font-medium">{analyzingStatus}</p>
                <p className="text-xs text-zinc-500">
                  Scanning components, dependencies, routing, and zero-secret safety checks...
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Analysis Results Screen */}
          {step === 'analysis_result' && analyzedProject && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    ✓ Project Successfully Analyzed
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">{analyzedProject.name}</h3>
                  <p className="text-xs text-zinc-400">
                    Ready to convert into an interactive, editable Honk Project.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ready for Studio
                  </span>
                </div>
              </div>

              {/* Analysis Dashboard Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Framework</span>
                  <p className="text-sm font-bold text-white">{analyzedProject.analysis.framework}</p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Language</span>
                  <p className="text-sm font-bold text-white">{analyzedProject.analysis.language}</p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Architecture</span>
                  <p className="text-sm font-bold text-white">
                    {analyzedProject.analysis.frontendDetected ? 'Frontend' : ''}
                    {analyzedProject.analysis.backendDetected ? ' + Backend' : ''}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Target</span>
                  <p className="text-sm font-bold text-amber-400">
                    {analyzedProject.targetType === 'native_android' ? '📱 Native Android' : '🌐 Web Application'}
                  </p>
                </div>
              </div>

              {/* Deep Analysis Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3 text-xs">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">System Specifications</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Database Layer:</span>
                      <span className="font-semibold text-zinc-200">{analyzedProject.analysis.databaseDetected || 'Local State & Cache'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Authentication:</span>
                      <span className="font-semibold text-zinc-200">{analyzedProject.analysis.authDetected || 'Guest / Open'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Dependencies:</span>
                      <span className="font-semibold text-zinc-200">{analyzedProject.analysis.dependenciesCount} packages</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Detected Routes:</span>
                      <span className="font-semibold text-zinc-200">{analyzedProject.analysis.routes.length} routes</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Total Project Files:</span>
                      <span className="font-semibold text-zinc-200">{Object.keys(analyzedProject.files).length} files</span>
                    </div>
                  </div>
                </div>

                {/* Security Scan Overview */}
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Security & Secrets Shield</h4>
                  </div>

                  {analyzedProject.analysis.securityWarnings.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-amber-400 font-semibold">
                        ⚠️ {analyzedProject.analysis.securityWarnings.length} secret(s) detected and safely sanitized:
                      </p>
                      <ul className="space-y-1 max-h-28 overflow-y-auto">
                        {analyzedProject.analysis.securityWarnings.map((w, i) => (
                          <li key={i} className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
                            Replaced with <code className="text-amber-300 font-mono">{w.variableName}</code> in {w.file}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-zinc-500">
                        Never exposed in logs. Template added to <code className="text-zinc-300 font-mono">.env.example</code>.
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
                      <p className="text-zinc-300 font-medium">Clean Security Scan</p>
                      <p className="text-zinc-500 text-[11px]">Zero exposed API keys or tokens found in project files.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Confirmation CTA */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Convert to Honk Project</h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Preserves original UI, logic, assets, and routing with instant live preview.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('select_source')}
                    className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200"
                  >
                    Back
                  </button>
                  <button
                    id="confirm-convert-honk-btn"
                    type="button"
                    onClick={handleConfirmConvert}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition active:scale-95 shadow-lg flex items-center gap-2"
                  >
                    <span>Open in Honk Studio</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Error State */}
          {step === 'error' && (
            <div className="space-y-6 max-w-xl mx-auto py-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Import Failed</h3>
                <p className="text-sm text-rose-400 font-medium leading-relaxed">
                  {errorMessage || 'Project source could not be accessed.'}
                </p>
                {errorDiagnostic && (
                  <p className="text-xs text-zinc-500 font-mono p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left overflow-x-auto">
                    {errorDiagnostic}
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('select_source')}
                  className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
                >
                  Try Different Source
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
