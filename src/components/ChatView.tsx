import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Copy,
  RotateCcw,
  Check,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Menu,
  Clock,
  Sparkles,
  Edit3,
  Globe,
  Plus,
  Settings,
  Share2,
  Trash2,
  Info,
  Mic,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  WifiOff,
  Eye,
  Download,
  Maximize2,
  Minimize2,
  Snowflake,
  Camera,
  Upload,
  Brain,
  Gauge,
  Smartphone,
} from 'lucide-react';
import { Conversation, Message, Attachment, DailyUsage, AppSettings, INDIAN_LANGUAGES } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ModelSelector } from './ModelSelector';
import { UsageBadge } from './UsageBadge';
import { LanguageSelector } from './LanguageSelector';
import { LowDataBadge } from './LowDataBadge';
import { VoiceModal } from './VoiceModal';
import { HonkLogo } from './HonkLogo';
import { AssistantAvatar } from './AssistantAvatar';
import { ChatWallpaper } from './ChatWallpaper';
import { DownloadAppModal } from './DownloadAppModal';
import { HeavyTaskToggle } from './agent/HeavyTaskToggle';
import { AgentExecutionVisualizer } from './agent/AgentExecutionVisualizer';
import { DevicePermissionCard } from './agent/DevicePermissionCard';
import { ActiveActionIndicator } from './agent/ActiveActionIndicator';
import { DeviceAgentCenter } from './agent/DeviceAgentCenter';
import { AgentStage, AgentPlan, VerificationReport, AgentMetrics } from '../types/agent';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { speakWithHonkVoice, stopSpeaking, isCurrentlySpeaking, isSpeechSynthesisSupported } from '../lib/voice';
import { LudoMiniGame } from './LudoMiniGame';

interface ChatViewProps {
  conversation: Conversation | null;
  onSendMessage: (
    content: string,
    attachments: Attachment[],
    imageOptions?: { isImage: boolean; aspectRatio: string; resolution: string }
  ) => Promise<void>;
  onSendVoiceMessage?: (content: string, onChunk?: (chunk: string) => void) => Promise<string | undefined>;
  onRegenerateMessage: (messageId: string) => Promise<void>;
  onRegenerateImage?: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => Promise<void>;
  onRateMessage: (messageId: string, rating: 'like' | 'dislike') => void;
  onSelectModel: (modelId: string) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenBenchmark?: () => void;
  onOpenShare?: () => void;
  onOpenAppStudio?: (prompt?: string) => void;
  onOpenDownloadApp?: () => void;
  onOpenPhotoKheecho?: () => void;
  onOpenImportModal?: () => void;
  onOpenHonkSearch?: (initialQuery?: string) => void;
  onOpenMemoryModal?: () => void;
  onOpenImageGenerator?: (initialPrompt?: string) => void;
  isHeavyTask?: boolean;
  onToggleHeavyTask?: (enabled: boolean) => void;
  agentExecutionState?: {
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
  };
  isGenerating: boolean;
  onStopGenerating: () => void;
  usage: DailyUsage | null;
  settings: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  errorBanner: string | null;
  onClearError: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onSendMessage,
  onSendVoiceMessage,
  onRegenerateMessage,
  onRegenerateImage,
  onEditMessage,
  onRateMessage,
  onSelectModel,
  onNewChat,
  onToggleSidebar,
  onOpenSettings,
  onOpenAbout,
  onOpenBenchmark,
  onOpenShare,
  onOpenAppStudio,
  onOpenDownloadApp,
  onOpenPhotoKheecho,
  onOpenImportModal,
  onOpenHonkSearch,
  onOpenMemoryModal,
  onOpenImageGenerator,
  isHeavyTask,
  onToggleHeavyTask,
  agentExecutionState,
  isGenerating,
  onStopGenerating,
  usage,
  settings,
  onUpdateSettings,
  errorBanner,
  onClearError,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [revealedImages, setRevealedImages] = useState<Record<string, boolean>>({});

  // ChatGPT-style (+) Quick Action Menu in Search / Input Bar
  const [isSearchPlusMenuOpen, setIsSearchPlusMenuOpen] = useState(false);
  const searchPlusMenuRef = useRef<HTMLDivElement>(null);

  // Close search (+) dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchPlusMenuRef.current && !searchPlusMenuRef.current.contains(event.target as Node)) {
        setIsSearchPlusMenuOpen(false);
      }
    };
    if (isSearchPlusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchPlusMenuOpen]);

  // Voice State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Device Agent State & Permission Manager
  const [isDeviceAgentCenterOpen, setIsDeviceAgentCenterOpen] = useState(false);
  const [activeDeviceStatus, setActiveDeviceStatus] = useState<string | null>(null);
  const [pendingDevicePermission, setPendingDevicePermission] = useState<{
    intentId: string;
    actionType: string;
    targetApp?: string;
    targetElement?: string;
    explanationDesi: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiredOSPermission: string;
    isSensitive?: boolean;
    sensitiveCategory?: string;
    isResolved?: boolean;
    resolvedOutcome?: 'allowed' | 'denied';
  } | null>(null);

  const handleAllowDevicePermission = async (intentId: string) => {
    setPendingDevicePermission((prev) => (prev ? { ...prev, isResolved: true, resolvedOutcome: 'allowed' } : null));
    setActiveDeviceStatus('Honk is performing the requested action...');

    try {
      const res = await fetch('/api/device/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: pendingDevicePermission?.targetApp ? `Open ${pendingDevicePermission.targetApp}` : 'Execute permitted device action',
          confirmedActions: [intentId],
        }),
      });
      const data = await res.json();
      if (data?.result?.messageDesi) {
        setActiveDeviceStatus(null);
        await onSendMessage(`Permission granted. ${data.result.messageDesi}`, []);
      }
    } catch (err) {
      setActiveDeviceStatus(null);
    }
  };

  const handleDenyDevicePermission = (intentId: string) => {
    setPendingDevicePermission((prev) => (prev ? { ...prev, isResolved: true, resolvedOutcome: 'denied' } : null));
    setActiveDeviceStatus(null);
    onSendMessage(`Okay. I won't control your device.`, []);
  };

  const handleEmergencyStopHonk = async () => {
    setActiveDeviceStatus('Honk stopped active actions.');
    try {
      await fetch('/api/device/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    } catch (e) {}
    setTimeout(() => setActiveDeviceStatus(null), 3000);
  };

  // Indian Languages Selection Modal (for India "Do you need other language?" flow)
  const [isIndianLanguagesModalOpen, setIsIndianLanguagesModalOpen] = useState(false);
  const [indianLangModalSearch, setIndianLangModalSearch] = useState('');

  // Network Offline State
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

  // Image Generation Options State
  const [isImageMode, setIsImageMode] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K'>('1K');

  // Download & Install PWA State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const { isInstallable, promptInstall } = usePWAInstall();

  const handleDownloadClick = async () => {
    if (isInstallable) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') return;
    }
    if (onOpenDownloadApp) {
      onOpenDownloadApp();
    } else {
      setIsDownloadModalOpen(true);
    }
  };

  // Coordinated Dropdown State to prevent model & language popups from overlapping
  const [openDropdown, setOpenDropdown] = useState<'model' | 'language' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to trigger direct client-side image download
  const handleDownloadImage = async (imageUrl: string, promptText: string) => {
    try {
      let downloadHref = imageUrl;
      if (imageUrl.startsWith('http')) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          downloadHref = URL.createObjectURL(blob);
        } catch {
          // fallback to direct link
        }
      }
      const link = document.createElement('a');
      link.href = downloadHref;
      const cleanSlug = promptText
        .slice(0, 30)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      link.download = `honk-ai-${cleanSlug || 'image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (downloadHref !== imageUrl && downloadHref.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(downloadHref), 10000);
      }
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isGenerating]);

  // Adjust textarea height dynamically for short prompts and large documents/code
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 320)}px`;
    }
  }, [inputText]);

  // Calculate countdown to 24h reset
  useEffect(() => {
    if (!usage?.resetAt) return;
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, usage.resetAt - now);
      if (diff <= 0) {
        setTimeUntilReset('00:00:00');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [usage?.resetAt]);

  // Auto-speak new assistant messages if enabled
  const prevIsGeneratingRef = useRef(isGenerating);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    // When generation finishes (transition from generating to completed)
    if (prevIsGeneratingRef.current && !isGenerating && settings.voiceAutoSpeak) {
      const messages = conversation?.messages || [];
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg &&
        lastMsg.role === 'assistant' &&
        lastMsg.status === 'complete' &&
        lastMsg.content &&
        lastMsg.id !== lastSpokenMessageIdRef.current &&
        lastMsg.id !== 'msg_welcome_1'
      ) {
        lastSpokenMessageIdRef.current = lastMsg.id;
        handleSpeakMessage(lastMsg.id, lastMsg.content);
      }
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating, conversation?.messages, settings.voiceAutoSpeak]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isGenerating) return;

    // Check if daily limit reached
    if (usage && usage.remaining <= 0) {
      return;
    }

    const text = inputText;
    const atts = [...attachments];
    const imageActive = isImageMode;
    const ratio = selectedAspectRatio;
    const res = selectedResolution;

    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    stopSpeaking(); // Interrupt any ongoing voice playback

    // Check for "HONK STOP" emergency stop command
    if (/honk stop|stop honk|\bstop\b/i.test(text.trim())) {
      handleEmergencyStopHonk();
      await onSendMessage(text, atts, { isImage: imageActive, aspectRatio: ratio, resolution: res });
      return;
    }

    // Check for Device Agent control request
    const isDeviceCommand = /\b(open|launch|read screen|scan screen|tap|click|swipe|type|install|app)\b/i.test(text);
    if (isDeviceCommand && !imageActive) {
      try {
        const deviceRes = await fetch('/api/device/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userQuery: text, platform: 'web' }),
        });
        const deviceData = await deviceRes.json();
        if (deviceData?.result?.requiresUserAction && deviceData?.result?.intent) {
          const intent = deviceData.result.intent;
          setPendingDevicePermission({
            intentId: intent.id,
            actionType: intent.actionType,
            targetApp: intent.targetApp,
            targetElement: intent.targetElement,
            explanationDesi: intent.explanationDesi,
            riskLevel: intent.riskLevel,
            requiredOSPermission: intent.requiredOSPermission,
            isSensitive: intent.isSensitive,
            sensitiveCategory: intent.sensitiveCategory,
          });
        }
      } catch (err) {
        console.error('Device Agent check failed', err);
      }
    }

    await onSendMessage(text, atts, {
      isImage: imageActive,
      aspectRatio: ratio,
      resolution: res,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: Attachment = {
          id: 'att_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const startEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditInputText(msg.content);
  };

  const saveEditMessage = async (msgId: string) => {
    if (!editInputText.trim()) return;
    const text = editInputText;
    setEditingMessageId(null);
    stopSpeaking();
    await onEditMessage(msgId, text);
  };

  // Voice Playback for Assistant Message
  const handleSpeakMessage = (msgId: string, content: string) => {
    if (speakingMessageId === msgId) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    const currentLangObj =
      INDIAN_LANGUAGES.find((l) => l.code === settings.selectedLanguage) || INDIAN_LANGUAGES[0];

    setSpeakingMessageId(msgId);
    speakWithHonkVoice({
      text: content,
      language: currentLangObj.code || 'hi-IN',
      voice: currentLangObj.piperVoice,
      rate: settings.voiceSpeed || 1.0,
      onStart: () => setSpeakingMessageId(msgId),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  // Toggle Low-Data mode directly
  const handleToggleLowData = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        lowDataMode: !settings.lowDataMode,
      });
    }
  };

  // Change selected language
  const handleSelectLanguage = (langCode: string) => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        selectedLanguage: langCode,
      });
    }
  };

  // Toggle Focus Mode
  const handleToggleFocusMode = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        focusMode: !settings.focusMode,
      });
    }
  };

  const assistantName = settings.persona?.name || 'Honk';
  const isLimitReached = Boolean(usage && usage.remaining <= 0);
  const hasShareableContent = Boolean(
    conversation && conversation.messages.some((m) => m.content && m.content.trim().length > 0)
  );

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-zinc-900/40">
      {/* Top Navigation Bar */}
      <header
        className="relative z-50 flex h-14 w-full items-center border-b border-zinc-800/80 bg-zinc-950/95 px-3 sm:px-4 backdrop-blur-md shrink-0 overflow-visible"
      >
        <div className="flex w-full items-center justify-between gap-3 shrink-0 overflow-visible">
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 overflow-visible">
            <button
              id="mobile-sidebar-toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              className="flex items-center justify-center rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition lg:hidden shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Honk Brand Logo & Label */}
            <div
              id="chat-header-honk-brand"
              onClick={onNewChat}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 transition select-none shrink-0"
              title="Honk AI - Start new chat"
            >
              <HonkLogo size="xs" glow alt="Honk AI Official Logo" />
              <span className="hidden md:inline font-extrabold text-sm tracking-tight text-zinc-100">
                Honk <span className="text-amber-400">AI</span>
              </span>
            </div>

            {/* Model Selector */}
            <ModelSelector
              selectedModelId={conversation?.model || settings.selectedModel || 'honk-flash'}
              onSelectModel={onSelectModel}
              disabled={isGenerating}
              isOpenControlled={openDropdown === 'model'}
              onToggleControlled={() => setOpenDropdown((prev) => (prev === 'model' ? null : 'model'))}
            />

            {/* Language Selector */}
            <LanguageSelector
              selectedLanguage={settings.selectedLanguage || 'en-IN'}
              onSelectLanguage={handleSelectLanguage}
              selectedCountry={settings.selectedCountry || 'IN'}
              isOpenControlled={openDropdown === 'language'}
              onToggleControlled={() => setOpenDropdown((prev) => (prev === 'language' ? null : 'language'))}
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-1 shrink-0">
          {/* Low-Data Mode Toggle Badge */}
          <LowDataBadge
            isLowData={settings.lowDataMode}
            onToggleLowData={handleToggleLowData}
            isOffline={isOffline}
          />

          {/* Usage Quota Pill */}
          <UsageBadge usage={usage} />

          {/* Auto-TTS Spoken Response Toggle */}
          <button
            id="top-auto-tts-toggle-btn"
            type="button"
            onClick={() => {
              if (onUpdateSettings) {
                onUpdateSettings({
                  ...settings,
                  voiceAutoSpeak: !settings.voiceAutoSpeak,
                });
              }
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition shrink-0 ${
              settings.voiceAutoSpeak
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
            title={settings.voiceAutoSpeak ? 'Spoken Voice: Auto-playing AI responses' : 'Spoken Voice: Muted (click to enable)'}
          >
            {settings.voiceAutoSpeak ? (
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">{settings.voiceAutoSpeak ? 'Voice ON' : 'Voice OFF'}</span>
          </button>

          {/* Voice-First Button */}
          <button
            id="top-voice-mode-btn"
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition shrink-0"
            style={{
              borderColor: 'var(--honk-accent-border)',
              backgroundColor: 'var(--honk-accent-subtle)',
              color: 'var(--honk-accent-text)',
            }}
            title="Open Voice Interface (Indian Languages)"
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Honk Search: "Before You Think" Launcher */}
          {onOpenHonkSearch && (
            <button
              id="top-honk-search-btn"
              type="button"
              onClick={() => onOpenHonkSearch()}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/25 via-amber-500/30 to-yellow-500/20 px-2.5 sm:px-3 py-1.5 text-xs font-extrabold text-amber-200 transition hover:brightness-110 active:scale-95 shrink-0 cursor-pointer shadow-sm shadow-amber-500/10"
              title="HONK SEARCH: Before You Think (One Answer, Not 10 Blue Links)"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="hidden sm:inline">HONK</span>
            </button>
          )}

          {/* Honk Memory: Internet That Remembers YOU */}
          {onOpenMemoryModal && (
            <button
              id="top-honk-memory-btn"
              type="button"
              onClick={onOpenMemoryModal}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/25 active:scale-95 shrink-0 cursor-pointer shadow-sm"
              title="Honk Memory: View or edit your personalized knowledge layer"
            >
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden sm:inline">Memory</span>
            </button>
          )}

          {/* HONK Device Agent Center */}
          <button
            id="top-device-agent-btn"
            type="button"
            onClick={() => setIsDeviceAgentCenterOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 active:scale-95 shrink-0 cursor-pointer shadow-sm"
            title="HONK Device Agent: Permission First, Action Second"
          >
            <Smartphone className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Device Agent</span>
          </button>

          {/* Real Agent Benchmark Suite */}
          {onOpenBenchmark && (
            <button
              id="top-agent-benchmark-btn"
              type="button"
              onClick={onOpenBenchmark}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-zinc-900 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-amber-300 transition hover:border-amber-500/50 active:scale-95 shrink-0 cursor-pointer shadow-sm"
              title="Honk Agent Verification Benchmark"
            >
              <Gauge className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden md:inline">Benchmark</span>
            </button>
          )}

          {/* Seasonal Winter Mode Quick Toggle */}
          {onUpdateSettings && (
            <button
              id="top-winter-mode-btn"
              type="button"
              onClick={() => {
                const current = settings.winterMode || 'auto';
                const next = current === 'off' ? 'on' : 'off';
                onUpdateSettings({
                  ...settings,
                  winterMode: next,
                });
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                (settings.winterMode || 'auto') !== 'off'
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 shadow-xs'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
              title={(settings.winterMode || 'auto') !== 'off' ? 'Winter Mode: Active (Click to pause snowfall)' : 'Winter Mode: Paused (Click to enable snowfall)'}
            >
              <Snowflake className={`h-3.5 w-3.5 ${(settings.winterMode || 'auto') !== 'off' ? 'text-sky-300 animate-spin' : 'text-zinc-500'}`} style={{ animationDuration: '18s' }} />
              <span className="hidden xl:inline font-bold">{(settings.winterMode || 'auto') !== 'off' ? 'Winter' : 'Winter Off'}</span>
            </button>
          )}

          {/* Photo Kheecho, Kaam Khatam Button */}
          {onOpenPhotoKheecho && (
            <button
              id="top-photo-kheecho-btn"
              type="button"
              onClick={onOpenPhotoKheecho}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:from-amber-500/30 hover:to-yellow-500/25 hover:border-amber-400 active:scale-95 shrink-0 cursor-pointer shadow-xs"
              title="Photo Kheecho, Kaam Khatam - Instant Multimodal AI Vision"
            >
              <Camera className="h-3.5 w-3.5 text-amber-400" />
              <span className="inline font-bold">Photo Kheecho</span>
            </button>
          )}

          {/* Image Generator / 12s Ludo Game */}
          {onOpenImageGenerator && (
            <button
              id="top-image-generator-btn"
              type="button"
              onClick={() => onOpenImageGenerator()}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:from-amber-500/30 hover:to-orange-500/25 hover:border-amber-400 active:scale-95 shrink-0 cursor-pointer shadow-xs"
              title="Honk Image Generator - Google Image API with 12s 1v1 Ludo"
            >
              <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
              <span className="inline font-bold">Image Studio</span>
            </button>
          )}

          {/* Create App / Honk App Studio Button */}
          {onOpenAppStudio && (
            <button
              id="top-create-app-btn"
              type="button"
              onClick={() => onOpenAppStudio()}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 shrink-0 cursor-pointer shadow-xs"
              title="Create interactive full-stack apps with Honk AI"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="inline font-bold">Create App</span>
            </button>
          )}

          {/* Automatic Performance & Speed Test Button */}
          {onOpenBenchmark && (
            <button
              id="top-benchmark-btn"
              type="button"
              onClick={onOpenBenchmark}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 shrink-0 cursor-pointer shadow-xs"
              title="Run Performance Test (TTFT, First Render, and Streaming Latency Suite)"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden xl:inline font-bold">Speed Test</span>
            </button>
          )}

          {/* Download App / Add to Home Screen Button */}
          <button
            id="top-download-app-btn"
            type="button"
            onClick={handleDownloadClick}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-400 active:scale-95 shrink-0 cursor-pointer shadow-xs"
            title="Download Honk AI & Add to Home Screen"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline font-bold">Download App</span>
            <span className="sm:hidden font-bold">App</span>
          </button>

          {/* Share Completed Conversation Button */}
          {hasShareableContent && onOpenShare && (
            <button
              id="top-share-chat-btn"
              type="button"
              onClick={onOpenShare}
              disabled={isGenerating}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border-app)] bg-[var(--bg-surface)] px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-surface-hover)] active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
              title="Share this completed conversation via a public link"
            >
              <Share2 className="h-3.5 w-3.5" style={{ color: 'var(--honk-accent)' }} />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {/* New Chat Button (Desktop) */}
          <button
            id="top-new-chat-btn"
            type="button"
            onClick={onNewChat}
            className="hidden xl:flex items-center gap-1.5 rounded-xl border border-[var(--border-app)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-surface-hover)] shrink-0"
            title="Start fresh conversation"
          >
            <Plus className="h-3.5 w-3.5" style={{ color: 'var(--honk-accent)' }} />
            <span>New Chat</span>
          </button>

          {/* About Navigation Link */}
          <a
            id="top-about-nav-link"
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              onOpenAbout();
            }}
            className="hidden md:flex items-center gap-1.5 rounded-xl border border-[var(--border-app)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-surface-hover)] shrink-0"
            title="About Honk AI"
          >
            <Info className="h-3.5 w-3.5" style={{ color: 'var(--honk-accent)' }} />
            <span>About</span>
          </a>

          {/* Focus Mode Toggle Button */}
          <button
            id="top-focus-mode-toggle-btn"
            type="button"
            onClick={handleToggleFocusMode}
            className={`hidden 2xl:flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition shrink-0 ${
              settings.focusMode
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 shadow-sm'
                : 'border-[var(--border-app)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]'
            }`}
            title={settings.focusMode ? 'Focus Mode ON: Click to exit' : 'Focus Mode: Click to minimize distractions'}
          >
            {settings.focusMode ? <Minimize2 className="h-3.5 w-3.5 text-amber-400" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{settings.focusMode ? 'Focus ON' : 'Focus'}</span>
          </button>

          {/* Settings Button */}
          <button
            id="top-settings-btn"
            type="button"
            onClick={onOpenSettings}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition shrink-0"
            title="Settings & Quota"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>

      {/* India 'Do you need other language?' Prompt Banner */}
      {(!settings.selectedCountry || settings.selectedCountry === 'IN') && !settings.askedOtherLanguage && (
        <div
          id="india-ask-other-lang-banner"
          className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 backdrop-blur-sm shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🇮🇳</span>
            <div>
              <span className="font-bold text-amber-300">Do you need other language?</span>
              <span className="text-zinc-400 ml-1.5 hidden sm:inline">(English is currently set as your default)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="chat-banner-yes-btn"
              type="button"
              onClick={() => {
                setIsIndianLanguagesModalOpen(true);
                if (onUpdateSettings) {
                  onUpdateSettings({ ...settings, askedOtherLanguage: true });
                }
              }}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-3 py-1 text-xs font-bold text-zinc-950 shadow hover:from-amber-400 hover:to-amber-300 transition"
            >
              Yes
            </button>
            <button
              id="chat-banner-no-btn"
              type="button"
              onClick={() => {
                if (onUpdateSettings) {
                  onUpdateSettings({ ...settings, askedOtherLanguage: true, selectedLanguage: 'en-IN' });
                }
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Offline Status Warning Banner */}
      {isOffline && (
        <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Offline Mode</strong>: Network disconnected. You can browse cached conversations; Honk AI will reconnect automatically.
            </span>
          </div>
        </div>
      )}

      {/* Backend Daily Limit Reached Warning Banner */}
      {isLimitReached && (
        <div className="bg-rose-950/80 border-b border-rose-800/60 px-4 py-3 text-rose-200 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-sm text-white">Daily limit reached — try again tomorrow</span>
              <p className="text-xs text-rose-300">
                You have used your full quota of exactly 100 AI requests today.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-rose-900/50 px-3 py-1.5 rounded-lg border border-rose-700/50">
            <Clock className="h-3.5 w-3.5 text-rose-300" />
            <span>Reset in: {timeUntilReset || 'within 24h'}</span>
          </div>
        </div>
      )}

      {/* Error Toast / Alert Banner */}
      {errorBanner && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2.5 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="rounded p-1 hover:bg-amber-900/50 text-amber-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Speech Interruption Bar */}
      {speakingMessageId && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-2 flex items-center justify-between shadow-md text-xs font-semibold animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 animate-bounce" />
            <span>Speaking assistant response...</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              setSpeakingMessageId(null);
            }}
            className="rounded-lg bg-zinc-950 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-zinc-900 shadow-sm"
          >
            Stop Talking (Interrupt)
          </button>
        </div>
      )}

      {/* Focus Mode Active Banner */}
      {settings.focusMode && (
        <div
          id="focus-mode-indicator-banner"
          className="bg-zinc-950/90 border-b border-amber-500/30 px-4 py-2 text-xs flex items-center justify-between text-zinc-300 backdrop-blur-md shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="font-semibold text-zinc-200">Focus Mode Active</span>
            <span className="text-zinc-400 hidden sm:inline">• Distraction-free clean view</span>
          </div>
          <button
            type="button"
            onClick={handleToggleFocusMode}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition text-xs border border-amber-500/20"
          >
            <Minimize2 className="h-3 w-3" />
            <span>Exit Focus</span>
          </button>
        </div>
      )}

      {/* Message Stream / Conversation Container */}
      <div className="relative flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Chat Wallpaper Layer */}
        <ChatWallpaper wallpaper={settings.wallpaper} />

        {(!conversation?.messages || conversation.messages.length === 0) ? (
          /* Empty / Welcome State */
          <div className={`relative z-10 flex min-h-[70vh] flex-col items-center justify-center text-center px-4 mx-auto ${settings.focusMode ? 'max-w-2xl' : 'max-w-3xl'}`}>
            <div className="mb-4">
              <AssistantAvatar persona={settings.persona} size="xl" glow />
            </div>
            
            {/* Clear Homepage H1 */}
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
              {assistantName}
            </h1>

            {/* Required Visible Descriptions */}
            <p className="mt-2 text-sm text-amber-400 font-semibold max-w-lg">
              {assistantName} is an India-first, honest AI assistant created by Zyron.
            </p>
            <p className="mt-1 text-sm text-zinc-300 max-w-xl leading-relaxed">
              Understand Hinglish & 22 Indian languages, UPI, GST, Aadhaar, Mandi MSP rates, laws, and coding — with 2G Low-Data Mode and Voice.
            </p>

            {/* Quick Mode Indicator Chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 font-medium text-amber-300">
                <span>🇮🇳</span>
                <span>22 Languages + Hinglish</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-medium text-emerald-300">
                <Zap className="h-3 w-3" />
                <span>2G Low-Data Mode</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 font-medium text-blue-300">
                <Shield className="h-3 w-3" />
                <span>Honest AI & Sources</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 font-medium text-purple-300">
                <Mic className="h-3 w-3" />
                <span>Voice-First Engine</span>
              </span>
            </div>

            {/* Open Conversation Prompt */}
            <div className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm p-6 max-w-md w-full text-center shadow-lg">
              <p className="text-sm text-zinc-300 font-medium">
                Type your message below or tap <span className="text-amber-400 font-semibold">Voice Mode</span> to speak freely.
              </p>
              <p className="mt-1.5 text-xs text-zinc-500">
                Talk about anything you want without restrictions.
              </p>
            </div>

            {/* Quick App Studio Launcher Card */}
            {onOpenAppStudio && (
              <button
                id="welcome-create-app-card"
                type="button"
                onClick={() => onOpenAppStudio()}
                className="mt-4 flex items-center gap-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900/90 to-zinc-900/90 hover:border-amber-500/50 hover:from-amber-500/20 p-4 max-w-md w-full text-left transition active:scale-[0.98] shadow-lg group cursor-pointer"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0 group-hover:scale-110 transition shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white group-hover:text-amber-300 transition">Create an App with Honk</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">New</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">Generate & run interactive web apps with live preview</p>
                </div>
              </button>
            )}
          </div>
        ) : (
          /* Message List */
          <div className={`relative z-10 mx-auto space-y-6 ${settings.focusMode ? 'max-w-3xl' : 'max-w-4xl'}`}>
            {conversation.messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isEditing = editingMessageId === msg.id;
              const isSpeakingThis = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 sm:gap-4 ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  } group`}
                >
                  {/* Avatar */}
                  <div className="shrink-0 pt-0.5">
                    {isUser ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-600">
                        You
                      </div>
                    ) : (
                      <AssistantAvatar persona={settings.persona} size="sm" glow={msg.status === 'streaming'} />
                    )}
                  </div>

                  {/* Message Bubble Body */}
                  <div
                    className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-[80%] ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* User message edit mode */}
                    {isEditing ? (
                      <div className="w-full rounded-2xl border border-amber-500/60 bg-zinc-800/90 p-3 shadow-lg">
                        <textarea
                          rows={3}
                          value={editInputText}
                          onChange={(e) => setEditInputText(e.target.value)}
                          className="w-full bg-transparent text-sm text-zinc-100 outline-none leading-relaxed resize-none"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditMessage(msg.id)}
                            className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-400"
                          >
                            Save & Resubmit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-3.5 shadow-sm text-sm ${
                          isUser
                            ? 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-tr-sm'
                            : 'bg-zinc-950/70 border border-zinc-800/90 text-zinc-200 rounded-tl-sm w-full'
                        }`}
                      >
                        {/* Attachments (with Low-Data Lazy Loading) */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {msg.attachments.map((att) => {
                              const isImg = att.type.startsWith('image/');
                              const isRevealed = revealedImages[att.id] || !settings.lowDataMode;

                              return (
                                <div
                                  key={att.id}
                                  className="group/att relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/90 shadow-sm"
                                >
                                  {isImg ? (
                                    isRevealed ? (
                                      <div
                                        onClick={() => setActiveLightboxImage(att.dataUrl)}
                                        className="cursor-pointer"
                                      >
                                        <img
                                          src={att.dataUrl}
                                          alt={att.name}
                                          className="h-28 w-40 object-cover transition group-hover/att:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/att:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                                          View Full
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() =>
                                          setRevealedImages((prev) => ({ ...prev, [att.id]: true }))
                                        }
                                        className="flex flex-col items-center justify-center h-28 w-40 bg-zinc-900 text-zinc-300 p-2 text-center cursor-pointer hover:bg-zinc-800 transition"
                                      >
                                        <Eye className="h-5 w-5 text-amber-400 mb-1" />
                                        <span className="text-xs font-semibold">Tap to Load</span>
                                        <span className="text-[10px] text-zinc-400">
                                          Low-Data (saved data)
                                        </span>
                                      </div>
                                    )
                                  ) : (
                                    <div className="flex items-center gap-2 p-2.5 text-xs text-zinc-300">
                                      <FileText className="h-4 w-4 text-amber-400" />
                                      <span className="truncate max-w-[130px] font-medium">{att.name}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Content text / Markdown */}
                        {isUser ? (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="w-full">
                            {/* Loading state with 12-second 1v1 Ludo Mini-Game */}
                            {msg.isGeneratingImage && (
                              <div className="my-2 w-full max-w-2xl">
                                <LudoMiniGame
                                  isImageReady={Boolean(msg.generatedImage)}
                                  onTimeExpired={() => {}}
                                  targetDurationSeconds={12}
                                  promptText={msg.content || 'Generating image via Google Image API...'}
                                />
                              </div>
                            )}

                            {/* Generated Image Card */}
                            {msg.generatedImage && (
                              <div className="my-2 space-y-3">
                                <div className="group/genimg relative overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-lg">
                                  <div
                                    className="cursor-pointer overflow-hidden flex items-center justify-center max-h-[520px] bg-zinc-950"
                                    onClick={() => setActiveLightboxImage(msg.generatedImage!.imageUrl)}
                                  >
                                    <img
                                      src={msg.generatedImage.imageUrl}
                                      alt={msg.generatedImage.prompt}
                                      className="w-full h-auto max-h-[500px] object-contain transition-transform duration-300 hover:scale-[1.01]"
                                    />
                                  </div>

                                  {/* Floating Badges */}
                                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-black/75 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-zinc-200 border border-white/10 shadow-sm">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                    <span>Honk AI Image</span>
                                  </div>

                                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                                    <span className="rounded-lg bg-black/75 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-zinc-200 border border-white/10 uppercase tracking-wider">
                                      {msg.generatedImage.aspectRatio}
                                    </span>
                                    <span className="rounded-lg bg-amber-500/20 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                                      {msg.generatedImage.resolution || '1K'}
                                    </span>
                                  </div>
                                </div>

                                {/* Prompt subtitle */}
                                {msg.generatedImage.prompt && (
                                  <p className="text-xs text-zinc-400 italic px-1 leading-relaxed">
                                    &ldquo;{msg.generatedImage.prompt}&rdquo;
                                  </p>
                                )}

                                {/* Action Buttons: Download & Regenerate */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    id={`download-img-${msg.id}`}
                                    onClick={() => handleDownloadImage(msg.generatedImage!.imageUrl, msg.generatedImage!.prompt)}
                                    className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition active:scale-95 shadow-sm"
                                    title="Download image to your computer"
                                  >
                                    <Download className="h-3.5 w-3.5 text-amber-400" />
                                    <span>Download</span>
                                  </button>

                                  <button
                                    type="button"
                                    id={`regen-img-${msg.id}`}
                                    onClick={() => (onRegenerateImage ? onRegenerateImage(msg.id) : onRegenerateMessage(msg.id))}
                                    className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition active:scale-95 shadow-sm"
                                    title="Regenerate this image"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                                    <span>Regenerate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setActiveLightboxImage(msg.generatedImage!.imageUrl)}
                                    className="flex items-center gap-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/60 px-2.5 py-1.5 text-xs text-zinc-300 transition"
                                    title="Open full size view"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View Full</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Text markdown content with human-like handwriting animation */}
                            {msg.content ? (
                              <MarkdownRenderer
                                content={msg.content}
                                isStreaming={msg.status === 'streaming' && !msg.isGeneratingImage}
                              />
                            ) : msg.status === 'streaming' && !msg.isGeneratingImage ? (
                              <div className="flex items-center gap-2 py-1 text-xs text-zinc-400">
                                <span
                                  className="h-2 w-2 rounded-full honk-ink-dot"
                                  style={{ backgroundColor: 'var(--honk-accent)' }}
                                />
                                <span>{assistantName} is writing...</span>
                              </div>
                            ) : null}

                            {/* Error card inside message if failed */}
                            {msg.status === 'error' && (
                              <div className="mt-2 rounded-xl border border-rose-800/80 bg-rose-950/50 p-3.5 text-xs text-rose-300">
                                <div className="flex items-start gap-2.5 font-medium text-rose-200 leading-relaxed">
                                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                  <span>{msg.error || 'Failed to complete AI response'}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => (onRegenerateImage && (msg.isGeneratingImage || msg.generatedImage) ? onRegenerateImage(msg.id) : onRegenerateMessage(msg.id))}
                                    className="flex items-center gap-1.5 rounded-lg bg-rose-900/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 transition shadow-sm active:scale-95"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Try Again</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar Below Bubble */}
                    <div className="mt-1 flex items-center gap-1.5 px-1 text-zinc-500 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Read out aloud / Speech Synthesis */}
                      {!isUser && msg.status === 'complete' && isSpeechSynthesisSupported() && (
                        <button
                          id={`speak-msg-${msg.id}`}
                          type="button"
                          onClick={() => handleSpeakMessage(msg.id, msg.content)}
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition ${
                            isSpeakingThis ? 'text-amber-400 font-bold bg-amber-500/10' : 'hover:bg-zinc-800 hover:text-zinc-300'
                          }`}
                          title={isSpeakingThis ? 'Stop voice readout' : 'Read aloud in Indian voice'}
                        >
                          {isSpeakingThis ? (
                            <>
                              <VolumeX className="h-3 w-3 text-amber-400" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Copy message text */}
                      <button
                        id={`copy-msg-${msg.id}`}
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-zinc-300 transition"
                        title="Copy message"
                      >
                        {copiedMessageId === msg.id ? (
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

                      {/* Edit (if user message) */}
                      {isUser && (
                        <button
                          id={`edit-msg-${msg.id}`}
                          type="button"
                          onClick={() => startEditMessage(msg)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-zinc-300 transition"
                          title="Edit message"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}

                      {/* Regenerate & Feedback (if assistant) */}
                      {!isUser && msg.status === 'complete' && (
                        <>
                          <button
                            id={`regen-msg-${msg.id}`}
                            type="button"
                            onClick={() => onRegenerateMessage(msg.id)}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-zinc-300 transition"
                            title="Regenerate answer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Regenerate</span>
                          </button>

                          <button
                            id={`like-msg-${msg.id}`}
                            type="button"
                            onClick={() => onRateMessage(msg.id, 'like')}
                            className={`rounded p-1 transition ${
                              msg.rating === 'like' ? 'text-amber-400' : 'hover:bg-zinc-800 hover:text-zinc-300'
                            }`}
                            title="Good response"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>

                          <button
                            id={`dislike-msg-${msg.id}`}
                            type="button"
                            onClick={() => onRateMessage(msg.id, 'dislike')}
                            className={`rounded p-1 transition ${
                              msg.rating === 'dislike' ? 'text-rose-400' : 'hover:bg-zinc-800 hover:text-zinc-300'
                            }`}
                            title="Poor response"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>

                          {/* Latency timing badge */}
                          {msg.latencyTimings && (
                            <button
                              id={`latency-msg-${msg.id}`}
                              type="button"
                              onClick={onOpenBenchmark}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-amber-300 font-mono text-[10px] border border-zinc-750 hover:border-amber-500/40 transition cursor-pointer"
                              title={`⚡ Measured TTFT: ${msg.latencyTimings.ttftMs}ms | First Render: ${msg.latencyTimings.firstRenderMs}ms | Total Duration: ${msg.latencyTimings.totalDurationMs}ms\nClick to run performance suite`}
                            >
                              <Zap className="h-2.5 w-2.5 text-amber-400" />
                              <span>{msg.latencyTimings.ttftMs}ms</span>
                            </button>
                          )}

                          {/* App Studio Quick Launcher */}
                          {onOpenAppStudio && (
                            <button
                              id={`build-app-msg-${msg.id}`}
                              type="button"
                              onClick={() => {
                                const prevUserMsg = conversation?.messages
                                  .slice(0, conversation.messages.indexOf(msg))
                                  .reverse()
                                  .find((m) => m.role === 'user');
                                const promptToSeed = prevUserMsg?.content || msg.content.slice(0, 200);
                                onOpenAppStudio(promptToSeed);
                              }}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-amber-500/15 text-zinc-400 hover:text-amber-300 transition"
                              title="Turn this concept into an interactive app in Honk App Studio"
                            >
                              <Sparkles className="h-3 w-3 text-amber-400" />
                              <span>Build App</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {agentExecutionState && (agentExecutionState.plan || agentExecutionState.isExecuting) && (
              <AgentExecutionVisualizer
                currentStage={agentExecutionState.currentStage}
                plan={agentExecutionState.plan}
                verificationReport={agentExecutionState.verificationReport}
                metrics={agentExecutionState.metrics}
                isExecuting={agentExecutionState.isExecuting}
                onAuthorizeAction={agentExecutionState.onAuthorizeAction}
                permissionRequest={agentExecutionState.permissionRequest}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Footer */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/90 p-3 sm:p-4 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {/* Attachment Preview Chips */}
          {attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/90 px-2.5 py-1 text-xs text-zinc-200 shadow-sm"
                >
                  {att.type.startsWith('image/') ? (
                    <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="rounded p-0.5 text-zinc-400 hover:text-zinc-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image Mode Options Strip */}
          {isImageMode && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Honk AI Image</span>
                </div>
                <span className="text-zinc-600 hidden sm:inline">|</span>
                {/* Aspect Ratio Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400 text-[11px]">Ratio:</span>
                  {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setSelectedAspectRatio(ratio)}
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                        selectedAspectRatio === ratio
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quality Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400 text-[11px]">Quality:</span>
                  {(['1K', '2K', '4K'] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSelectedResolution(res)}
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                        selectedResolution === res
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsImageMode(false)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                  title="Exit image generation mode"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Active Device Action & Permission Cards */}
          {activeDeviceStatus && (
            <ActiveActionIndicator
              statusText={activeDeviceStatus}
              isExecuting={!!activeDeviceStatus}
              onStop={handleEmergencyStopHonk}
            />
          )}

          {pendingDevicePermission && (
            <DevicePermissionCard
              intentId={pendingDevicePermission.intentId}
              actionType={pendingDevicePermission.actionType}
              targetApp={pendingDevicePermission.targetApp}
              targetElement={pendingDevicePermission.targetElement}
              explanationDesi={pendingDevicePermission.explanationDesi}
              riskLevel={pendingDevicePermission.riskLevel}
              requiredOSPermission={pendingDevicePermission.requiredOSPermission}
              isSensitive={pendingDevicePermission.isSensitive}
              sensitiveCategory={pendingDevicePermission.sensitiveCategory}
              isResolved={pendingDevicePermission.isResolved}
              resolvedOutcome={pendingDevicePermission.resolvedOutcome}
              onAllow={handleAllowDevicePermission}
              onDeny={handleDenyDevicePermission}
            />
          )}

          {/* Main Input Box */}
          <form
            onSubmit={handleSend}
            className={`relative flex flex-col rounded-2xl border transition-all ${
              isLimitReached
                ? 'border-rose-800/60 bg-zinc-900/60 opacity-80'
                : 'border-zinc-700/80 bg-zinc-900 focus-within:border-amber-500/70 focus-within:ring-1 focus-within:ring-amber-500/40'
            } shadow-lg`}
          >
            {/* Input Row: (+) Button on the left inside the search bar */}
            <div className="flex items-start gap-2 px-3 pt-3">
              {/* (+) Action Button with Dropdown on the left inside the search bar */}
              <div className="relative shrink-0 pt-0.5" ref={searchPlusMenuRef}>
                <button
                  id="chat-search-plus-action-btn"
                  type="button"
                  disabled={isLimitReached}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSearchPlusMenuOpen((prev) => !prev);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition cursor-pointer disabled:opacity-40 active:scale-95 ${
                    isSearchPlusMenuOpen
                      ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-400/40 shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-750'
                  }`}
                  title="Quick Tools: New Chat, Photo Kheecho, Create App, Import App"
                >
                  <Plus className={`h-4 w-4 stroke-[2.5] transition-transform duration-200 ${isSearchPlusMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                {/* Dropdown Menu when (+) is clicked */}
                {isSearchPlusMenuOpen && (
                  <div
                    id="chat-search-plus-dropdown-menu"
                    className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-zinc-700/90 bg-zinc-900/98 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 mb-1">
                      Quick Actions
                    </div>

                    {/* 1. New Chat */}
                    <button
                      id="search-menu-new-chat-btn"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearchPlusMenuOpen(false);
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
                        id="search-menu-honk-search-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchPlusMenuOpen(false);
                          onOpenHonkSearch(inputText);
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
                          1 HONK
                        </span>
                      </button>
                    )}

                    {/* 3. Photo Kheecho */}
                    {onOpenPhotoKheecho && (
                      <button
                        id="search-menu-photo-kheecho-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchPlusMenuOpen(false);
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
                        id="search-menu-create-app-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchPlusMenuOpen(false);
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
                        id="search-menu-import-app-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchPlusMenuOpen(false);
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

                    {/* 6. Image Generator */}
                    {onOpenImageGenerator && (
                      <button
                        id="search-menu-image-gen-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchPlusMenuOpen(false);
                          onOpenImageGenerator(inputText);
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
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                id="chat-input-textarea"
                disabled={isLimitReached}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isLimitReached
                    ? 'Daily limit reached — try again tomorrow.'
                    : isImageMode
                    ? 'Describe the image you want to generate with Honk AI...'
                    : 'Ask anything'
                }
                className="w-full resize-none bg-transparent pt-1 pb-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none leading-relaxed min-h-[40px]"
              />
            </div>

            {/* Controls Toolbar Bar */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-zinc-800/40 mt-1">
              <div className="flex items-center gap-1.5">
                {/* Image Mode Toggle Button */}
                <button
                  id="toggle-image-mode-btn"
                  type="button"
                  disabled={isLimitReached}
                  onClick={() => setIsImageMode((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs transition disabled:opacity-40 ${
                    isImageMode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                  title="Generate Image with Honk AI"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Image</span>
                </button>

                {/* Heavy Task Mode Agent Toggle */}
                {onToggleHeavyTask && (
                  <HeavyTaskToggle
                    isHeavyTask={isHeavyTask || false}
                    onToggle={onToggleHeavyTask}
                    disabled={isLimitReached || isGenerating}
                  />
                )}

                {/* Honk Memory Toolbar Icon */}
                {onOpenMemoryModal && (
                  <button
                    id="input-memory-btn"
                    type="button"
                    onClick={onOpenMemoryModal}
                    className="flex items-center gap-1 rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-purple-300 transition cursor-pointer"
                    title="Honk Memory: View or edit your personalized knowledge layer"
                  >
                    <Brain className="h-4 w-4" />
                  </button>
                )}

                {/* Photo Kheecho Quick Button */}
                {onOpenPhotoKheecho && (
                  <button
                    id="input-photo-kheecho-btn"
                    type="button"
                    disabled={isLimitReached}
                    onClick={onOpenPhotoKheecho}
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/15 border border-amber-500/35 font-semibold transition disabled:opacity-40 cursor-pointer"
                    title="Photo Kheecho, Kaam Khatam - Instant Photo AI"
                  >
                    <Camera className="h-4 w-4 text-amber-400" />
                    <span className="hidden sm:inline font-bold">Photo Kheecho</span>
                  </button>
                )}

                {/* File Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.json,.ts,.tsx,.js,.py,.html,.css"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  id="attach-file-btn"
                  type="button"
                  disabled={isLimitReached}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition disabled:opacity-40"
                  title="Attach images, documents or code"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                {/* Voice Input Trigger Button */}
                <button
                  id="voice-input-btn"
                  type="button"
                  disabled={isLimitReached}
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="flex items-center gap-1 rounded-xl p-2 transition disabled:opacity-40"
                  style={{ color: 'var(--honk-accent)' }}
                  title="Speak in regional Indian language or Hinglish"
                >
                  <Mic className="h-4 w-4" />
                </button>

                {/* Grounding / Search Indicator */}
                {settings.enableWebSearch && (
                  <div className="flex items-center gap-1 rounded-lg bg-blue-950/60 px-2 py-1 text-[11px] font-medium text-blue-300 border border-blue-800/50">
                    <Globe className="h-3 w-3" />
                    <span>Search ON</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <button
                    id="stop-generating-btn"
                    type="button"
                    onClick={onStopGenerating}
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition active:scale-95"
                  >
                    <Square className="h-3 w-3 text-rose-400 fill-rose-400" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    id="send-message-btn"
                    type="submit"
                    disabled={isLimitReached || (!inputText.trim() && attachments.length === 0)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition disabled:opacity-40 active:scale-95 shadow-sm"
                    style={{
                      backgroundColor: 'var(--honk-accent)',
                      color: 'var(--honk-accent-foreground)',
                    }}
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Subtext info */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
            <span>Honk AI by Zyron • 22 Indian Languages • 2G Low-Data</span>
            <div className="flex items-center gap-3">
              <a
                id="footer-about-nav-link"
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenAbout();
                }}
                className="font-medium underline transition"
                style={{ color: 'var(--honk-accent-text)' }}
              >
                About
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* All Indian Languages Modal (Triggered by 'Do you need other language? Yes') */}
      {isIndianLanguagesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsIndianLanguagesModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇮🇳</span>
                  <h3 className="text-lg font-bold text-zinc-100">All Indian Languages</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Choose any of the 22 official Indian regional languages or Hinglish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsIndianLanguagesModalOpen(false)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Indian Languages */}
            <div className="relative">
              <input
                type="text"
                value={indianLangModalSearch}
                onChange={(e) => setIndianLangModalSearch(e.target.value)}
                placeholder="Search Indian language (Hindi, Tamil, Telugu, Kannada, Bengali...)"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500"
              />
            </div>

            {/* Languages Grid */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INDIAN_LANGUAGES.filter((lang) => {
                const q = indianLangModalSearch.toLowerCase().trim();
                if (!q) return true;
                return (
                  lang.name.toLowerCase().includes(q) ||
                  lang.nativeName.toLowerCase().includes(q) ||
                  lang.code.toLowerCase().includes(q)
                );
              }).map((lang) => {
                const isSelected = (settings.selectedLanguage || 'en-IN') === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      handleSelectLanguage(lang.code);
                      setIsIndianLanguagesModalOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{lang.name}</div>
                      <div className="text-xs text-zinc-400">{lang.nativeName}</div>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs">
              <span className="text-zinc-500">English remains available at any time.</span>
              <button
                type="button"
                onClick={() => setIsIndianLanguagesModalOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice-First Interface Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedLanguage={settings.selectedLanguage || 'en-IN'}
        selectedCountry={settings.selectedCountry || 'IN'}
        persona={settings.persona}
        onSelectLanguage={handleSelectLanguage}
        onSendVoiceMessage={async (text, onChunk) => {
          if (onSendVoiceMessage) {
            return await onSendVoiceMessage(text, onChunk);
          } else {
            await onSendMessage(text, []);
            return undefined;
          }
        }}
      />

      {/* Download App / Add to Home Screen Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* HONK Device Agent Center Modal */}
      <DeviceAgentCenter
        isOpen={isDeviceAgentCenterOpen}
        onClose={() => setIsDeviceAgentCenterOpen(false)}
      />

      {/* Lightbox Modal for Attachment Previews */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-pointer"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={activeLightboxImage}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl border border-zinc-700"
            />
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute -top-3 -right-3 rounded-full bg-zinc-800 p-2 text-zinc-200 shadow-lg hover:bg-zinc-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

