import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, ChevronDown, Check, Zap, Flame, Clock } from 'lucide-react';
import { CodingModelOption, fetchCodingModels } from '../lib/appBuilderService';

interface AICodingIndicatorProps {
  currentModel?: {
    id?: string;
    name: string;
    provider?: string;
  };
  status?: 'idle' | 'working' | 'generating' | 'refining' | 'repairing' | 'building' | 'testing' | 'published';
  operation?: string;
  startTime?: number;
  onSelectModel?: (modelId: string) => void;
  compact?: boolean;
}

export const AICodingIndicator: React.FC<AICodingIndicatorProps> = ({
  currentModel,
  status = 'idle',
  operation,
  startTime,
  onSelectModel,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<CodingModelOption[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    fetchCodingModels().then((data) => {
      setAvailableModels(data.models || []);
    });
  }, []);

  const isWorking = status !== 'idle' && status !== 'published';

  // Timer calculation
  useEffect(() => {
    if (!isWorking || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.max(0, (Date.now() - startTime) / 1000);
      setElapsedSeconds(Number(diff.toFixed(1)));
    }, 100);

    return () => clearInterval(interval);
  }, [isWorking, startTime]);

  const activeModelName = currentModel?.name || 'Gemini 2.5 Flash';
  const activeProvider = currentModel?.provider || 'Google Gemini';

  const getStatusBadge = () => {
    switch (status) {
      case 'generating':
        return { label: 'Generating', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' };
      case 'working':
        return { label: 'Working', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse' };
      case 'refining':
        return { label: 'Refining', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse' };
      case 'repairing':
        return { label: 'Fixing Error', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' };
      case 'building':
        return { label: 'Building', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse' };
      case 'testing':
        return { label: 'Testing', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse' };
      case 'published':
        return { label: 'Live Deployed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: 'Ready', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="relative inline-block text-left">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-850 backdrop-blur text-xs transition cursor-pointer shadow-sm ${
          isWorking ? 'border-amber-500/40 shadow-amber-500/10' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Coding Engine & Active Model"
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center justify-center">
            <Cpu className={`h-3.5 w-3.5 ${isWorking ? 'text-amber-400 animate-spin' : 'text-zinc-400'}`} />
            {isWorking && (
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                AI CODING
              </span>

              <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-semibold border ${statusBadge.color}`}>
                ● {statusBadge.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
              <span className="max-w-[130px] truncate">{activeModelName}</span>
              {!compact && <span className="text-[10px] text-zinc-400">({activeProvider})</span>}
            </div>
          </div>
        </div>

        {isWorking && elapsedSeconds > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] text-amber-300 font-mono">
            <Clock className="h-2.5 w-2.5" />
            <span>{elapsedSeconds}s</span>
          </div>
        )}

        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Model Selection Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-40 space-y-1">
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Select Coding Model
                </p>
                <p className="text-[10px] text-zinc-400">Powering fast code generation & repairs</p>
              </div>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pt-1">
              {availableModels.map((model) => {
                const isSelected = currentModel?.id === model.id || activeModelName === model.name;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      if (onSelectModel) onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                        : 'hover:bg-zinc-800 text-zinc-300 border border-transparent'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{model.name}</span>
                        {model.isDefault && (
                          <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 font-semibold uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{model.tagline}</p>
                      <span className="text-[9px] text-zinc-400 font-mono">{model.provider}</span>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>

            {operation && (
              <div className="mt-2 pt-2 border-t border-zinc-800 px-2 py-1 bg-zinc-950/60 rounded-lg">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">
                  Current Operation:
                </span>
                <span className="text-[11px] text-amber-300 font-medium line-clamp-1">{operation}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
