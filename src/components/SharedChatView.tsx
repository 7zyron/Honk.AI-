import React, { useEffect, useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  Lock,
  AlertTriangle,
  RefreshCw,
  Clock,
  Cpu,
  User,
  ExternalLink,
} from 'lucide-react';
import { PublicSharedChat } from '../types';
import { fetchSharedChat } from '../lib/shareService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { HonkLogo } from './HonkLogo';

interface SharedChatViewProps {
  shareId: string;
  onNavigateHome: () => void;
}

export const SharedChatView: React.FC<SharedChatViewProps> = ({
  shareId,
  onNavigateHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<PublicSharedChat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Set noindex, nofollow metadata for search engines
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
      created = true;
    }
    const previousContent = robotsMeta.content;
    robotsMeta.content = 'noindex, nofollow, noarchive';

    // Set page title
    const originalTitle = document.title;
    document.title = 'Shared Chat | Honk AI';

    return () => {
      document.title = originalTitle;
      if (created && robotsMeta?.parentNode) {
        robotsMeta.parentNode.removeChild(robotsMeta);
      } else if (robotsMeta) {
        robotsMeta.content = previousContent;
      }
    };
  }, []);

  const loadShare = async () => {
    setLoading(true);
    setError(null);
    setRevoked(false);
    setNotFound(false);

    const res = await fetchSharedChat(shareId);
    setLoading(false);

    if (res.success && res.data) {
      setChat(res.data);
      document.title = `${res.data.title} | Shared Chat • Honk AI`;
    } else if (res.revoked) {
      setRevoked(true);
      setError(res.error || 'This shared conversation has been revoked by its author.');
    } else if (res.notFound) {
      setNotFound(true);
      setError(res.error || 'Shared conversation not found.');
    } else {
      setError(res.error || 'Failed to load shared conversation.');
    }
  };

  useEffect(() => {
    if (shareId) {
      loadShare();
    }
  }, [shareId]);

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      }
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-3 sm:px-6 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            id="shared-view-home-btn"
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition shrink-0 cursor-pointer"
            title="Go to Honk AI"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Honk AI</span>
          </button>

          <div className="flex items-center gap-2 pl-1 min-w-0">
            <HonkLogo size="xs" glow alt="Honk AI Logo" />
            <span className="font-bold text-sm tracking-tight hidden md:inline">Honk AI</span>
            <span className="hidden md:inline text-zinc-600">•</span>
            <h1 className="text-xs sm:text-sm font-medium text-zinc-200 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {chat ? chat.title : 'Shared Conversation'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Read-only Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-300 shrink-0">
            <Lock className="h-3 w-3 text-purple-400" />
            <span>Read-Only Snapshot</span>
          </div>

          {/* Copy Share Link Button */}
          {chat && (
            <button
              id="shared-copy-link-btn"
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition shrink-0 cursor-pointer"
              title="Copy link to this shared conversation"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          )}

          {/* CTA: Start your own chat */}
          <button
            id="shared-start-new-chat-btn"
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--honk-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 active:scale-95 shrink-0 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Your Own Chat</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 max-w-4xl w-full mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
            <HonkLogo size="lg" glow alt="Loading Honk AI" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-200">Loading shared conversation...</p>
              <p className="text-xs text-zinc-500">Preparing read-only snapshot</p>
            </div>
          </div>
        )}

        {!loading && revoked && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center max-w-md mx-auto p-6 rounded-2xl border border-rose-500/30 bg-zinc-900/90 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <Lock className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-zinc-100">Share Link Revoked</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This shared conversation was revoked by its author and is no longer publicly accessible.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="mt-2 rounded-xl bg-[var(--honk-accent)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 cursor-pointer"
            >
              Open Honk AI
            </button>
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center max-w-md mx-auto p-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-zinc-100">Conversation Not Found</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The link may be mistyped, expired, or the conversation may have been deleted.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="mt-2 rounded-xl bg-[var(--honk-accent)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 cursor-pointer"
            >
              Go to Honk AI
            </button>
          </div>
        )}

        {!loading && !revoked && !notFound && error && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center max-w-md mx-auto p-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-amber-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-zinc-100">Unable to Load Chat</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadShare}
              className="mt-2 flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {!loading && chat && (
          <div className="space-y-6 pb-20">
            {/* Conversation Header Banner */}
            <div className="rounded-2xl border border-[var(--border-app)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)] tracking-tight">
                  {chat.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-800/70 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    <Cpu className="h-3 w-3 text-amber-400" />
                    <span>{chat.model || 'Honk Fast'}</span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-800/70 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                    <Clock className="h-3 w-3" />
                    <span>Shared on {new Date(chat.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{chat.messages.length} message{chat.messages.length === 1 ? '' : 's'} in snapshot</span>
                <span className="italic">Read-only view • Cannot be modified</span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="space-y-5">
              {chat.messages.map((message) => {
                const isUser = message.role === 'user';

                return (
                  <div
                    key={message.id}
                    id={`shared-msg-${message.id}`}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {/* Role Header */}
                    <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-[var(--text-muted)]">
                      {isUser ? (
                        <>
                          <span className="font-semibold text-zinc-300">User</span>
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-200">
                            <User className="h-3 w-3" />
                          </div>
                        </>
                      ) : (
                        <>
                          <HonkLogo size="xs" alt="Honk AI" />
                          <span className="font-semibold" style={{ color: 'var(--honk-accent-text)' }}>
                            Honk AI
                          </span>
                        </>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`relative group max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-[var(--honk-accent-subtle)] text-[var(--text-main)] border border-[var(--honk-accent-border)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-app)]'
                      }`}
                    >
                      {/* Attachments if any */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {message.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                            >
                              <span>📎 {att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed break-words">
                        <MarkdownRenderer content={message.content} />
                      </div>

                      {/* Message Actions (Strictly Read-Only: Copy Only) */}
                      <div className="mt-2 flex items-center justify-end pt-1 border-t border-zinc-800/40 opacity-75 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(message.id, message.content)}
                          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition cursor-pointer"
                          title="Copy message content"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Invitation Banner */}
            <div className="mt-10 rounded-2xl border border-[var(--border-app)] bg-[var(--bg-surface)] p-6 text-center space-y-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  Start your own conversation with Honk AI
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Honk AI is an ultra-fast, multi-model AI assistant with native support for Indian languages, Hinglish, low-data 2G mode, and voice intelligence.
                </p>
              </div>
              <button
                id="bottom-start-chat-btn"
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--honk-accent)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-90 active:scale-95 cursor-pointer"
              >
                <span>Chat with Honk AI</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
