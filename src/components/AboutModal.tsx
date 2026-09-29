import React from 'react';
import { X, Globe, Sparkles, User, ExternalLink, Code2, ShieldCheck, Zap } from 'lucide-react';
import { HonkLogo } from './HonkLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <HonkLogo size="md" glow />
            <div>
              <h2 id="about-modal-title" className="text-lg font-bold text-zinc-50">
                About Honk AI
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                Official AI Assistant created by Zyron
              </p>
            </div>
          </div>
          <button
            id="close-about-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5 text-sm leading-relaxed">
          {/* Main summary */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-zinc-200 font-medium">
              <strong className="text-amber-400">Honk AI is an AI assistant created by Zyron.</strong>
            </p>
            <p className="mt-1 text-zinc-300 text-xs leading-normal">
              Use Honk AI for AI chat, coding, creativity, images, and everyday assistance.
            </p>
          </div>

          {/* What Honk AI is */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              What Honk AI Is
            </h3>
            <p className="mt-1.5 text-zinc-300 text-xs sm:text-sm">
              Honk AI is a production-grade AI assistant platform engineered for conversational problem-solving, rapid software development, creative brainstorming, and everyday productivity. It combines multi-model intelligence with a responsive, developer-friendly interface.
            </p>
          </div>

          {/* What Honk AI does */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              What Honk AI Does
            </h3>
            <ul className="mt-2 space-y-2 text-xs sm:text-sm text-zinc-300">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span><strong>AI Chat & Writing:</strong> Provides instant, contextual responses to open-ended questions, research topics, and creative writing prompts.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span><strong>Coding & Debugging:</strong> Delivers code generation, refactoring, syntax highlighting, and architectural analysis across modern languages and frameworks.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span><strong>Multimodal Analysis:</strong> Handles image, document, and text attachments with full-screen inspection.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span><strong>Fair Usage Architecture:</strong> Features a secure, backend-enforced daily limit of 100 AI requests per user with an automatic 24-hour reset.</span>
              </li>
            </ul>
          </div>

          {/* Creator */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-400" />
              Creator
            </h3>
            <p className="mt-1.5 text-sm font-semibold text-zinc-100">
              Zyron
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Creator and lead developer of the Honk AI assistant platform.
            </p>
          </div>

          {/* Official Website Info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-amber-400" />
              Official Website Information
            </h3>
            <div className="mt-2 flex items-center justify-between gap-2">
              <a
                href="https://honk-ai-harshil.ai.studio/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm font-mono text-amber-400 hover:text-amber-300 underline flex items-center gap-1.5 truncate"
              >
                <span>https://honk-ai-harshil.ai.studio/</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full shrink-0">
                Official Domain
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Canonical URL for indexing, updates, and the official Honk AI web application.
            </p>
          </div>
        </div>

        {/* Footer Close */}
        <div className="mt-6 flex justify-end border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
