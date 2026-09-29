import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // 1. Detect iframe mode (AI Studio preview iframe)
    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }

    // 2. Detect standalone mode (already installed & opened from home screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // 3. Detect iOS and Mobile
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const mobile = ios || /android|mobile|touch/.test(ua);
    setIsIOS(ios);
    setIsMobile(mobile);

    // 4. Capture native browser install prompt (Chrome, Android, Edge, Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Register Service Worker for PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.debug('[PWA] Service worker registration note:', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger native browser install
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return choice.outcome;
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
      return 'unsupported';
    }
  }, [deferredPrompt]);

  // Download WebApp Desktop Shortcut launcher file
  const downloadDesktopShortcut = useCallback(() => {
    const url = window.location.origin || 'https://honk-ai-harshil.ai.studio';
    const shortcutContent = `[InternetShortcut]\nURL=${url}\nIconIndex=0\nIconFile=${url}/favicon.ico\n`;
    const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Honk AI.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isMobile,
    isIframe,
    deferredPrompt,
    promptInstall,
    downloadDesktopShortcut,
  };
}
