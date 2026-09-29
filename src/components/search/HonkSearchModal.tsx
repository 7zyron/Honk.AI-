import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Sparkles,
  Brain,
  ExternalLink,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Trash2,
  Pin,
  X,
  ArrowRight,
  Clock,
  ShieldCheck,
  Bookmark,
  Edit3,
  SlidersHorizontal,
  RefreshCw,
  MessageSquare,
  Mic,
  MicOff,
  Zap,
  ChevronDown,
  ChevronUp,
  Globe,
  Radio,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  SearchResult,
  SearchSource,
  SearchPrediction,
  HonkMemoryItem,
  SearchFilterOptions,
} from '../../types/search';
import {
  searchService,
  predictionService,
  memoryService,
  playHonkSoundEffect,
} from '../../lib/search/searchClient';

interface HonkSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  userId?: string;
  onAskHonk?: (query: string, summary: string, sources: SearchSource[]) => void;
  onAskHonkAboutSearch?: (query: string, summary: string, sources: SearchSource[]) => void;
}

export const HonkSearchModal: React.FC<HonkSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  userId,
  onAskHonk,
  onAskHonkAboutSearch,
}) => {
  const askHonkHandler = onAskHonk || onAskHonkAboutSearch;
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Predictions state ("Before You Think")
  const [predictions, setPredictions] = useState<SearchPrediction[]>([]);
  const [isPredictionOpen, setIsPredictionOpen] = useState(false);
  const [selectedPredictionIndex, setSelectedPredictionIndex] = useState(-1);

  // Memory state ("Internet That Remembers YOU")
  const [isMemoryDrawerOpen, setIsMemoryDrawerOpen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memories, setMemories] = useState<HonkMemoryItem[]>([]);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');

  // UI state
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'memory'>('search');
  const [filterDeep, setFilterDeep] = useState(false);

  // Pipeline simulation stages during search
  const [pipelineStage, setPipelineStage] = useState<string>('Searching the broad web...');

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutedQueryRef = useRef<string | null>(null);

  // Focus input when opened & auto-execute initialQuery if provided
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);

      // Load initial memory state
      loadUserMemories();

      if (initialQuery && initialQuery.trim()) {
        const trimmed = initialQuery.trim();
        setQuery(trimmed);
        if (lastExecutedQueryRef.current !== trimmed) {
          lastExecutedQueryRef.current = trimmed;
          handleExecuteSearch(trimmed);
        }
      } else {
        // Fetch trending/suggested predictions
        fetchPredictions('');
      }
    } else {
      lastExecutedQueryRef.current = null;
      // Cleanup speech if active
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setIsListening(false);
    }
  }, [isOpen, initialQuery]);

  // Load memories
  const loadUserMemories = async (searchQ?: string) => {
    const data = await memoryService.getMemories(searchQ);
    setMemoryEnabled(data.isEnabled);
    setMemories(data.memories);
  };

  // Keyboard navigation & Shortcuts (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        if (isPredictionOpen) {
          setIsPredictionOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPredictionOpen, onClose]);

  // Fetch predictions on query change ("Before You Think")
  const fetchPredictions = useCallback((q: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Intelligent instant debounce (75ms) for 0 perceived typing latency
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await predictionService.fetchPredictions(q, signal);
        if (!signal.aborted) {
          setPredictions(results);
          setIsPredictionOpen(results.length > 0);
          setSelectedPredictionIndex(-1);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Prediction error', err);
        }
      }
    }, 75);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchPredictions(val);
  };

  // Execute primary HONK action
  const handleExecuteSearch = async (queryToSearch?: string) => {
    const targetQuery = (queryToSearch || query).trim();
    if (!targetQuery) return;

    // Play signature dual-tone HONK audio haptic
    playHonkSoundEffect(0.18);

    setIsPredictionOpen(false);
    setIsSearching(true);
    setSearchError(null);
    setShowAllSources(false);
    setActiveTab('search');

    // Pipeline status updates
    setPipelineStage('1 HONK: Searching global web...');
    if (typeof window !== 'undefined') {
      const targetUrl = '/search?q=' + encodeURIComponent(targetQuery);
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
    const stageTimer1 = setTimeout(() => {
      setPipelineStage('Deduplicating & ranking verified sources...');
    }, 350);

    const stageTimer2 = setTimeout(() => {
      setPipelineStage('Synthesizing one definitive answer...');
    }, 700);

    try {
      const result = await searchService.executeSearch(targetQuery, {
        deepSearch: filterDeep,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      setSearchResult(result);
      // Refresh memory list if memory was updated
      loadUserMemories();
    } catch (err: any) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setSearchError(err.message || 'Search synthesis failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Keyboard navigation for prediction dropdown
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPredictionOpen && predictions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedPredictionIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedPredictionIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedPredictionIndex >= 0 && selectedPredictionIndex < predictions.length) {
          const selected = predictions[selectedPredictionIndex];
          setQuery(selected.text);
          setIsPredictionOpen(false);
          handleExecuteSearch(selected.text);
        } else {
          setIsPredictionOpen(false);
          handleExecuteSearch();
        }
        return;
      }
      if (e.key === 'Tab' && selectedPredictionIndex >= 0) {
        e.preventDefault();
        setQuery(predictions[selectedPredictionIndex].text);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      setIsPredictionOpen(false);
      handleExecuteSearch();
    }
  };

  // Voice Search integration (Web Speech API)
  const toggleVoiceSearch = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN'; // Works for Indian English, Hinglish, & global
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setQuery(transcript);
        fetchPredictions(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Text to Speech for Search Answer
  const toggleSpeechAnswer = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for natural narration
    const cleanText = text.replace(/[\#\*\`\_\[\]]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Copy Direct Answer
  const handleCopyAnswer = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  // Memory Actions
  const handleToggleMemory = async () => {
    const nextState = !memoryEnabled;
    setMemoryEnabled(nextState);
    await memoryService.toggleMemory(nextState);
    loadUserMemories(memorySearchQuery);
  };

  const handleDeleteMemory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await memoryService.deleteMemory(id);
    loadUserMemories(memorySearchQuery);
  };

  const handleClearAllMemory = async () => {
    if (confirm('Are you sure you want to clear your entire Honk search memory?')) {
      await memoryService.clearMemory();
      loadUserMemories();
    }
  };

  const handleSaveNotes = async (memoryId: string) => {
    await memoryService.updateNotes(memoryId, editingNotesText);
    setEditingMemoryId(null);
    loadUserMemories(memorySearchQuery);
  };

  if (!isOpen) return null;

  return (
    <div
      id="honk-search-overlay"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/90 backdrop-blur-2xl text-zinc-100 overflow-hidden animate-in fade-in duration-150"
    >
      {/* Top Navigation & Brand Header */}
      <header className="relative flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 sm:px-6 bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20 font-black tracking-tighter text-sm">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                HONK SEARCH
              </h1>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                Before You Think
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-zinc-400">
              1 HONK = The internet searched for you. One concise answer.
            </p>
          </div>
        </div>

        {/* View Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Memory Toggle / Badge */}
          <button
            id="honk-search-memory-toggle-btn"
            type="button"
            onClick={() => setActiveTab(activeTab === 'memory' ? 'search' : 'memory')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
              activeTab === 'memory'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
                : memoryEnabled
                ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:border-purple-500/40 hover:text-purple-300'
                : 'bg-zinc-800/40 text-zinc-500 border-zinc-800 line-through'
            }`}
            title="Honk Memory: Internet that remembers you"
          >
            <Brain className={`h-3.5 w-3.5 ${memoryEnabled ? 'text-purple-400' : 'text-zinc-600'}`} />
            <span className="hidden xs:inline">
              {memoryEnabled ? 'Memory Active' : 'Memory Paused'}
            </span>
            {memories.length > 0 && (
              <span className="ml-0.5 rounded-full bg-purple-500/30 px-1.5 py-0.2 text-[10px] font-mono text-purple-200">
                {memories.length}
              </span>
            )}
          </button>

          {/* Close Button */}
          <button
            id="honk-search-close-btn"
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition cursor-pointer border border-zinc-700/60"
            title="Close Honk Search (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full">
        {/* VIEW 1: SEARCH INTERFACE */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* SEARCH INPUT BAR WITH "HONK" BUTTON */}
            <div className="relative">
              <div
                className={`relative flex items-center rounded-2xl border bg-zinc-900/90 p-1.5 shadow-2xl transition-all duration-200 ${
                  isPredictionOpen
                    ? 'border-amber-500/80 ring-2 ring-amber-500/20'
                    : 'border-zinc-700 hover:border-zinc-600 focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20'
                }`}
              >
                {/* Search Icon */}
                <div className="pl-3 pr-2 text-amber-400">
                  <Search className="h-5 w-5" />
                </div>

                {/* Main Prediction Input */}
                <input
                  ref={inputRef}
                  id="honk-search-main-input"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    if (predictions.length > 0) setIsPredictionOpen(true);
                  }}
                  placeholder="Ask anything... type 'h' or any topic for instant predictions"
                  className="w-full bg-transparent py-2.5 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />

                {/* Action Icons inside bar */}
                <div className="flex items-center gap-1 pr-1">
                  {/* Clear Query Button */}
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        fetchPredictions('');
                        inputRef.current?.focus();
                      }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 transition"
                      title="Clear search query"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Voice Input Button */}
                  <button
                    id="honk-voice-search-btn"
                    type="button"
                    onClick={toggleVoiceSearch}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    title={isListening ? 'Listening... Speak now' : 'Voice Search'}
                  >
                    {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>

                  {/* PRIMARY "HONK" BUTTON */}
                  <button
                    id="honk-primary-search-btn"
                    type="button"
                    onClick={() => handleExecuteSearch()}
                    disabled={isSearching || !query.trim()}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition-all cursor-pointer select-none active:scale-95 ${
                      !query.trim()
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-zinc-950 shadow-lg shadow-amber-500/25 hover:brightness-110 border border-amber-300'
                    }`}
                  >
                    <Zap className="h-4 w-4 fill-zinc-950 stroke-zinc-950" />
                    <span>HONK</span>
                  </button>
                </div>
              </div>

              {/* PREDICTIVE AUTOCOMPLETE DROPDOWN ("Before You Think") */}
              {isPredictionOpen && predictions.length > 0 && (
                <div
                  id="honk-predictive-dropdown"
                  className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-zinc-700/90 bg-zinc-900/98 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800/80 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      PREDICTIVE SUGGESTIONS (BEFORE YOU THINK)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      ↑↓ to navigate • ↵ to Honk
                    </span>
                  </div>

                  <div className="space-y-1">
                    {predictions.map((pred, idx) => {
                      const isSelected = idx === selectedPredictionIndex;
                      return (
                        <div
                          key={pred.id}
                          onClick={() => {
                            setQuery(pred.text);
                            setIsPredictionOpen(false);
                            handleExecuteSearch(pred.text);
                          }}
                          onMouseEnter={() => setSelectedPredictionIndex(idx)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                              : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {pred.type === 'memory' ? (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                <Brain className="h-3.5 w-3.5" />
                              </div>
                            ) : pred.type === 'trending' ? (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <Sparkles className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
                                <Search className="h-3.5 w-3.5" />
                              </div>
                            )}

                            <div className="truncate">
                              <span className="font-medium">{pred.text}</span>
                              {pred.subtitle && (
                                <span className="ml-2 text-[11px] text-zinc-500">
                                  • {pred.subtitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
                            {pred.type === 'memory' && (
                              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 border border-purple-500/30">
                                MEMORY
                              </span>
                            )}
                            <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ERROR BANNER */}
            {searchError && (
              <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                <span>{searchError}</span>
                <button
                  type="button"
                  onClick={() => handleExecuteSearch()}
                  className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                >
                  Retry Honk
                </button>
              </div>
            )}

            {/* SEARCH PIPELINE LOADING STATE */}
            {isSearching && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-spin">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-300">
                      HONK ACTIVE
                    </h3>
                    <p className="text-xs text-zinc-400 animate-pulse">
                      {pipelineStage}
                    </p>
                  </div>
                </div>

                {/* Skeleton placeholders */}
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-3/4 rounded-lg bg-zinc-800/80 animate-pulse" />
                  <div className="h-4 w-full rounded-lg bg-zinc-800/60 animate-pulse" />
                  <div className="h-4 w-5/6 rounded-lg bg-zinc-800/50 animate-pulse" />
                </div>
                <div className="mt-6 flex gap-2">
                  <div className="h-8 w-28 rounded-xl bg-zinc-800/60 animate-pulse" />
                  <div className="h-8 w-28 rounded-xl bg-zinc-800/60 animate-pulse" />
                  <div className="h-8 w-28 rounded-xl bg-zinc-800/60 animate-pulse" />
                </div>
              </div>
            )}

            {/* SEARCH RESULTS VIEW ("ONE ANSWER, NOT 10 BLUE LINKS") */}
            {!isSearching && searchResult && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. DIRECT SYNTHESIS HERO CARD */}
                <div className="rounded-2xl border border-amber-500/40 bg-zinc-900/90 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                  {/* Decorative background glow */}
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                  {/* Header info */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
                        ✓
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        {searchResult.fromMemory ? 'Personal Memory Synthesis' : 'Synthesized Answer'}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        • {searchResult.responseTimeMs}ms
                      </span>
                      {searchResult.cached && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                          Instant Cache
                        </span>
                      )}
                    </div>

                    {/* Quick utility icons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSpeechAnswer(searchResult.directAnswer)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isSpeaking ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                        title={isSpeaking ? 'Stop speaking' : 'Read answer aloud'}
                      >
                        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyAnswer(searchResult.directAnswer)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedAnswer ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Markdown Answer Body */}
                  <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-zinc-200 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {searchResult.directAnswer}
                    </ReactMarkdown>
                  </div>

                  {/* KEY SUPPORTING FACTS */}
                  {searchResult.keyTakeaways && searchResult.keyTakeaways.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-zinc-800/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                        Key Supporting Facts
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-1">
                        {searchResult.keyTakeaways.map((fact, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 rounded-xl bg-zinc-800/60 p-2.5 text-xs sm:text-sm text-zinc-300 border border-zinc-700/50"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 text-[11px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="leading-snug">{fact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ACTION BAR: "Ask Honk about this" & "Save to Memory" */}
                  <div className="mt-6 flex flex-wrap items-center gap-2.5 pt-4 border-t border-zinc-800/80">
                    {askHonkHandler && (
                      <button
                        id="ask-honk-about-search-btn"
                        type="button"
                        onClick={() => {
                          askHonkHandler(
                            searchResult.query,
                            searchResult.directAnswer,
                            searchResult.sources
                          );
                          onClose();
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110 transition cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Ask Honk about this</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('memory')}
                      className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 transition cursor-pointer"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      <span>View in Memory</span>
                    </button>
                  </div>
                </div>

                {/* 2. EXPANDABLE SOURCE CITATIONS */}
                {searchResult.sources && searchResult.sources.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-amber-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Supporting Sources ({searchResult.sources.length})
                        </h3>
                      </div>

                      {searchResult.sources.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllSources(!showAllSources)}
                          className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                        >
                          {showAllSources ? (
                            <>
                              <span>Show Top 3</span>
                              <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Show All {searchResult.sources.length}</span>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {(showAllSources
                        ? searchResult.sources
                        : searchResult.sources.slice(0, 3)
                      ).map((src) => (
                        <a
                          key={src.id}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 hover:border-amber-500/50 hover:bg-zinc-800/60 transition shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              {src.favicon ? (
                                <img
                                  src={src.favicon}
                                  alt=""
                                  className="h-4 w-4 rounded-sm"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Globe className="h-4 w-4 text-zinc-500" />
                              )}
                              <span className="text-[11px] font-mono text-zinc-400 truncate">
                                {src.domain}
                              </span>
                              {src.verified && (
                                <span className="ml-auto text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1 rounded border border-amber-500/30">
                                  VERIFIED
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 line-clamp-2 leading-snug">
                              {src.title}
                            </h4>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                            <span>Direct Citation</span>
                            <ExternalLink className="h-3 w-3 text-zinc-500 group-hover:text-amber-400" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. RELATED SEARCHES */}
                {searchResult.relatedSearches && searchResult.relatedSearches.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                      Explore Related Queries
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.relatedSearches.map((rel, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setQuery(rel);
                            handleExecuteSearch(rel);
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-500/50 hover:text-amber-300 hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <Search className="h-3 w-3 text-amber-400/80" />
                          <span>{rel}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EMPTY STATE / SUGGESTED TOPICS */}
            {!isSearching && !searchResult && (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-amber-400 border border-amber-500/30">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ask the internet. One Honk. One answer.
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    Honk synthesizes multiple live sources into one clear, actionable answer before you think.
                  </p>
                </div>

                {/* Starter query pills */}
                <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-2 pt-2">
                  {[
                    'Llama 3.3 quantization trick for low VRAM',
                    'RBI UPI daily transaction limits 2026',
                    'Sarkari Yojana eligibility checker and benefits',
                    'How does quantum computing work in simple terms',
                    'Best ATS resume optimization techniques',
                  ].map((topic, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setQuery(topic);
                        handleExecuteSearch(topic);
                      }}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: HONK MEMORY VIEW ("Internet That Remembers YOU") */}
        {activeTab === 'memory' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Memory Header & Controls */}
            <div className="rounded-2xl border border-purple-500/40 bg-zinc-900/90 p-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Honk Search Memory
                      <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                        {memories.length} Memories
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Private search history, key takeaways, and personal notes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleMemory}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                      memoryEnabled
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {memoryEnabled ? 'Memory: ENABLED' : 'Memory: DISABLED'}
                  </button>

                  {memories.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMemory}
                      className="flex items-center gap-1 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 border border-red-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Memory Search Filter */}
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
                <Search className="h-4 w-4 text-purple-400" />
                <input
                  type="text"
                  value={memorySearchQuery}
                  onChange={(e) => {
                    setMemorySearchQuery(e.target.value);
                    loadUserMemories(e.target.value);
                  }}
                  placeholder="Ask memory... e.g. 'What was that Llama trick I saw last Tuesday?'"
                  className="w-full bg-transparent text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 outline-none"
                />
                {memorySearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemorySearchQuery('');
                      loadUserMemories('');
                    }}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Memory List */}
            {memories.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <Brain className="h-8 w-8 mx-auto text-zinc-600" />
                <p className="text-xs">No memories found</p>
                <p className="text-[11px] text-zinc-600">
                  Searches you perform with Honk will automatically build your personal knowledge index.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-1">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-purple-500/40 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {mem.isPinned && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                              PINNED
                            </span>
                          )}
                          <h4 className="text-sm font-bold text-zinc-100 hover:text-purple-300 transition">
                            {mem.query}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(mem.timestamp).toLocaleDateString()}</span>
                          {mem.tags.length > 0 && (
                            <span>• {mem.tags.slice(0, 4).join(', ')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setQuery(mem.query);
                            setActiveTab('search');
                            handleExecuteSearch(mem.query);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition cursor-pointer"
                        >
                          <Zap className="h-3 w-3" />
                          <span>Honk Again</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteMemory(mem.id, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                          title="Delete memory item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {mem.summary}
                    </p>

                    {/* Key Facts */}
                    {mem.keyFacts && mem.keyFacts.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {mem.keyFacts.map((fact, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-[11px] text-zinc-400"
                          >
                            <span className="text-purple-400">•</span>
                            <span>{fact}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Personal Notes */}
                    <div className="pt-2 border-t border-zinc-800/80">
                      {editingMemoryId === mem.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingNotesText}
                            onChange={(e) => setEditingNotesText(e.target.value)}
                            placeholder="Add your personal note or context for this search..."
                            className="w-full rounded-xl border border-purple-500/50 bg-zinc-950 p-2 text-xs text-zinc-200 outline-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveNotes(mem.id)}
                              className="rounded-lg bg-purple-500 px-2.5 py-1 text-xs font-bold text-zinc-950 hover:bg-purple-400"
                            >
                              Save Note
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemoryId(null)}
                              className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-zinc-400">
                            {mem.userNotes ? (
                              <span className="text-purple-300 font-medium">
                                📝 Note: {mem.userNotes}
                              </span>
                            ) : (
                              <span className="italic text-zinc-500">
                                No personal notes added
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMemoryId(mem.id);
                              setEditingNotesText(mem.userNotes || '');
                            }}
                            className="flex items-center gap-1 text-[11px] text-purple-400 hover:underline cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{mem.userNotes ? 'Edit' : 'Add Note'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
