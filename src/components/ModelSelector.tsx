import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Brain, Feather, Check } from 'lucide-react';
import { AIModel, AVAILABLE_MODELS } from '../types';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  isOpenControlled?: boolean;
  onToggleControlled?: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  disabled = false,
  isOpenControlled,
  onToggleControlled,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (onToggleControlled) {
      onToggleControlled();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpenControlled !== undefined) {
          if (isOpen && onToggleControlled) onToggleControlled();
        } else {
          setInternalIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, isOpenControlled, onToggleControlled]);

  const getModelIcon = (category: string) => {
    switch (category) {
      case 'fast':
        return <Zap className="h-4 w-4 text-amber-400" />;
      case 'reasoning':
        return <Brain className="h-4 w-4 text-purple-400" />;
      case 'lite':
        return <Feather className="h-4 w-4 text-emerald-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left shrink-0 z-40" ref={containerRef}>
      <button
        id="model-selector-toggle-btn"
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-750 bg-zinc-900 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-100 shadow-xs transition hover:border-amber-500 hover:bg-zinc-800/80 disabled:opacity-50 cursor-pointer ${
          isOpen ? 'border-amber-500 ring-1 ring-amber-500' : ''
        }`}
        title={`Selected Model: ${selectedModel.name}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{getModelIcon(selectedModel.category)}</span>
          <span className="font-semibold text-zinc-100 truncate max-w-[90px] sm:max-w-[130px]">
            {selectedModel.name}
          </span>
          <span
            className="hidden xs:inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border leading-none bg-amber-500/15 text-amber-400 border-amber-500/30"
          >
            {selectedModel.badge}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl border border-zinc-700/90 bg-zinc-900/98 p-2 shadow-2xl backdrop-blur-2xl max-h-[calc(100vh-120px)] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between mb-1.5">
            <span className="text-zinc-200">Select Honk Model</span>
            <span className="text-[10px] lowercase text-zinc-500 font-mono">Multi-Model Engine</span>
          </div>
          <div className="space-y-1.5">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  id={`model-option-${model.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectModel(model.id);
                    if (onToggleControlled) onToggleControlled();
                    else setInternalIsOpen(false);
                  }}
                  className={`w-full rounded-xl p-3 text-left transition flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/40 text-zinc-100 shadow-sm'
                      : 'hover:bg-zinc-800/80 text-zinc-300 border border-transparent hover:border-zinc-700/60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-lg bg-zinc-950 p-1.5 border border-zinc-800">
                    {getModelIcon(model.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-sm text-zinc-100 truncate">
                          {model.name}
                        </span>
                        <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 border border-zinc-700 leading-none">
                          {model.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <Check
                          className="h-4 w-4 shrink-0 text-amber-400"
                        />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {model.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                      <span className="font-mono text-[10px] text-amber-400 font-semibold">
                        {model.geminiModel}
                      </span>
                      <span>•</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] border border-zinc-700 text-zinc-300">
                        Context: {model.contextWindow}
                      </span>
                      {model.maxOutputTokens && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] border border-zinc-700 text-zinc-300">
                          Max Out: {model.maxOutputTokens}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

