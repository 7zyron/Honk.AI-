import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import {
  Conversation,
  Message,
  Attachment,
  UserProfile,
  DailyUsage,
  AppSettings,
} from './types';
import {
  loadConversations,
  saveConversations,
  loadActiveConvoId,
  saveActiveConvoId,
  loadUserProfile,
  saveUserProfile,
  loadSettings,
  saveSettings,
  INITIAL_CONVERSATION,
} from './lib/storage';
import { applyThemeAndAccent, DEFAULT_ACCENT_COLOR } from './lib/theme';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { SettingsPage } from './components/SettingsPage';
import { AboutModal } from './components/AboutModal';
import { AboutPage } from './components/AboutPage';
import { LanguageOnboardingScreen } from './components/LanguageOnboardingScreen';
import { ShareModal } from './components/ShareModal';
import { SharedChatView } from './components/SharedChatView';
import { AppStudioModal } from './components/AppStudioModal';
import { DownloadAppModal } from './components/DownloadAppModal';
import { ImportAppModal } from './components/ImportAppModal';
import { AppBuilderStudio } from './components/AppBuilderStudio';
import { PerformanceBenchmarkModal } from './components/PerformanceBenchmarkModal';
import { PhotoKheechoModal } from './components/PhotoKheechoModal';
import { HonkSearchModal } from './components/search/HonkSearchModal';
import { AgentMemoryModal } from './components/agent/AgentMemoryModal';
import { AgentBenchmarkModal } from './components/agent/AgentBenchmarkModal';
import { DeveloperAuthGate } from './components/developer/DeveloperAuthGate';
import { DeveloperImprovementCenter } from './components/developer/DeveloperImprovementCenter';
import { HonkShieldDashboard } from './components/shield/HonkShieldDashboard';
import { DeviceCenterModal } from './components/agent/DeviceCenterModal';
import { HonkImageGeneratorModal } from './components/HonkImageGeneratorModal';
import { verifyDeveloperSession } from './services/developerService';
import { streamAgentExecution } from './services/agentService';
import { AgentStage, AgentPlan, VerificationReport, AgentMetrics } from './types/agent';
import { WinterSnowfall } from './components/WinterSnowfall';
import { computeAndLogTimings } from './lib/performance';
import { HonkProject } from './lib/imports/types';

// Helper to format friendly AI error messages and clean up stringified JSON
function formatErrorMessage(err: unknown): string {
  if (!err) return 'Failed to communicate with Honk AI server';
  let message = typeof err === 'string' ? err : (err as Error).message || 'Failed to communicate with Honk AI server';

  let parsedSuccessfully = true;
  let depth = 0;
  while (parsedSuccessfully && depth < 5 && (message.startsWith('{') || message.startsWith('['))) {
    depth++;
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message && typeof parsed.error.message === 'string') {
        message = parsed.error.message;
      } else if (parsed?.message && typeof parsed.message === 'string') {
        message = parsed.message;
      } else if (parsed?.error && typeof parsed.error === 'string') {
        message = parsed.error;
      } else {
        parsedSuccessfully = false;
      }
    } catch {
      parsedSuccessfully = false;
    }
  }

  const lower = message.toLowerCase();
  if (lower.includes('high demand') || lower.includes('spikes in demand') || lower.includes('503') || lower.includes('unavailable')) {
    return 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again in a few moments.';
  }
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('resource_exhausted')) {
    return 'AI rate limit reached. Please wait a moment before sending another message.';
  }

  return message;
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvoId, setActiveConvoId] = useState<string>(loadActiveConvoId);
  const [currentUser, setCurrentUser] = useState<UserProfile>(loadUserProfile);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [usage, setUsage] = useState<DailyUsage | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetConvo, setShareTargetConvo] = useState<Conversation | null>(null);
  const [isAppStudioOpen, setIsAppStudioOpen] = useState(false);
  const [appStudioInitialPrompt, setAppStudioInitialPrompt] = useState('');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [isPhotoKheechoOpen, setIsPhotoKheechoOpen] = useState(false);
  const [isHonkSearchOpen, setIsHonkSearchOpen] = useState(false);
  const [honkSearchInitialQuery, setHonkSearchInitialQuery] = useState('');
  const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
  const [imageGeneratorInitialPrompt, setImageGeneratorInitialPrompt] = useState('');
  const [activeStudioProject, setActiveStudioProject] = useState<HonkProject | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Honk Agent Architecture State - Permanently Built-In for All Chats
  const [isHeavyTask, setIsHeavyTask] = useState(true);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isAgentBenchmarkModalOpen, setIsAgentBenchmarkModalOpen] = useState(false);
  const [isDeveloperAuthOpen, setIsDeveloperAuthOpen] = useState(false);
  const [isDeveloperCenterOpen, setIsDeveloperCenterOpen] = useState(false);
  const [isShieldOpen, setIsShieldOpen] = useState(false);
  const [isDeviceCenterOpen, setIsDeviceCenterOpen] = useState(false);
  const [confirmedActions, setConfirmedActions] = useState<string[]>([]);

  // Verify Developer Session on mount
  useEffect(() => {
    verifyDeveloperSession().then((session) => {
      if (session) {
        setCurrentUser((prev) => ({
          ...prev,
          role: 'DEVELOPER',
          developerToken: session.token,
        }));
      }
    });
  }, []);
  const [agentExecutionState, setAgentExecutionState] = useState<{
    currentStage?: AgentStage;
    plan?: AgentPlan | null;
    verificationReport?: VerificationReport | null;
    metrics?: AgentMetrics | null;
    isExecuting?: boolean;
    onAuthorizeAction?: (actionType: string) => void;
    permissionRequest?: {
      actionType: string;
      description: string;
      targetResource: string;
    } | null;
  } | null>(null);

  // Client-side route management for /, /about, /share/:shareId, /app-studio, /photo-kheecho, /search
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      if (path === '/app-studio' || path === '/create-app') {
        setTimeout(() => setIsAppStudioOpen(true), 0);
      } else if (path === '/photo-kheecho' || path === '/camera' || path === '/vision') {
        setTimeout(() => setIsPhotoKheechoOpen(true), 0);
      } else if (path === '/shield' || path === '/honk-shield') {
        setTimeout(() => setIsShieldOpen(true), 0);
      } else if (path === '/devices' || path === '/device-center') {
        setTimeout(() => setIsDeviceCenterOpen(true), 0);
      } else if (path === '/image' || path === '/image-generator' || path === '/images') {
        setTimeout(() => setIsImageGeneratorOpen(true), 0);
      } else if (path === '/search' || path === '/honk-search') {
        // OpenSearch query parameter support (?q=...)
        const searchParams = new URLSearchParams(window.location.search);
        const queryParam = searchParams.get('q') || '';
        if (queryParam) {
          setHonkSearchInitialQuery(queryParam);
        }
        setTimeout(() => setIsHonkSearchOpen(true), 0);
      }
      return path;
    }
    return '/';
  });

  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      if (path === '/app-studio' || path === '/create-app') {
        setIsAppStudioOpen(true);
      } else if (path === '/photo-kheecho' || path === '/camera' || path === '/vision') {
        setIsPhotoKheechoOpen(true);
      } else if (path === '/shield' || path === '/honk-shield') {
        setIsShieldOpen(true);
      } else if (path === '/devices' || path === '/device-center') {
        setIsDeviceCenterOpen(true);
      } else if (path === '/image' || path === '/image-generator' || path === '/images') {
        setIsImageGeneratorOpen(true);
      } else if (path === '/search' || path === '/honk-search') {
        // OpenSearch query parameter support (?q=...)
        const searchParams = new URLSearchParams(window.location.search);
        const queryParam = searchParams.get('q') || '';
        if (queryParam) {
          setHonkSearchInitialQuery(queryParam);
        }
        setIsHonkSearchOpen(true);
      }
    };

    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  const handleOpenHonkSearch = useCallback((initialQuery?: string) => {
    setHonkSearchInitialQuery(initialQuery || '');
    setIsHonkSearchOpen(true);
  }, []);

  const handleOpenAppStudio = useCallback((prompt?: string) => {
    setAppStudioInitialPrompt(prompt || '');
    setIsAppStudioOpen(true);
  }, []);

  const handleOpenImageGenerator = useCallback((prompt?: string) => {
    setImageGeneratorInitialPrompt(prompt || '');
    setIsImageGeneratorOpen(true);
  }, []);

  const handleSendImageToMainChat = useCallback((imageUrl: string, promptText: string, modelUsed: string) => {
    const assistantMsgId = 'msg_' + Date.now();
    const newMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'complete',
      model: 'honk-image',
      generatedImage: {
        id: `img_${Date.now()}`,
        imageUrl,
        prompt: promptText,
        aspectRatio: '1:1',
        resolution: '1K',
        model: modelUsed,
      },
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvoId
          ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }
          : c
      )
    );
  }, [activeConvoId]);

  const navigateTo = (path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  const openAbout = () => {
    navigateTo('/about');
  };

  const closeAbout = () => {
    navigateTo('/');
  };

  const openSettings = () => {
    navigateTo('/settings');
  };

  const closeSettings = () => {
    navigateTo('/');
  };

  // AbortController ref for canceling generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save changes to local storage (isolated per user)
  useEffect(() => {
    saveConversations(conversations, false, currentUser.id);
  }, [conversations, currentUser.id]);

  useEffect(() => {
    saveActiveConvoId(activeConvoId, currentUser.id);
  }, [activeConvoId, currentUser.id]);

  useEffect(() => {
    saveUserProfile(currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveSettings(settings, currentUser.id);
  }, [settings, currentUser.id]);

  // Apply theme & accent color immediately whenever settings change
  useEffect(() => {
    applyThemeAndAccent(settings.theme, settings.accentColor || DEFAULT_ACCENT_COLOR);

    // If theme is system, listen for OS color-scheme changes
    if (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        applyThemeAndAccent('system', settings.accentColor || DEFAULT_ACCENT_COLOR);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme, settings.accentColor]);

  // Sync settings to server preferences if user is authenticated or guest
  useEffect(() => {
    if (currentUser?.id) {
      fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          theme: settings.theme,
          accentColor: settings.accentColor,
          selectedCountry: settings.selectedCountry,
          selectedLanguage: settings.selectedLanguage,
          lowDataMode: settings.lowDataMode,
        }),
      }).catch((err) => console.warn('Could not sync preferences to server', err));
    }
  }, [settings.theme, settings.accentColor, settings.selectedCountry, settings.selectedLanguage, settings.lowDataMode, currentUser.id]);

  // Fetch usage quota from server for current user
  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/quota', {
        headers: {
          'x-user-id': currentUser.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsage({
          limit: data.limit || 100,
          used: data.used || 0,
          remaining: typeof data.remaining === 'number' ? data.remaining : 100,
          resetAt: data.resetAt || (Date.now() + 86400000),
        });
      }
    } catch (err) {
      console.warn('Could not retrieve quota stats from backend', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Birthday celebration state
  const [birthdayWish, setBirthdayWish] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (currentUser?.birthday?.month && currentUser?.birthday?.day) {
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // 1-12
      const currentDay = today.getDate(); // 1-31
      const currentYear = today.getFullYear();

      if (
        currentUser.birthday.month === currentMonth &&
        currentUser.birthday.day === currentDay
      ) {
        const wishKey = `honk_bday_wished_${currentUser.id}_${currentYear}`;
        const alreadyWished = localStorage.getItem(wishKey);
        if (!alreadyWished) {
          setBirthdayWish({ name: currentUser.name || 'Honker' });
        }
      } else {
        setBirthdayWish(null);
      }
    } else {
      setBirthdayWish(null);
    }
  }, [currentUser.id, currentUser.birthday]);

  const handleDismissBirthdayWish = () => {
    if (currentUser) {
      const currentYear = new Date().getFullYear();
      localStorage.setItem(`honk_bday_wished_${currentUser.id}_${currentYear}`, 'true');
    }
    setBirthdayWish(null);
  };

  const handleCelebrateBirthdayWithHonk = () => {
    handleDismissBirthdayWish();
    handleSendMessage("It's my birthday today! 🎂🎉", []);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    const prevId = currentUser.id;
    setCurrentUser(updatedUser);
    saveUserProfile(updatedUser);
    if (updatedUser.id !== prevId) {
      const userConvos = loadConversations(updatedUser.id);
      setConversations(userConvos);
      if (userConvos[0]) setActiveConvoId(userConvos[0].id);
      setSettings(loadSettings(updatedUser.id));
    }
    setIsAuthModalOpen(false);
  };

  const handleSignOut = () => {
    const guestUser: UserProfile = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Guest User',
      email: '',
      avatar: '',
      isGuest: true,
      isAuthenticated: false,
      createdAt: Date.now(),
      birthday: null,
    };
    saveUserProfile(guestUser);
    setCurrentUser(guestUser);
    const guestConvos = loadConversations(guestUser.id);
    setConversations(guestConvos);
    if (guestConvos[0]) setActiveConvoId(guestConvos[0].id);
    setSettings(loadSettings(guestUser.id));
    setIsAuthModalOpen(false);
  };

  // Auto-collapse sidebar when focus mode is turned on
  useEffect(() => {
    if (settings.focusMode) {
      setSidebarOpen(false);
    }
  }, [settings.focusMode]);

  // Global keyboard shortcuts (Cmd+K for new chat, Shift+F for focus mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K -> New Chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Shift + F -> Toggle Focus Mode (when not typing in textarea or input)
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!isInputFocused && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, focusMode: !prev.focusMode }));
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active conversation helper
  const currentConversation =
    conversations.find((c) => c.id === activeConvoId) || conversations[0] || null;

  // New Chat
  const handleNewChat = () => {
    const newConvoId = 'convo_' + Math.random().toString(36).substring(2, 9);
    const activeModel = settings.selectedModel || currentConversation?.model || 'honk-flash';
    const newConvo: Conversation = {
      id: newConvoId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: activeModel,
      messages: [],
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveConvoId(newConvoId);
    setErrorBanner(null);
  };

  // Delete conversation
  const handleDeleteConvo = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        return [INITIAL_CONVERSATION];
      }
      if (activeConvoId === id) {
        setActiveConvoId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Rename conversation
  const handleRenameConvo = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Toggle Pin
  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  // Select Model
  const handleSelectModel = (modelId: string) => {
    // 1. Update settings & persist to storage
    setSettings((prev) => {
      const updated = { ...prev, selectedModel: modelId };
      saveSettings(updated);
      return updated;
    });

    // 2. Update active conversation model
    if (currentConversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversation.id ? { ...c, model: modelId, updatedAt: Date.now() } : c
        )
      );
    }
  };

  // Stop Generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Execute AI chat stream request
  const executeChatRequest = async (
    convoId: string,
    historyMessages: Message[],
    modelId: string,
    assistantMsgId: string,
    t0_sendClicked: number = performance.now()
  ) => {
    const t1_requestCreated = performance.now();
    setIsGenerating(true);
    setErrorBanner(null);

    if ((import.meta as any).env?.DEV) {
      console.log('[HONK DEBUG]', {
        selectedModel: modelId,
        selectedLanguage: settings.selectedLanguage,
        requestModel: modelId,
        requestLanguage: settings.selectedLanguage,
      });
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
          'x-user-id': currentUser.id,
          'x-honk-send-time': Date.now().toString(),
        },
        body: JSON.stringify({
          clientStartTime: Date.now(),
          messages: historyMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          model: modelId,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          stream: settings.stream,
          enableWebSearch: settings.enableWebSearch,
          lowData: settings.lowDataMode,
          language: settings.selectedLanguage,
        }),
        signal: abortController.signal,
      });

      // Handle HTTP 429 Daily Limit Reached
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || 'Daily limit reached — try again tomorrow';

        setErrorBanner(message);
        setUsage((prev) => (prev ? { ...prev, remaining: 0, used: 100 } : null));

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, status: 'error', error: message, content: `⚠️ **${message}**` }
                  : m
              ),
            };
          })
        );
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || `Server returned error (${response.status})`;
        throw new Error(message);
      }

      // Handle Streaming SSE response
      if (settings.stream && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let buffer = '';
        let streamError: string | null = null;
        let isFirstChunk = true;
        let t5_firstChunkReceived = 0;
        let t6_firstTokenRendered = 0;
        let serverTimings: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.replace(/^data: /, '');
              let data: any = null;
              try {
                data = JSON.parse(jsonStr);
              } catch {
                continue;
              }

              if (data?.type === 'chunk' && data.text) {
                if (isFirstChunk) {
                  isFirstChunk = false;
                  t5_firstChunkReceived = performance.now();
                  serverTimings = data.timings;
                  requestAnimationFrame(() => {
                    t6_firstTokenRendered = performance.now();
                  });
                }

                accumulatedText += data.text;
                // Render chunk immediately to the DOM without delay
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== convoId) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: accumulatedText, status: 'streaming' }
                          : m
                      ),
                    };
                  })
                );
              } else if (data?.type === 'done') {
                if (data?.deviceStep?.url && data?.deviceStep?.verified && typeof window !== 'undefined') {
                  try {
                    window.open(data.deviceStep.url, '_blank');
                  } catch {}
                }
                if (data.usage) {
                  setUsage(data.usage);
                }
                if (data.timings && !serverTimings) {
                  serverTimings = data.timings;
                }
              } else if (data?.type === 'error') {
                streamError = data.error || 'AI generation failed';
                break;
              }
            }
          }

          if (streamError) {
            break;
          }
        }

        if (streamError) {
          throw new Error(streamError);
        }

        const t7_streamCompleted = performance.now();
        if (t5_firstChunkReceived === 0) t5_firstChunkReceived = t7_streamCompleted;
        if (t6_firstTokenRendered === 0) t6_firstTokenRendered = t5_firstChunkReceived + 2;

        const ttftMs = Math.round(t5_firstChunkReceived - t0_sendClicked);
        const firstRenderMs = Math.round(t6_firstTokenRendered - t0_sendClicked);
        const totalDurationMs = Math.round(t7_streamCompleted - t0_sendClicked);

        const latencyTimings = computeAndLogTimings(
          {
            t0_sendClicked,
            t1_requestCreated,
            t2_backendReceived: serverTimings?.backendReceivedAt,
            t3_aiRequestStarted: serverTimings?.aiRequestStartedAt,
            t4_firstAiToken: serverTimings?.firstAiTokenAt,
            t5_firstChunkReceived,
            t6_firstTokenRendered,
            t7_streamCompleted,
            ttftMs,
            firstRenderMs,
            totalDurationMs,
            modelUsed: modelId,
          },
          true
        );

        // Finalize message status with measured latency timings
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: accumulatedText || '*(No output generated)*',
                      status: 'complete',
                      latencyTimings,
                    }
                  : m
              ),
            };
          })
        );
      } else {
        // Non-streaming response
        const data = await response.json();
        if (data.deviceStep?.url && data.deviceStep?.verified && typeof window !== 'undefined') {
          try {
            window.open(data.deviceStep.url, '_blank');
          } catch {}
        }
        if (data.usage) {
          setUsage(data.usage);
        }

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: data.reply || '*(No response)*',
                      status: 'complete',
                    }
                  : m
              ),
            };
          })
        );
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // Stopped by user
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, status: 'complete' } : m
              ),
            };
          })
        );
      } else {
        const errorMsg = formatErrorMessage(err);
        setErrorBanner(errorMsg);

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, status: 'error', error: errorMsg, content: '' }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      fetchUsage();
    }
  };

  // Helper to detect image generation intent
  const isImageIntent = (text: string): boolean => {
    const t = text.trim();
    if (t.toLowerCase().startsWith('/image')) return true;
    return /^(please\s+)?(generate|create|make|draw|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|drawing|render|graphic)\b/i.test(t);
  };

  const cleanImagePrompt = (text: string): string => {
    let clean = text.trim();
    if (clean.toLowerCase().startsWith('/image')) {
      clean = clean.substring(6).trim();
    } else {
      clean = clean.replace(/^(please\s+)?(generate|create|make|draw|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|drawing|render|graphic)\s+(of\s+|about\s+|showing\s+)?/i, '').trim();
    }
    return clean || text.trim();
  };

  // Execute Honk AI Image request
  const executeImageRequest = async (
    convoId: string,
    promptText: string,
    assistantMsgId: string,
    aspectRatio: string = '1:1',
    resolution: string = '1K'
  ) => {
    setIsGenerating(true);
    setErrorBanner(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          prompt: promptText,
          aspectRatio,
          resolution,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let rawError = errorData.error;
        if (
          rawError &&
          (rawError.includes('Gemini') ||
            rawError.includes('Google') ||
            rawError.includes('API_KEY') ||
            rawError.includes('billing'))
        ) {
          rawError = undefined;
        }
        const message =
          rawError ||
          (response.status === 429
            ? 'Image generation service is temporarily busy. Please try again in a moment.'
            : 'Image generation failed. Please try again.');

        setErrorBanner(message);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      status: 'error',
                      isGeneratingImage: false,
                      error: message,
                      content: `⚠️ **${message}**`,
                    }
                  : m
              ),
            };
          })
        );
        return;
      }

      const data = await response.json();
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convoId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    status: 'complete',
                    isGeneratingImage: false,
                    model: 'honk-image',
                    content: '',
                    generatedImage: {
                      id: data.id,
                      imageUrl: data.imageUrl,
                      prompt: promptText,
                      aspectRatio: data.aspectRatio || aspectRatio,
                      resolution: data.resolution || resolution,
                      model: data.model || 'Honk AI Image',
                    },
                  }
                : m
            ),
          };
        })
      );
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      status: 'complete',
                      isGeneratingImage: false,
                      content: '*(Image generation canceled)*',
                    }
                  : m
              ),
            };
          })
        );
      } else {
        const errorMsg = formatErrorMessage(err);
        setErrorBanner(errorMsg);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convoId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      status: 'error',
                      isGeneratingImage: false,
                      error: errorMsg,
                      content: `⚠️ **${errorMsg}**`,
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      fetchUsage();
    }
  };

  // Send new user message
  const handleSendMessage = async (
    content: string,
    attachments: Attachment[],
    imageOptions?: { isImage: boolean; aspectRatio: string; resolution: string }
  ) => {
    if (!currentConversation) return;

    const wantsImage =
      (imageOptions?.isImage || isImageIntent(content)) && attachments.length === 0;

    const userMessage: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
      status: 'complete',
    };

    const activeModelId = currentConversation.model || settings.selectedModel || 'honk-flash';
    const assistantMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: wantsImage ? 'honk-image' : activeModelId,
      status: 'streaming',
      isGeneratingImage: wantsImage,
    };

    // Auto-generate a title from the first message
    const isFirstMessage = currentConversation.messages.length === 0;
    const title = isFirstMessage
      ? content.slice(0, 32).trim() || 'New Discussion'
      : currentConversation.title;

    const updatedConvoMessages = [...currentConversation.messages, userMessage, assistantMessage];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id
          ? {
              ...c,
              title,
              model: activeModelId,
              updatedAt: Date.now(),
              messages: updatedConvoMessages,
            }
          : c
      )
    );

    if (wantsImage) {
      const promptToGenerate = cleanImagePrompt(content);
      const ratio = imageOptions?.aspectRatio || '1:1';
      const quality = imageOptions?.resolution || '1K';
      await executeImageRequest(
        currentConversation.id,
        promptToGenerate,
        assistantMsgId,
        ratio,
        quality
      );
    } else {
      const isAgentTriggered = isHeavyTask || /agent|orchestrat|multi-step|subtask|heavy task/i.test(content);
      if (isAgentTriggered) {
        await executeAgentRequest(
          currentConversation.id,
          [...currentConversation.messages, userMessage],
          content,
          assistantMsgId
        );
      } else {
        // Run backend call
        await executeChatRequest(
          currentConversation.id,
          [...currentConversation.messages, userMessage],
          activeModelId,
          assistantMsgId
        );
      }
    }
  };

  // Dedicated voice handler that returns the synthesized text for instant speech playback
  const handleSendVoiceMessage = async (
    content: string,
    onChunk?: (chunk: string) => void
  ): Promise<string | undefined> => {
    if (!currentConversation) return undefined;

    const activeModelId = currentConversation.model || settings.selectedModel || 'honk-flash';
    const userMessage: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'complete',
    };

    const assistantMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: activeModelId,
      status: 'streaming',
    };

    const isFirstMessage = currentConversation.messages.length === 0;
    const title = isFirstMessage
      ? content.slice(0, 32).trim() || 'Voice Discussion'
      : currentConversation.title;

    const updatedConvoMessages = [...currentConversation.messages, userMessage, assistantMessage];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id
          ? {
              ...c,
              title,
              model: activeModelId,
              updatedAt: Date.now(),
              messages: updatedConvoMessages,
            }
          : c
      )
    );

    setIsGenerating(true);
    setErrorBanner(null);

    if ((import.meta as any).env?.DEV) {
      console.log('[HONK DEBUG]', {
        selectedModel: activeModelId,
        selectedLanguage: settings.selectedLanguage,
        requestModel: activeModelId,
        requestLanguage: settings.selectedLanguage,
      });
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const historyToSend = [...currentConversation.messages, userMessage];
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          messages: historyToSend.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          model: activeModelId,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          stream: true,
          enableWebSearch: settings.enableWebSearch,
          lowData: settings.lowDataMode,
          language: settings.selectedLanguage,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${response.status})`);
      }

      let accumulatedText = '';

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data?.type === 'chunk' && data.text) {
                accumulatedText += data.text;
                onChunk?.(data.text);
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== currentConversation.id) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: accumulatedText, status: 'streaming' }
                          : m
                      ),
                    };
                  })
                );
              } else if (data?.type === 'done') {
                if (data.usage) {
                  setUsage(data.usage);
                }
              }
            } catch {
              // Ignore parse error on malformed chunk
            }
          }
        }
      } else {
        const data = await response.json();
        accumulatedText = data.content || '';
        onChunk?.(accumulatedText);
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConversation.id) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: accumulatedText,
                    status: 'complete',
                  }
                : m
            ),
          };
        })
      );

      return accumulatedText;
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err);
      setErrorBanner(errorMsg);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? { ...m, status: 'error', error: errorMsg, content: `⚠️ **${errorMsg}**` }
                : m
            ),
          };
        })
      );
      throw err;
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      fetchUsage();
    }
  };

  // Execute Agent Request with Multi-Worker Planning, Sandboxing & Verification
  const executeAgentRequest = async (
    conversationId: string,
    history: Message[],
    prompt: string,
    assistantMsgId: string,
    explicitConfirmedActions?: string[]
  ) => {
    setIsGenerating(true);
    setErrorBanner(null);
    setAgentExecutionState({
      currentStage: 'understand',
      plan: null,
      verificationReport: null,
      metrics: null,
      isExecuting: true,
      permissionRequest: null,
      onAuthorizeAction: (actionType: string) => {
        setConfirmedActions((prev) => [...prev, actionType]);
        executeAgentRequest(conversationId, history, prompt, assistantMsgId, [
          ...confirmedActions,
          actionType,
        ]);
      },
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let accumulatedText = '';

    try {
      await streamAgentExecution(
        {
          prompt,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          isHeavyTask: true,
          userId: currentUser.id,
          confirmedActions: explicitConfirmedActions || confirmedActions,
        },
        (event) => {
          if (event.type === 'stage_change') {
            setAgentExecutionState((prev) => ({
              ...prev,
              currentStage: event.stage,
              isExecuting: event.stage !== 'complete',
            }));
          } else if (event.type === 'plan_created') {
            setAgentExecutionState((prev) => ({
              ...prev,
              plan: event.data?.plan as AgentPlan,
            }));
          } else if (event.type === 'subtask_start' || event.type === 'subtask_complete') {
            setAgentExecutionState((prev) => {
              if (!prev?.plan) return prev;
              const subtaskId = event.data?.subtaskId as string;
              return {
                ...prev,
                plan: {
                  ...prev.plan,
                  subtasks: prev.plan.subtasks.map((st) =>
                    st.id === subtaskId
                      ? {
                          ...st,
                          status: event.type === 'subtask_complete' ? 'completed' : 'running',
                          executionTimeMs:
                            typeof event.data?.durationMs === 'number'
                              ? (event.data.durationMs as number)
                              : st.executionTimeMs,
                        }
                      : st
                  ),
                },
              };
            });
          } else if (event.type === 'verification_result') {
            setAgentExecutionState((prev) => ({
              ...prev,
              verificationReport: event.data?.report as VerificationReport,
            }));
          } else if (event.type === 'permission_required') {
            setAgentExecutionState((prev) => ({
              ...prev,
              permissionRequest: event.data as any,
            }));
          } else if (event.type === 'complete') {
            setAgentExecutionState((prev) => ({
              ...prev,
              currentStage: 'complete',
              isExecuting: false,
              metrics: event.data?.metrics as AgentMetrics,
            }));
          }
        },
        (delta) => {
          accumulatedText += delta;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: accumulatedText, status: 'streaming' }
                        : m
                    ),
                  }
                : c
            )
          );
        },
        abortController.signal
      );

      // Finalize completed message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedText, status: 'complete' }
                    : m
                ),
              }
            : c
        )
      );
      fetchUsage();
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        const errorMsg = formatErrorMessage(err);
        setErrorBanner(errorMsg);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, status: 'error', error: errorMsg, content: `⚠️ **${errorMsg}**` }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      setAgentExecutionState((prev) => (prev ? { ...prev, isExecuting: false } : null));
      fetchUsage();
    }
  };

  // Regenerate image
  const handleRegenerateImage = async (messageId: string) => {
    if (!currentConversation || isGenerating) return;

    const targetMsg = currentConversation.messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    let prompt = targetMsg.generatedImage?.prompt;
    if (!prompt) {
      const idx = currentConversation.messages.findIndex((m) => m.id === messageId);
      if (idx > 0) {
        prompt = cleanImagePrompt(currentConversation.messages[idx - 1].content);
      }
    }
    prompt = prompt || 'AI generated artwork';
    const aspect = targetMsg.generatedImage?.aspectRatio || '1:1';
    const resolution = targetMsg.generatedImage?.resolution || '1K';

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== currentConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  status: 'streaming',
                  isGeneratingImage: true,
                  error: undefined,
                  content: '',
                  generatedImage: undefined,
                }
              : m
          ),
        };
      })
    );

    await executeImageRequest(currentConversation.id, prompt, messageId, aspect, resolution);
  };

  // Regenerate response
  const handleRegenerateMessage = async (assistantMessageId: string) => {
    if (!currentConversation || isGenerating) return;

    const msgIndex = currentConversation.messages.findIndex((m) => m.id === assistantMessageId);
    if (msgIndex === -1) return;

    // Everything before the assistant message
    const historyBefore = currentConversation.messages.slice(0, msgIndex);
    if (historyBefore.length === 0) return;

    const newAssistantMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const targetMsg = currentConversation.messages[msgIndex];
    const priorUserMsg = historyBefore[historyBefore.length - 1];

    if (
      targetMsg.generatedImage ||
      targetMsg.isGeneratingImage ||
      targetMsg.model === 'honk-image' ||
      targetMsg.model === 'gemini-3.1-flash-image' ||
      (priorUserMsg && isImageIntent(priorUserMsg.content))
    ) {
      const prompt =
        targetMsg.generatedImage?.prompt ||
        (priorUserMsg ? cleanImagePrompt(priorUserMsg.content) : 'AI generated artwork');
      const aspect = targetMsg.generatedImage?.aspectRatio || '1:1';
      const resolution = targetMsg.generatedImage?.resolution || '1K';

      const replacementAssistantMessage: Message = {
        id: newAssistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: 'honk-image',
        status: 'streaming',
        isGeneratingImage: true,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversation.id
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: [...historyBefore, replacementAssistantMessage],
              }
            : c
        )
      );

      await executeImageRequest(
        currentConversation.id,
        prompt,
        newAssistantMsgId,
        aspect,
        resolution
      );
      return;
    }

    const activeModelId = currentConversation.model || settings.selectedModel || 'honk-flash';
    const replacementAssistantMessage: Message = {
      id: newAssistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: activeModelId,
      status: 'streaming',
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...historyBefore, replacementAssistantMessage],
            }
          : c
      )
    );

    if (isHeavyTask) {
      await executeAgentRequest(
        currentConversation.id,
        historyBefore,
        priorUserMsg?.content || '',
        newAssistantMsgId
      );
    } else {
      await executeChatRequest(
        currentConversation.id,
        historyBefore,
        activeModelId,
        newAssistantMsgId
      );
    }
  };

  // Edit previous user message and fork/resubmit
  const handleEditMessage = async (userMessageId: string, newContent: string) => {
    if (!currentConversation || isGenerating) return;

    const msgIndex = currentConversation.messages.findIndex((m) => m.id === userMessageId);
    if (msgIndex === -1) return;

    const targetUserMsg = currentConversation.messages[msgIndex];
    const updatedUserMsg: Message = {
      ...targetUserMsg,
      content: newContent,
      timestamp: Date.now(),
    };

    const priorHistory = currentConversation.messages.slice(0, msgIndex);
    const historyForPrompt = [...priorHistory, updatedUserMsg];

    const activeModelId = currentConversation.model || settings.selectedModel || 'honk-flash';
    const newAssistantMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const newAssistantMsg: Message = {
      id: newAssistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: activeModelId,
      status: 'streaming',
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...historyForPrompt, newAssistantMsg],
            }
          : c
      )
    );

    await executeChatRequest(
      currentConversation.id,
      historyForPrompt,
      activeModelId,
      newAssistantMsgId
    );
  };

  // Rating
  const handleRateMessage = (messageId: string, rating: 'like' | 'dislike') => {
    if (!currentConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, rating: m.rating === rating ? null : rating } : m
              ),
            }
          : c
      )
    );
  };

  // Reset Quota endpoint call
  const handleResetUsage = async () => {
    try {
      const res = await fetch('/api/quota/reset', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
        setErrorBanner(null);
      }
    } catch (err) {
      console.error('Failed to reset usage', err);
    }
  };

  // Simulate limit reached (100 messages)
  const handleSimulateLimit = async (count: number) => {
    try {
      const res = await fetch('/api/quota/set-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to simulate quota limit', err);
    }
  };

  const handleOpenPhotoKheecho = () => {
    setIsPhotoKheechoOpen(true);
  };

  const handleSendPhotoToMainChat = (image: string, analysisMarkdown: string, category: string) => {
    const convoId = activeConvoId;
    const userMsgId = 'msg-' + Date.now();
    const assistantMsgId = 'msg-' + (Date.now() + 1);

    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: `📸 **Photo Kheecho Analysis** [${category}]\n*Image captured and analyzed with Honk AI*`,
      timestamp: Date.now(),
      attachments: [
        {
          id: 'att-' + Date.now(),
          name: `photo-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
          type: 'image',
          size: Math.round((image.length * 3) / 4),
          dataUrl: image,
        },
      ],
    };

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: analysisMarkdown,
      timestamp: Date.now() + 1,
      model: 'honk-vision',
    };

    setConversations((prev) => {
      return prev.map((c) => {
        if (c.id !== convoId) return c;
        const newTitle = c.messages.length === 0 ? `Photo: ${category}` : c.title;
        return {
          ...c,
          title: newTitle,
          updatedAt: Date.now(),
          messages: [...c.messages, userMsg, assistantMsg],
        };
      });
    });
  };

  const handleCompleteLanguageOnboarding = (countryCode: string, langCode: string) => {
    const updated: AppSettings = {
      ...settings,
      selectedCountry: countryCode,
      selectedLanguage: langCode,
      hasCompletedLanguageOnboarding: true,
    };
    setSettings(updated);
    saveSettings(updated);
  };

  if (currentPath === '/about') {
    return <AboutPage onNavigateHome={() => navigateTo('/')} />;
  }

  if (activeStudioProject) {
    return (
      <AppBuilderStudio
        project={activeStudioProject}
        onBack={() => setActiveStudioProject(null)}
        onUpdateProject={(updated) => setActiveStudioProject(updated)}
      />
    );
  }

  if (currentPath === '/settings') {
    return (
      <SettingsPage
        settings={settings}
        onUpdateSettings={setSettings}
        usage={usage}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onSignOut={handleSignOut}
        onResetUsage={handleResetUsage}
        onSimulateLimit={handleSimulateLimit}
        conversations={conversations}
        onImportConversations={(convos) => {
          setConversations(convos);
          if (convos[0]) setActiveConvoId(convos[0].id);
        }}
        onClearAllConversations={() => {
          setConversations([INITIAL_CONVERSATION]);
          setActiveConvoId(INITIAL_CONVERSATION.id);
        }}
        onNavigateHome={closeSettings}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenStudio={(project) => {
          closeSettings();
          setActiveStudioProject(project);
        }}
        onOpenDeveloperCenter={() => setIsDeveloperCenterOpen(true)}
        onOpenDeveloperAuth={() => setIsDeveloperAuthOpen(true)}
      />
    );
  }

  // Handle asking Honk about a synthesized search finding
  const handleAskHonkAboutSearch = (query: string, summary: string, sources: Array<{ title: string; url: string }>) => {
    setIsHonkSearchOpen(false);
    const sourcesText = sources && sources.length > 0
      ? '\n\n**Sources:**\n' + sources.map((s, idx) => `${idx + 1}. [${s.title || s.url}](${s.url})`).join('\n')
      : '';
    const promptText = `Can you explain more about this search finding?\n\n**Search Query:** ${query}\n\n**1 HONK Synthesized Answer:**\n${summary}${sourcesText}`;
    handleSendMessage(promptText, []);
  };

  // Dedicated Read-Only Shared Chat Page: /share/:shareId (Accessible without authentication/onboarding)
  const shareMatch = currentPath.match(/^\/share\/([a-zA-Z0-9_-]+)/);
  if (shareMatch && shareMatch[1]) {
    return <SharedChatView shareId={shareMatch[1]} onNavigateHome={() => navigateTo('/')} />;
  }

  // Language Selection Gate: Before user enters the chat for the first time,
  // require country and language selection and do not show chat interface until chosen.
  if (!settings.hasCompletedLanguageOnboarding) {
    return (
      <LanguageOnboardingScreen
        onCompleteOnboarding={handleCompleteLanguageOnboarding}
        defaultCountry={settings.selectedCountry || 'IN'}
        defaultLanguage={settings.selectedLanguage || 'en-IN'}
      />
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-main)] font-sans antialiased selection:bg-[var(--honk-accent-subtle)] selection:text-[var(--honk-accent-text)]">
      {/* Seasonal Winter Snowfall Background (Behind chat, sidebar & all UI layers) */}
      <WinterSnowfall mode={settings.winterMode} isLowData={settings.lowDataMode} />

      {/* Sidebar with search, groups & user badge */}
      <Sidebar
        conversations={conversations}
        activeConvoId={activeConvoId}
        onSelectConvo={(id) => {
          setActiveConvoId(id);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onDeleteConvo={handleDeleteConvo}
        onRenameConvo={handleRenameConvo}
        onTogglePin={handleTogglePin}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSettings={openSettings}
        onOpenAbout={openAbout}
        onShareConvo={(convo) => {
          setShareTargetConvo(convo);
          setIsShareModalOpen(true);
        }}
        onOpenAppStudio={() => handleOpenAppStudio()}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenDownloadApp={() => setIsDownloadModalOpen(true)}
        onOpenPhotoKheecho={handleOpenPhotoKheecho}
        onOpenHonkSearch={handleOpenHonkSearch}
        onOpenMemory={() => setIsMemoryModalOpen(true)}
        onOpenBenchmark={() => setIsAgentBenchmarkModalOpen(true)}
        onOpenShield={() => setIsShieldOpen(true)}
        onOpenDevices={() => setIsDeviceCenterOpen(true)}
        onOpenImageGenerator={handleOpenImageGenerator}
        usage={usage}
      />

      {/* Main Chat Interface */}
      <ChatView
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        onSendVoiceMessage={handleSendVoiceMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onRegenerateImage={handleRegenerateImage}
        onEditMessage={handleEditMessage}
        onRateMessage={handleRateMessage}
        onSelectModel={handleSelectModel}
        onNewChat={handleNewChat}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSettings={openSettings}
        onOpenAbout={openAbout}
        onOpenBenchmark={() => setIsAgentBenchmarkModalOpen(true)}
        onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
        isHeavyTask={isHeavyTask}
        onToggleHeavyTask={setIsHeavyTask}
        agentExecutionState={agentExecutionState}
        onOpenDownloadApp={() => setIsDownloadModalOpen(true)}
        onOpenPhotoKheecho={handleOpenPhotoKheecho}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenHonkSearch={handleOpenHonkSearch}
        onOpenImageGenerator={handleOpenImageGenerator}
        onOpenShare={() => {
          setShareTargetConvo(currentConversation);
          setIsShareModalOpen(true);
        }}
        onOpenAppStudio={(prompt) => handleOpenAppStudio(prompt)}
        isGenerating={isGenerating}
        onStopGenerating={handleStopGenerating}
        usage={usage}
        settings={settings}
        onUpdateSettings={setSettings}
        errorBanner={errorBanner}
        onClearError={() => setErrorBanner(null)}
      />

      {/* Birthday Celebration Banner */}
      {birthdayWish && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-zinc-900/95 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-2xl border border-amber-500/30">
              🎂
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-zinc-50 flex items-center gap-1.5">
                <span>Happy Birthday, {birthdayWish.name}!</span>
                <span className="text-amber-400">🎉✨</span>
              </h4>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                Honk AI wishes you a wonderful birthday filled with joy, creativity, and success!
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCelebrateBirthdayWithHonk}
                className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition shadow-sm active:scale-95"
              >
                Say Thanks 🪿
              </button>
              <button
                onClick={handleDismissBirthdayWish}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onSignOut={handleSignOut}
        usage={usage}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        usage={usage}
        currentUser={currentUser}
        onResetUsage={handleResetUsage}
        onSimulateLimit={handleSimulateLimit}
        conversations={conversations}
        onImportConversations={(convos) => {
          setConversations(convos);
          if (convos[0]) setActiveConvoId(convos[0].id);
        }}
        onClearAllConversations={() => {
          setConversations([INITIAL_CONVERSATION]);
          setActiveConvoId(INITIAL_CONVERSATION.id);
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareTargetConvo(null);
        }}
        conversation={shareTargetConvo || currentConversation}
        currentUser={currentUser}
      />

      {/* About Honk AI Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={closeAbout}
      />

      {/* Honk App Studio (Create App) Modal */}
      <AppStudioModal
        isOpen={isAppStudioOpen}
        onClose={() => {
          setIsAppStudioOpen(false);
          setAppStudioInitialPrompt('');
          if (window.location.pathname === '/app-studio' || window.location.pathname === '/create-app') {
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
        initialPrompt={appStudioInitialPrompt}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      {/* HONK App Builder: Import Any App Modal */}
      <ImportAppModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onProjectImported={(project) => {
          setIsImportModalOpen(false);
          setActiveStudioProject(project);
        }}
      />

      {/* Download App / Add to Home Screen Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* Honk Performance & Latency Benchmark Modal */}
      <PerformanceBenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        userId={currentUser.id}
      />

      {/* PHOTO KHEECHO, KAAM KHATAM: Multimodal AI Vision Modal */}
      <PhotoKheechoModal
        isOpen={isPhotoKheechoOpen}
        onClose={() => {
          setIsPhotoKheechoOpen(false);
          if (window.location.pathname === '/photo-kheecho' || window.location.pathname === '/camera' || window.location.pathname === '/vision') {
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
        onSendToMainChat={handleSendPhotoToMainChat}
      />

      {/* HONK SEARCH: "Before You Think" Interactive Search & Memory Experience */}
      <HonkSearchModal
        isOpen={isHonkSearchOpen}
        onClose={() => {
          setIsHonkSearchOpen(false);
          setHonkSearchInitialQuery('');
          if (window.location.pathname === '/search' || window.location.pathname === '/honk-search') {
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
        onAskHonk={handleAskHonkAboutSearch}
        userId={currentUser.id}
        initialQuery={honkSearchInitialQuery}
      />

      {/* Honk Memory: Internet That Remembers YOU */}
      <AgentMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        userId={currentUser.id}
      />

      {/* Honk Agent Verification Benchmark Suite */}
      <AgentBenchmarkModal
        isOpen={isAgentBenchmarkModalOpen}
        onClose={() => setIsAgentBenchmarkModalOpen(false)}
      />

      {/* Developer Authorization Gate (Zyron Developer Clearance) */}
      <DeveloperAuthGate
        isOpen={isDeveloperAuthOpen}
        onClose={() => setIsDeveloperAuthOpen(false)}
        currentUser={currentUser}
        onDeveloperAuthenticated={(updated) => {
          setCurrentUser(updated);
          setIsDeveloperCenterOpen(true);
        }}
      />

      {/* Developer Improvement Center (Strictly Protected) */}
      <DeveloperImprovementCenter
        isOpen={isDeveloperCenterOpen}
        onClose={() => setIsDeveloperCenterOpen(false)}
        currentUser={currentUser}
        onSignOutDeveloper={() => {
          setCurrentUser((prev) => ({
            ...prev,
            role: 'USER',
            developerToken: undefined,
          }));
        }}
      />

      {/* HONK SHIELD — Real Device Security & Intrusion Defense */}
      <HonkShieldDashboard
        isOpen={isShieldOpen}
        onClose={() => {
          setIsShieldOpen(false);
          if (window.location.pathname === '/shield' || window.location.pathname === '/honk-shield') {
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
        onOpenDeviceCenter={() => {
          setIsShieldOpen(false);
          setIsDeviceCenterOpen(true);
        }}
      />

      {/* HONK DEVICE CENTER — Windows V1 & Multi-Device Control */}
      <DeviceCenterModal
        isOpen={isDeviceCenterOpen}
        onClose={() => {
          setIsDeviceCenterOpen(false);
          if (window.location.pathname === '/devices' || window.location.pathname === '/device-center') {
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
      />

      {/* HONK IMAGE GENERATOR — Google Image API + 12-Second 1v1 Ludo */}
      <HonkImageGeneratorModal
        isOpen={isImageGeneratorOpen}
        onClose={() => {
          setIsImageGeneratorOpen(false);
          setImageGeneratorInitialPrompt('');
          if (window.location.pathname === '/image' || window.location.pathname === '/image-generator' || window.location.pathname === '/images') {
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
        initialPrompt={imageGeneratorInitialPrompt}
        onSendToChat={handleSendImageToMainChat}
      />
    </div>
  );
}
