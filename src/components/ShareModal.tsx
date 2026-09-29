import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Globe,
  X,
  AlertCircle,
  Eye,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { HonkLogo } from './HonkLogo';
import { createSharedChat } from '../lib/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  currentUser: UserProfile;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUser,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !conversation) return null;

  // Filter valid completed messages
  const shareableMessages = conversation.messages.filter(
    (m) => m.content && m.content.trim().length > 0
  );

  const handleCreateShare = async () => {
    setIsCreating(true);
    setErrorMessage(null);

    const result = await createSharedChat(
      {
        conversationId: conversation.id,
        title: conversation.title || 'Honk AI Conversation',
        model: conversation.model || 'honk-flash',
        language: 'en-IN',
        messages: shareableMessages,
      },
      currentUser.id
    );

    setIsCreating(false);

    if (result.success && result.shareUrl) {
      setCreatedShareUrl(result.shareUrl);
      setCreatedShareId(result.shareId || null);
    } else {
      setErrorMessage(result.error || 'Failed to generate public share link.');
    }
  };

  const handleCopyLink = async () => {
    if (!createdShareUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(createdShareUrl);
      } else {
        // Fallback for older browsers / iframe contexts
        const textarea = document.createElement('textarea');
        textarea.value = createdShareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMessage('Could not copy link to clipboard automatically. Please select and copy manually.');
    }
  };

  const handleNativeShare = async () => {
    if (!createdShareUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: conversation.title || 'Honk AI Conversation',
          text: `Check out this conversation with Honk AI: ${conversation.title}`,
          url: createdShareUrl,
        });
      } catch (err: any) {
        // Ignore user cancellation
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleResetAndClose = () => {
    setCreatedShareUrl(null);
    setCreatedShareId(null);
    setCopied(false);
    setErrorMessage(null);
    onClose();
  };

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        id="share-chat-modal"
        className="relative w-full max-w-lg rounded-2xl border border-zinc-700/80 bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <HonkLogo size="sm" glow alt="Honk AI Share" />
            <div>
              <h3 className="font-bold text-base text-[var(--text-main)] flex items-center gap-2">
                <span>{createdShareUrl ? 'Share Link Ready' : 'Share Conversation'}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {createdShareUrl
                  ? 'Anyone with this link can view a read-only snapshot'
                  : 'Create a public, read-only snapshot of this chat'}
              </p>
            </div>
          </div>
          <button
            id="close-share-modal-btn"
            type="button"
            onClick={handleResetAndClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Share Error: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {!createdShareUrl ? (
            // STAGE 1: Confirmation & Preview
            <>
              {/* Conversation Meta Card */}
              <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-page)] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-main)] line-clamp-1 flex-1 pr-2">
                    {conversation.title || 'Untitled Conversation'}
                  </span>
                  <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    {shareableMessages.length} message{shareableMessages.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                  <span>Model: {conversation.model || 'Honk Fast'}</span>
                  <span>•</span>
                  <span>Date: {new Date(conversation.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Exact What Will Be Shared Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Snapshot Preview (Read-Only)</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">First 3 messages shown</span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border-app)] bg-[var(--bg-page)] p-3 space-y-2.5 text-xs text-[var(--text-muted)]">
                  {shareableMessages.slice(0, 3).map((msg, i) => (
                    <div key={msg.id || i} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        {msg.role === 'user' ? (
                          <span className="text-zinc-400">You</span>
                        ) : (
                          <span style={{ color: 'var(--honk-accent-text)' }}>Honk AI</span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-zinc-300 text-[11px] leading-relaxed pl-2 border-l-2 border-zinc-800">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  {shareableMessages.length > 3 && (
                    <div className="text-center pt-1 text-[11px] text-zinc-500 italic">
                      + {shareableMessages.length - 3} more message{shareableMessages.length - 3 === 1 ? '' : 's'} will be included
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Warning & Guarantee */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <Globe className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Public Link Visibility</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  Anyone with the share link will be able to view this conversation snapshot.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1 border-t border-amber-500/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Your account email, system settings, and other conversations are never shared.</span>
                </div>
              </div>
            </>
          ) : (
            // STAGE 2: Link Generated & Ready
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Link Box */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                  Public Share Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="shared-url-input"
                    type="text"
                    readOnly
                    value={createdShareUrl}
                    className="flex-1 rounded-xl border border-[var(--border-app)] bg-[var(--bg-page)] px-3 py-2 text-xs font-mono text-[var(--text-main)] selection:bg-[var(--honk-accent-subtle)] focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    id="copy-share-link-btn"
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition shrink-0 shadow-xs cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--honk-accent)] text-white hover:opacity-90 active:scale-95'
                    }`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile / Web Share API */}
              {supportsNativeShare && (
                <button
                  id="native-web-share-btn"
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border-app)] bg-[var(--bg-surface)] py-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Share via Apps (WhatsApp, Messages, etc.)</span>
                </button>
              )}

              {/* Open in new tab link */}
              <div className="flex items-center justify-between text-xs pt-2">
                <a
                  id="preview-shared-link"
                  href={createdShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Preview as visitor</span>
                </a>

                <span className="text-[11px] text-zinc-500">
                  ID: <span className="font-mono">{createdShareId?.slice(0, 10)}...</span>
                </span>
              </div>

              {/* Management Note */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  You can revoke this link at any time in{' '}
                  <span className="text-zinc-200 font-medium">Settings → Privacy → Shared Chats</span>. Once revoked, the link immediately stops working.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="mt-5 border-t border-zinc-800/80 pt-4 flex items-center justify-end gap-2 shrink-0">
          {!createdShareUrl ? (
            <>
              <button
                id="cancel-share-btn"
                type="button"
                onClick={handleResetAndClose}
                disabled={isCreating}
                className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-page)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)] transition"
              >
                Cancel
              </button>
              <button
                id="confirm-create-share-btn"
                type="button"
                onClick={handleCreateShare}
                disabled={isCreating || shareableMessages.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--honk-accent)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating Link...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Create Share Link</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              id="done-share-btn"
              type="button"
              onClick={handleResetAndClose}
              className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
