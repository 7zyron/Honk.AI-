import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Share,
  PlusSquare,
  Check,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { HonkLogo } from './HonkLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isMobile,
    isIframe,
    promptInstall,
    downloadDesktopShortcut,
  } = usePWAInstall();

  const [installSuccess, setInstallSuccess] = useState(false);
  const [downloadedShortcut, setDownloadedShortcut] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleOpenStandalone = () => {
    const targetUrl = window.location.origin || 'https://honk-ai-harshil.ai.studio';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadShortcut = () => {
    downloadDesktopShortcut();
    setDownloadedShortcut(true);
    setTimeout(() => setDownloadedShortcut(false), 3000);
  };

  return (
    <div
      id="download-app-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="download-app-modal-dialog"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl text-zinc-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <HonkLogo size="sm" glow alt="Honk AI App" />
            <div>
              <h3 className="text-base font-bold text-zinc-50 flex items-center gap-2">
                <span>Download Honk AI</span>
                <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  Home Screen App
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Install directly onto your device</p>
            </div>
          </div>
          <button
            id="download-modal-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-5 space-y-5 text-sm">
          {/* Main App Hero Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 p-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <HonkLogo size="lg" glow alt="Honk AI Official Logo" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 p-1 text-black shadow-md">
                <Download className="h-3 w-3" />
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Honk AI Assistant</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                Add Honk AI to your home screen for fast 1-tap access, offline readiness, and full-screen workspace.
              </p>
            </div>
          </div>

          {/* Already installed state */}
          {isInstalled && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs font-semibold">
                Honk AI is already installed and configured on this device!
              </p>
            </div>
          )}

          {installSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs font-semibold">
                Successfully added to your home screen! Check your home screen or app drawer.
              </p>
            </div>
          )}

          {/* Primary Action Button based on environment */}
          {isInstallable ? (
            <div className="space-y-2">
              <button
                id="modal-direct-install-btn"
                type="button"
                onClick={handleNativeInstall}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold py-3 px-4 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition cursor-pointer text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Add to Home Screen Now</span>
              </button>
              <p className="text-[11px] text-center text-zinc-400">
                Installs Honk AI directly with the official logo on your home screen.
              </p>
            </div>
          ) : isIframe ? (
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-zinc-200">Browser Security Notice</p>
                  <p className="text-zinc-400 mt-0.5 leading-normal">
                    You are currently viewing in a preview frame. To add Honk AI directly to your home screen or install the app, open in a full window:
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  id="modal-open-full-window-btn"
                  type="button"
                  onClick={handleOpenStandalone}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2.5 px-3 text-xs shadow-md transition cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Full Window to Install</span>
                </button>

                <button
                  id="modal-download-shortcut-btn"
                  type="button"
                  onClick={handleDownloadShortcut}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-semibold py-2.5 px-3 text-xs transition cursor-pointer"
                >
                  {downloadedShortcut ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      <span>Desktop Shortcut</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {/* Platform Specific Instructions Accordion / Guides */}
          <div className="space-y-3 pt-1">
            <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {isIOS ? 'Instructions for iPhone / iPad' : isMobile ? 'Instructions for Android' : 'Instructions for All Devices'}
            </h5>

            {/* iOS Guide */}
            {(isIOS || !isMobile) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Smartphone className="h-4 w-4 text-sky-400" />
                  <span>Apple iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
                  <li>
                    Open Honk AI in <strong className="text-zinc-200">Safari</strong>.
                  </li>
                  <li>
                    Tap the <strong className="text-zinc-200">Share</strong> icon{' '}
                    <Share className="inline h-3.5 w-3.5 text-sky-400" /> at the bottom or top bar.
                  </li>
                  <li>
                    Scroll down and tap{' '}
                    <strong className="text-amber-300">"Add to Home Screen"</strong>{' '}
                    <PlusSquare className="inline h-3.5 w-3.5 text-amber-400" />.
                  </li>
                  <li>
                    Tap <strong className="text-zinc-200">"Add"</strong> in the top right. Honk AI will appear immediately on your home screen with the official logo!
                  </li>
                </ol>
              </div>
            )}

            {/* Android Guide */}
            {(!isIOS || !isMobile) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span>Android (Chrome / Edge / Samsung Internet)</span>
                </div>
                <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
                  <li>
                    Tap the <strong className="text-zinc-200">three dots menu (⋮)</strong> in Chrome.
                  </li>
                  <li>
                    Tap <strong className="text-amber-300">"Install app"</strong> or{' '}
                    <strong className="text-amber-300">"Add to Home screen"</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-zinc-200">"Install"</strong> to confirm. Honk AI will be placed on your home screen and app launcher.
                  </li>
                </ol>
              </div>
            )}

            {/* Desktop Guide */}
            {!isMobile && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <Laptop className="h-4 w-4 text-purple-400" />
                    <span>Windows, Mac & Linux Desktop</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadShortcut}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Get Desktop File</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  In Google Chrome, Microsoft Edge, or Brave, click the{' '}
                  <strong className="text-zinc-200">Install</strong> icon in the address bar (on the right side) to install Honk AI as a standalone desktop application.
                </p>
              </div>
            )}
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 p-2 border border-zinc-800/60">
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Full screen without address bar</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 p-2 border border-zinc-800/60">
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Instant home screen launch</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 p-2 border border-zinc-800/60">
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Official Honk AI icon</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 p-2 border border-zinc-800/60">
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Free & zero storage bloat</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3 shrink-0 bg-zinc-900/90 text-xs text-zinc-400">
          <span>Created by Zyron</span>
          <button
            id="download-modal-done-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-3.5 py-1.5 font-medium text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
