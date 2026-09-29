import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CircleDashed,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface ActivityTaskStep {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  timestamp?: number;
  durationMs?: number;
}

interface LiveActivityPanelProps {
  steps?: ActivityTaskStep[];
  modelName?: string;
  activeOperation?: string;
  isWorking?: boolean;
}

const DEFAULT_STEPS: ActivityTaskStep[] = [
  { id: '1', title: 'Analyzing prompt & architecture requirements', status: 'completed' },
  { id: '2', title: 'Creating project file tree & schemas', status: 'completed' },
  { id: '3', title: 'Generating responsive React components & Tailwind UI', status: 'in_progress' },
  { id: '4', title: 'Resolving browser dependencies & runtime packages', status: 'pending' },
  { id: '5', title: 'Creating stateful actions, forms & routes', status: 'pending' },
  { id: '6', title: 'Bundling standalone sandbox & Hot Module reload', status: 'pending' },
  { id: '7', title: 'Running verification checks & security scan', status: 'pending' },
];

export const LiveActivityPanel: React.FC<LiveActivityPanelProps> = ({
  steps = DEFAULT_STEPS,
  modelName = 'Gemini 2.5 Flash',
  activeOperation,
  isWorking = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const currentStep = steps.find((s) => s.status === 'in_progress') || steps[steps.length - 1];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur overflow-hidden shadow-lg transition-all">
      {/* Header bar */}
      <div
        className="px-3.5 py-2.5 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-950/90 transition select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className={`h-4 w-4 ${isWorking ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
            {isWorking && (
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-xs font-bold text-white tracking-wide uppercase text-[11px]">
            Live Coding Activity
          </span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {completedCount}/{steps.length} Steps
          </span>
        </div>

        <div className="flex items-center gap-3">
          {activeOperation && (
            <span className="hidden md:inline text-[11px] text-amber-300 font-medium line-clamp-1 max-w-xs">
              {activeOperation}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">{modelName}</span>
          <button type="button" className="text-zinc-400 hover:text-white transition">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded list */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-zinc-950/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map((step, idx) => {
              let icon = <CircleDashed className="h-3.5 w-3.5 text-zinc-500 shrink-0" />;
              let textColor = 'text-zinc-400';
              let badgeColor = 'border-transparent text-zinc-500';

              if (step.status === 'completed') {
                icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
                textColor = 'text-zinc-200';
                badgeColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
              } else if (step.status === 'in_progress') {
                icon = <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin shrink-0" />;
                textColor = 'text-amber-300 font-semibold';
                badgeColor = 'border-amber-500/40 text-amber-300 bg-amber-500/15 animate-pulse';
              } else if (step.status === 'failed') {
                icon = <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />;
                textColor = 'text-rose-300';
                badgeColor = 'border-rose-500/40 text-rose-300 bg-rose-500/15';
              }

              return (
                <div
                  key={step.id || idx}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition ${
                    step.status === 'in_progress'
                      ? 'border-amber-500/30 bg-amber-500/5 shadow-inner'
                      : step.status === 'completed'
                      ? 'border-zinc-800/80 bg-zinc-900/40'
                      : 'border-zinc-850/50 bg-zinc-950/40 opacity-70'
                  }`}
                >
                  {icon}
                  <span className={`text-[11px] truncate flex-1 ${textColor}`}>{step.title}</span>
                  {step.status === 'completed' && (
                    <span className="text-[9px] font-mono text-emerald-400/80">✓</span>
                  )}
                  {step.status === 'in_progress' && (
                    <span className="text-[9px] font-mono text-amber-400 animate-pulse">●</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
