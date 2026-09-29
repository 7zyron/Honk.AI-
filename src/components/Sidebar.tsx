import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Shield,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Zap,
  Info,
  Share2,
  Sparkles,
  Download,
  Upload,
  Camera,
  Brain,
  Gauge,
  Laptop,
  Image as ImageIcon,
} from 'lucide-react';
import { Conversation, UserProfile, DailyUsage } from '../types';
import { HonkLogo } from './HonkLogo';

interface SidebarProps {
  conversations: Conversation[];
  activeConvoId: string;
  onSelectConvo: (id: string) => void;
  onNewChat: () => void;
  onDeleteConvo: (id: string) => void;
  onRenameConvo: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  currentUser: UserProfile;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onShareConvo?: (convo: Conversation) => void;
  onOpenAppStudio?: () => void;
  onOpenImportModal?: () => void;
  onOpenDownloadApp?: () => void;
  onOpenPhotoKheecho?: () => void;
  onOpenHonkSearch?: (initialQuery?: string) => void;
  onOpenMemory?: () => void;
  onOpenBenchmark?: () => void;
  onOpenShield?: () => void;
  onOpenDevices?: () => void;
  onOpenImageGenerator?: (initialPrompt?: string) => void;
  usage: DailyUsage | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConvoId,
  onSelectConvo,
  onNewChat,
  onDeleteConvo,
  onRenameConvo,
  onTogglePin,
  isOpen,
  onToggleOpen,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  onOpenAbout,
  onShareConvo,
  onOpenAppStudio,
  onOpenImportModal,
  onOpenDownloadApp,
  onOpenPhotoKheecho,
  onOpenHonkSearch,
  onOpenMemory,
  onOpenBenchmark,
  onOpenShield,
  onOpenDevices,
  onOpenImageGenerator,
  usage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    if (isActionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionMenuOpen]);

  // Group conversations by time
  const filteredAndGrouped = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matches = conversations.filter((c) => {
      if (!q) return true;
      if (c.title.toLowerCase().includes(q)) return true;
      return c.messages.some((m) => m.content.toLowerCase().includes(q));
    });

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const pinned: Conversation[] = [];
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const last7Days: Conversation[] = [];
    const older: Conversation[] = [];

    matches.forEach((c) => {
      if (c.pinned) {
        pinned.push(c);
        return;
      }
      const age = now - c.updatedAt;
      if (age < ONE_DAY) {
        today.push(c);
      } else if (age < 2 * ONE_DAY) {
        yesterday.push(c);
      } else if (age < 7 * ONE_DAY) {
        last7Days.push(c);
      } else {
        older.push(c);
      }
    });

    return { pinned, today, yesterday, last7Days, older };
  }, [conversations, searchQuery]);

  const startEditing = (convo: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(convo.id);
    setEditTitleText(convo.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitleText.trim()) {
      onRenameConvo(id, editTitleText.trim());
    }
    setEditingId(null);
  };

  const renderConversationGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((convo) => {
            const isActive = convo.id === activeConvoId;
            const isEditing = editingId === convo.id;

            return (
              <div
                key={convo.id}
                onClick={() => onSelectConvo(convo.id)}
                className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition cursor-pointer ${
                  isActive
                    ? 'bg-[var(--honk-accent-subtle)] font-medium border border-[var(--honk-accent-border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]'
                }`}
                style={isActive ? { color: 'var(--text-main)' } : {}}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => handleSaveRename(convo.id, e)}
                    className="flex flex-1 items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      className="w-full rounded-md border border-[var(--honk-accent)] bg-zinc-900 px-2 py-0.5 text-xs text-zinc-100 outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded p-1 text-emerald-400 hover:bg-zinc-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare
                        className="h-4 w-4 shrink-0 transition"
                        style={isActive ? { color: 'var(--honk-accent)' } : { color: 'var(--text-faint)' }}
                      />
                      <span className="truncate text-xs">{convo.title}</span>
                    </div>

                    {/* Action buttons (Pin, Edit, Delete) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        id={`pin-convo-${convo.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(convo.id);
                        }}
                        className={`rounded p-1 text-zinc-400 hover:bg-zinc-700/60 ${
                          convo.pinned ? 'opacity-100' : ''
                        }`}
                        style={convo.pinned ? { color: 'var(--honk-accent)' } : {}}
                        title={convo.pinned ? 'Unpin conversation' : 'Pin conversation'}
                      >
                        <Pin className="h-3 w-3" />
                      </button>

                      {convo.messages.some((m) => m.content && m.content.trim().length > 0) && onShareConvo && (
                        <button
                          id={`share-convo-${convo.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareConvo(convo);
                          }}
                          className="rounded p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-700/60"
                          title="Share conversation"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                      )}

                      <button
                        id={`rename-convo-${convo.id}`}
                        type="button"
                        onClick={(e) => startEditing(convo, e)}
                        className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>

                      <button
                        id={`delete-convo-${convo.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConvo(convo.id);
                        }}
                        className="rounded p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700/60"
                        title="Delete chat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--border-app)] bg-[var(--bg-sidebar)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:hidden'
        }`}
      >
        {/* Brand & Top Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-app)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <HonkLogo size="sm" glow />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[var(--text-main)]">Honk AI</span>
                <span
                  className="rounded px-1.5 py-0.2 text-[10px] font-bold border"
                  style={{
                    backgroundColor: 'var(--honk-accent-subtle)',
                    color: 'var(--honk-accent-text)',
                    borderColor: 'var(--honk-accent-border)',
                  }}
                >
                  Official
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-medium">By Zyron</p>
            </div>
          </div>

          <button
            id="sidebar-close-toggle-btn"
            type="button"
            onClick={onToggleOpen}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar with (+) Action Dropdown inside (ChatGPT style) */}
        <div className="p-3">
          <div className="relative z-30" ref={actionMenuRef}>
            {/* (+) Plus Button on the left inside the search bar */}
            <button
              id="sidebar-action-plus-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsActionMenuOpen((prev) => !prev);
              }}
              className={`absolute left-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition cursor-pointer z-10 ${
                isActionMenuOpen ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-zinc-800/80 border border-zinc-700/60'
              }`}
              title="Quick Actions: New Chat, Photo Kheecho, Create App, Import App"
            >
              <Plus className={`h-3.5 w-3.5 transition-transform duration-200 ${isActionMenuOpen ? 'rotate-45 text-amber-400' : ''}`} />
            </button>

            {/* Main Search Input */}
            <input
              id="search-conversations-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim() && onOpenHonkSearch) {
                  e.preventDefault();
                  onOpenHonkSearch(searchQuery.trim());
                }
              }}
              placeholder="Ask anything • ↵ to Honk"
              className="w-full rounded-xl border border-[var(--border-app)] bg-[var(--bg-input)] pl-10 pr-8 py-2 text-xs text-[var(--text-main)] placeholder-zinc-500 outline-none transition focus:border-[var(--honk-accent)]"
            />

            {/* Clear Search Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Action Dropdown Menu */}
            {isActionMenuOpen && (
              <div
                id="sidebar-plus-dropdown-menu"
                className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-zinc-700/80 bg-zinc-900/98 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* 1. New Chat */}
                <button
                  id="dropdown-new-chat-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsActionMenuOpen(false);
                    onNewChat();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                    <span>New Chat</span>
                  </div>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700/60">
                    ⌘K
                  </span>
                </button>

                {/* 2. HONK SEARCH — "Before You Think" */}
                {onOpenHonkSearch && (
                  <button
                    id="dropdown-honk-search-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenHonkSearch(searchQuery);
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <span>Honk Search</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 border border-amber-500/35">
                      HONK IT
                    </span>
                  </button>
                )}

                {/* 3. Photo Kheecho */}
                {onOpenPhotoKheecho && (
                  <button
                    id="dropdown-photo-kheecho-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenPhotoKheecho();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/40">
                        <Camera className="h-3.5 w-3.5" />
                      </div>
                      <span>Photo Kheecho</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 border border-amber-500/35">
                      KAAM KHATAM
                    </span>
                  </button>
                )}

                {/* 4. Create App */}
                {onOpenAppStudio && (
                  <button
                    id="dropdown-create-app-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenAppStudio();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span>Create App</span>
                    </div>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 border border-zinc-700/60">
                      APP STUDIO
                    </span>
                  </button>
                )}

                {/* 5. Import App */}
                {onOpenImportModal && (
                  <button
                    id="dropdown-import-app-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenImportModal();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                        <Upload className="h-3.5 w-3.5" />
                      </div>
                      <span>Import App</span>
                    </div>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 border border-zinc-700/60">
                      BUILDER
                    </span>
                  </button>
                )}

                {/* 5b. Image Generator */}
                {onOpenImageGenerator && (
                  <button
                    id="dropdown-image-generator-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenImageGenerator(searchQuery);
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </div>
                      <span>Image Generator</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 border border-amber-500/35">
                      12s LUDO
                    </span>
                  </button>
                )}

                {/* 6. Honk Memory */}
                {onOpenMemory && (
                  <button
                    id="dropdown-memory-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenMemory();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/15 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        <Brain className="h-3.5 w-3.5" />
                      </div>
                      <span>Honk Memory</span>
                    </div>
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-300 border border-purple-500/35">
                      REMEMBERS YOU
                    </span>
                  </button>
                )}

                {/* 7. Agent Benchmark */}
                {onOpenBenchmark && (
                  <button
                    id="dropdown-benchmark-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenBenchmark();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        <Gauge className="h-3.5 w-3.5" />
                      </div>
                      <span>Agent Benchmark</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 border border-amber-500/35">
                      REAL SUITE
                    </span>
                  </button>
                )}

                {/* 8. HONK SHIELD — Device Security & Intrusion Defense */}
                {onOpenShield && (
                  <button
                    id="dropdown-honk-shield-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenShield();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/15 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20 text-red-400 border border-red-500/40">
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </div>
                      <span>Honk Shield</span>
                    </div>
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-red-400 border border-red-500/35">
                      SECURITY
                    </span>
                  </button>
                )}

                {/* 9. HONK DEVICE CENTER — Connected Windows / Mobile Devices */}
                {onOpenDevices && (
                  <button
                    id="dropdown-devices-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      onOpenDevices();
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/15 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                        <Laptop className="h-3.5 w-3.5" />
                      </div>
                      <span>Devices</span>
                    </div>
                    <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300 border border-cyan-500/35">
                      AGENT
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
          {searchQuery.trim() && onOpenHonkSearch && (
            <button
              id="sidebar-quick-honk-search-banner"
              type="button"
              onClick={() => onOpenHonkSearch(searchQuery.trim())}
              className="mb-2 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-yellow-500/15 p-2.5 text-xs text-amber-300 hover:brightness-110 border border-amber-500/40 transition cursor-pointer shadow-sm text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <Zap className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                <div className="truncate">
                  <span className="font-bold">HONK: </span>
                  <span className="text-zinc-200">"{searchQuery}"</span>
                </div>
              </div>
              <span className="rounded bg-amber-500/30 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-200 shrink-0">
                1 HONK
              </span>
            </button>
          )}

          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No conversations yet
            </div>
          ) : (
            <>
              {renderConversationGroup('Pinned', filteredAndGrouped.pinned)}
              {renderConversationGroup('Today', filteredAndGrouped.today)}
              {renderConversationGroup('Yesterday', filteredAndGrouped.yesterday)}
              {renderConversationGroup('Previous 7 Days', filteredAndGrouped.last7Days)}
              {renderConversationGroup('Older', filteredAndGrouped.older)}
            </>
          )}
        </div>

        {/* Bottom User & Quota Bar */}
        <div className="border-t border-zinc-800/80 p-3 bg-zinc-950/80">
          {/* User Preview */}
          <div
            onClick={onOpenAuth}
            className="flex items-center gap-2.5 rounded-xl p-2 transition cursor-pointer hover:bg-zinc-900"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || 'User'}
                className="h-8 w-8 rounded-lg object-cover border border-zinc-700"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-semibold text-zinc-200">
                {currentUser.name}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                <Shield className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                <span>{usage ? `${usage.remaining}/100 msgs left` : '100 limit'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenShield && (
                <button
                  id="sidebar-shield-btn"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenShield();
                  }}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
                  title="Honk Shield Device Protection"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
              )}

              <a
                id="sidebar-about-btn"
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenAbout();
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400 transition"
                title="About Honk AI"
              >
                <Info className="h-4 w-4" />
              </a>

              <a
                id="sidebar-settings-btn"
                href="/settings"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition cursor-pointer"
                title="Settings & Preferences"
              >
                <Settings className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
