import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Volume2,
  Radio,
  Zap,
  Palette,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Send,
  MessageSquare,
  Image as ImageIcon,
  User,
  Eye,
  Maximize2,
  HelpCircle,
  ShieldAlert,
  Share2,
  ExternalLink,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Snowflake,
} from 'lucide-react';
import {
  AppSettings,
  DailyUsage,
  Conversation,
  COUNTRIES_LIST,
  CountryOption,
  LanguageOption,
  INDIA_LANGUAGES,
  WallpaperConfig,
  WallpaperType,
  AssistantPersona,
  UserProfile,
  SharedChatSummary,
  WinterModeOption,
} from '../types';
import { getPiperStatus, PiperTtsStatus, speakWithHonkVoice, stopSpeaking } from '../lib/voice';
import { PRESET_ACCENT_COLORS, DEFAULT_ACCENT_COLOR, applyThemeAndAccent, getContrastForeground } from '../lib/theme';
import { fetchUserSharedChats, revokeSharedChat } from '../lib/shareService';
import {
  DEFAULT_WALLPAPER,
  DEFAULT_PERSONA,
  PRESET_WALLPAPERS,
  PRESET_GRADIENTS,
  PRESET_SOLIDS,
  PRESET_AVATARS,
  SUGGESTED_NAMES,
} from '../lib/personalization';
import { AssistantAvatar } from './AssistantAvatar';
import { HonkLogo } from './HonkLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  usage: DailyUsage | null;
  onResetUsage: () => void;
  onSimulateLimit: (count: number) => void;
  conversations: Conversation[];
  onImportConversations: (convos: Conversation[]) => void;
  onClearAllConversations: () => void;
  currentUser?: UserProfile;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  usage,
  onResetUsage,
  onSimulateLimit,
  conversations,
  onImportConversations,
  onClearAllConversations,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'persona' | 'focus' | 'country' | 'general' | 'quota' | 'data' | 'privacy'>('appearance');

  // Shared chats management state
  const [userShares, setUserShares] = useState<SharedChatSummary[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [confirmRevokeTarget, setConfirmRevokeTarget] = useState<SharedChatSummary | null>(null);
  const [shareActionMessage, setShareActionMessage] = useState<string | null>(null);

  // Appearance state
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'system'>(settings.theme || 'dark');
  const [currentAccent, setCurrentAccent] = useState<string>(settings.accentColor || DEFAULT_ACCENT_COLOR);
  const [customHexInput, setCustomHexInput] = useState<string>(settings.accentColor || DEFAULT_ACCENT_COLOR);

  // Wallpaper state
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(settings.wallpaper || DEFAULT_WALLPAPER);
  const [wallpaperTab, setWallpaperTab] = useState<WallpaperType>(settings.wallpaper?.type || 'default');

  // Winter Mode state
  const [winterMode, setWinterMode] = useState<WinterModeOption>(settings.winterMode || 'auto');

  // Persona state
  const [persona, setPersona] = useState<AssistantPersona>(settings.persona || DEFAULT_PERSONA);

  // Focus mode state
  const [focusMode, setFocusMode] = useState<boolean>(settings.focusMode || false);

  // General AI state
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [stream, setStream] = useState(settings.stream);
  const [enableWebSearch, setEnableWebSearch] = useState(settings.enableWebSearch);

  // Country & Language states
  const [selectedCountry, setSelectedCountry] = useState(settings.selectedCountry || 'IN');
  const [selectedLanguage, setSelectedLanguage] = useState(settings.selectedLanguage || 'en-IN');
  const [lowDataMode, setLowDataMode] = useState(settings.lowDataMode ?? false);
  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(settings.voiceAutoSpeak ?? true);
  const [voiceSpeed, setVoiceSpeed] = useState(settings.voiceSpeed ?? 1.0);
  const [honestAiDisclaimers, setHonestAiDisclaimers] = useState(settings.honestAiDisclaimers ?? true);
  const [, setPiperStatus] = useState<PiperTtsStatus | null>(null);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getPiperStatus().then((s) => setPiperStatus(s));
      setCurrentTheme(settings.theme || 'dark');
      setCurrentAccent(settings.accentColor || DEFAULT_ACCENT_COLOR);
      setCustomHexInput(settings.accentColor || DEFAULT_ACCENT_COLOR);
      setWallpaper(settings.wallpaper || DEFAULT_WALLPAPER);
      setWallpaperTab(settings.wallpaper?.type || 'default');
      setWinterMode(settings.winterMode || 'auto');
      setPersona(settings.persona || DEFAULT_PERSONA);
      setFocusMode(settings.focusMode || false);
    }
  }, [isOpen, settings]);

  const currentCountryObj =
    COUNTRIES_LIST.find((c) => c.code === selectedCountry) || COUNTRIES_LIST[0];

  const availableLanguages: LanguageOption[] =
    currentCountryObj?.supportedLanguages || INDIA_LANGUAGES;

  const handleCountryChange = (newCountryCode: string) => {
    setSelectedCountry(newCountryCode);
    const countryObj = COUNTRIES_LIST.find((c) => c.code === newCountryCode);
    if (countryObj && countryObj.supportedLanguages.length > 0) {
      const exists = countryObj.supportedLanguages.some((l) => l.code === selectedLanguage);
      if (!exists) {
        setSelectedLanguage(countryObj.supportedLanguages[0].code);
      }
    }
  };

  const handleTestVoicePlayback = () => {
    if (isTestingVoice) {
      stopSpeaking();
      setIsTestingVoice(false);
      return;
    }

    const currentLang = availableLanguages.find((l) => l.code === selectedLanguage) || availableLanguages[0];
    const assistantName = persona.name || 'Honk';
    const testPhrase = currentLang.code.startsWith('hi')
      ? `नमस्कार! मैं ${assistantName} हूँ, आपकी क्या सहायता करूँ?`
      : `Hello! I am ${assistantName}, how can I assist you today?`;

    setIsTestingVoice(true);
    speakWithHonkVoice({
      text: testPhrase,
      language: selectedLanguage,
      voice: currentLang.piperVoice,
      rate: voiceSpeed,
      onStart: () => setIsTestingVoice(true),
      onEnd: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    });
  };

  // Immediate Live Theme & Accent Switcher
  const handleThemeSelect = (themeMode: 'dark' | 'light' | 'system') => {
    setCurrentTheme(themeMode);
    applyThemeAndAccent(themeMode, currentAccent);
    onUpdateSettings({
      ...settings,
      theme: themeMode,
      accentColor: currentAccent,
    });
  };

  const handleAccentSelect = (hex: string) => {
    const formatted = hex.startsWith('#') ? hex : `#${hex}`;
    setCurrentAccent(formatted);
    setCustomHexInput(formatted);
    applyThemeAndAccent(currentTheme, formatted);
    onUpdateSettings({
      ...settings,
      theme: currentTheme,
      accentColor: formatted,
    });
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHexInput(val);
    if (/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
      const formatted = val.startsWith('#') ? val : `#${val}`;
      setCurrentAccent(formatted);
      applyThemeAndAccent(currentTheme, formatted);
      onUpdateSettings({
        ...settings,
        theme: currentTheme,
        accentColor: formatted,
      });
    }
  };

  // Live Wallpaper Handlers
  const handleUpdateWallpaper = (newWallpaper: WallpaperConfig) => {
    setWallpaper(newWallpaper);
    onUpdateSettings({
      ...settings,
      wallpaper: newWallpaper,
    });
  };

  const handleWallpaperTypeChange = (type: WallpaperType) => {
    setWallpaperTab(type);
    if (type === 'default') {
      handleUpdateWallpaper({
        ...wallpaper,
        type: 'default',
        value: '',
      });
    } else if (type === 'preset' && (!wallpaper.value || wallpaper.type !== 'preset')) {
      handleUpdateWallpaper({
        ...wallpaper,
        type: 'preset',
        value: PRESET_WALLPAPERS[0].url,
      });
    } else if (type === 'gradient' && (!wallpaper.value || wallpaper.type !== 'gradient')) {
      handleUpdateWallpaper({
        ...wallpaper,
        type: 'gradient',
        value: PRESET_GRADIENTS[0].gradient,
      });
    } else if (type === 'solid' && (!wallpaper.value || wallpaper.type !== 'solid')) {
      handleUpdateWallpaper({
        ...wallpaper,
        type: 'solid',
        value: PRESET_SOLIDS[0].hex,
      });
    }
  };

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Image size exceeds 15MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setWallpaperTab('custom');
        handleUpdateWallpaper({
          ...wallpaper,
          type: 'custom',
          value: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Live Persona Handlers
  const handleUpdatePersona = (newPersona: AssistantPersona) => {
    setPersona(newPersona);
    onUpdateSettings({
      ...settings,
      persona: newPersona,
    });
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Avatar image exceeds 8MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleUpdatePersona({
          ...persona,
          avatarType: 'custom',
          avatarValue: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Live Focus Mode Handler
  const handleToggleFocusMode = (enabled: boolean) => {
    setFocusMode(enabled);
    onUpdateSettings({
      ...settings,
      focusMode: enabled,
    });
  };

  // Live Winter Mode Handler (Instant, without reloading page)
  const handleWinterModeChange = (mode: WinterModeOption) => {
    setWinterMode(mode);
    onUpdateSettings({
      ...settings,
      winterMode: mode,
    });
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      theme: currentTheme,
      accentColor: currentAccent,
      winterMode,
      wallpaper,
      persona,
      focusMode,
      systemPrompt,
      temperature,
      stream,
      enableWebSearch,
      selectedCountry,
      selectedLanguage,
      lowDataMode,
      voiceAutoSpeak,
      voiceSpeed,
      honestAiDisclaimers,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `honk_conversations_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportConversations(parsed);
            alert(`Imported ${parsed.length} conversations successfully!`);
          } else {
            alert('Invalid conversation JSON file.');
          }
        } catch {
          alert('Could not parse JSON file.');
        }
      };
    }
  };

  const isCustomColor = !PRESET_ACCENT_COLORS.some((p) => p.hex.toLowerCase() === currentAccent.toLowerCase());
  const contrastFg = getContrastForeground(currentAccent);

  // Fetch user shares when privacy tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'privacy') {
      setIsLoadingShares(true);
      fetchUserSharedChats(currentUser?.id)
        .then((shares) => setUserShares(shares))
        .catch(() => {})
        .finally(() => setIsLoadingShares(false));
    }
  }, [isOpen, activeTab, currentUser?.id]);

  const handleConfirmRevoke = async (share: SharedChatSummary) => {
    setRevokingShareId(share.shareId);
    setShareActionMessage(null);
    const res = await revokeSharedChat(share.shareId, share.ownerSecret, currentUser?.id);
    setRevokingShareId(null);
    setConfirmRevokeTarget(null);
    if (res.success) {
      setUserShares((prev) =>
        prev.map((s) => (s.shareId === share.shareId ? { ...s, revoked: true, revokedAt: Date.now() } : s))
      );
      setShareActionMessage(`Share link for "${share.title}" has been revoked immediately.`);
    } else {
      setShareActionMessage(res.error || 'Failed to revoke shared link.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-700/80 bg-[var(--bg-surface)] p-6 shadow-2xl text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <HonkLogo size="sm" glow alt="Honk AI Settings" />
            <div>
              <h3 className="font-bold text-base text-[var(--text-main)] flex items-center gap-2">
                <span>Honk AI Personalization & Settings</span>
                {focusMode && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    Focus Mode Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Vibe Wallpapers, Persona Avatars, Focus Mode, Neural Voice & System
              </p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-zinc-800/70 p-1 text-xs">
          <button
            type="button"
            id="tab-appearance-btn"
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
              activeTab === 'appearance'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeTab === 'appearance'
                ? {
                    color: 'var(--honk-accent-text)',
                    borderBottom: '2px solid var(--honk-accent)',
                  }
                : {}
            }
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Appearance & Vibe</span>
          </button>

          <button
            type="button"
            id="tab-persona-btn"
            onClick={() => setActiveTab('persona')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
              activeTab === 'persona'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeTab === 'persona'
                ? {
                    color: 'var(--honk-accent-text)',
                    borderBottom: '2px solid var(--honk-accent)',
                  }
                : {}
            }
          >
            <User className="h-3.5 w-3.5" />
            <span>AI Persona</span>
          </button>

          <button
            type="button"
            id="tab-focus-btn"
            onClick={() => setActiveTab('focus')}
            className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
              activeTab === 'focus'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            style={
              activeTab === 'focus'
                ? {
                    color: 'var(--honk-accent-text)',
                    borderBottom: '2px solid var(--honk-accent)',
                  }
                : {}
            }
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Focus Mode</span>
          </button>

          <button
            type="button"
            id="tab-country-btn"
            onClick={() => setActiveTab('country')}
            className={`flex-1 min-w-[85px] rounded-lg py-2 font-medium transition ${
              activeTab === 'country'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🌐 Voice & Lang
          </button>

          <button
            type="button"
            id="tab-general-btn"
            onClick={() => setActiveTab('general')}
            className={`flex-1 min-w-[80px] rounded-lg py-2 font-medium transition ${
              activeTab === 'general'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚙️ AI System
          </button>

          <button
            type="button"
            id="tab-quota-btn"
            onClick={() => setActiveTab('quota')}
            className={`flex-1 min-w-[70px] rounded-lg py-2 font-medium transition ${
              activeTab === 'quota'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🛡️ Quota
          </button>

          <button
            type="button"
            id="tab-data-btn"
            onClick={() => setActiveTab('data')}
            className={`flex-1 min-w-[70px] rounded-lg py-2 font-medium transition ${
              activeTab === 'data'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💾 Backup
          </button>

          <button
            type="button"
            id="tab-privacy-btn"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 min-w-[80px] rounded-lg py-2 font-medium transition ${
              activeTab === 'privacy'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔒 Privacy & Shares
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* APPEARANCE & HONK VIBE (WALLPAPER) TAB                        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'appearance' && (
          <div className="mt-5 space-y-6 animate-in fade-in duration-150">
            {/* 1. Theme Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Interface Theme
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {currentTheme === 'dark' && 'Dark mode active'}
                  {currentTheme === 'light' && 'Light mode active'}
                  {currentTheme === 'system' && 'Following OS preferences'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  id="theme-dark-btn"
                  type="button"
                  onClick={() => handleThemeSelect('dark')}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 border text-center transition cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'border-[var(--honk-accent)] bg-[var(--honk-accent-subtle)] shadow-sm'
                      : 'border-zinc-700/60 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-zinc-100 shadow-inner">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)]">Dark</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Night & focus</div>
                  </div>
                </button>

                <button
                  id="theme-light-btn"
                  type="button"
                  onClick={() => handleThemeSelect('light')}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 border text-center transition cursor-pointer ${
                    currentTheme === 'light'
                      ? 'border-[var(--honk-accent)] bg-[var(--honk-accent-subtle)] shadow-sm'
                      : 'border-zinc-700/60 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shadow-inner">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)]">Light</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Crisp & clear</div>
                  </div>
                </button>

                <button
                  id="theme-system-btn"
                  type="button"
                  onClick={() => handleThemeSelect('system')}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 border text-center transition cursor-pointer ${
                    currentTheme === 'system'
                      ? 'border-[var(--honk-accent)] bg-[var(--honk-accent-subtle)] shadow-sm'
                      : 'border-zinc-700/60 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 shadow-inner">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)]">System</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Auto match OS</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Accent Color Palette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Honk AI Accent Color
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: currentAccent }}
                  />
                  <span className="font-mono text-[11px] text-[var(--text-muted)] uppercase">{currentAccent}</span>
                </div>
              </div>

              {/* Preset Swatches */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_ACCENT_COLORS.map((color) => {
                  const isSelected = currentAccent.toLowerCase() === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.id}
                      id={`accent-preset-${color.id}`}
                      type="button"
                      onClick={() => handleAccentSelect(color.hex)}
                      title={color.description}
                      className={`group relative flex flex-col items-center justify-center rounded-xl p-2 transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-[var(--honk-accent)] bg-zinc-800/80 shadow-md ring-offset-[var(--bg-surface)]'
                          : 'bg-zinc-800/40 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full shadow transition-transform group-hover:scale-105"
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelected && (
                          <Check
                            className="h-4 w-4 stroke-[3]"
                            style={{ color: getContrastForeground(color.hex) }}
                          />
                        )}
                      </div>
                      <span className="mt-1 text-[10px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)]">
                        {color.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker & Hex Input */}
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-2.5">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="custom-color-picker-input"
                    className="relative flex h-8 w-8 items-center justify-center rounded-lg shadow-sm border border-zinc-600 cursor-pointer overflow-hidden transition hover:scale-105"
                    style={{ backgroundColor: currentAccent }}
                    title="Click to open color picker"
                  >
                    <input
                      id="custom-color-picker-input"
                      type="color"
                      value={currentAccent.startsWith('#') ? currentAccent : `#${currentAccent}`}
                      onChange={(e) => handleAccentSelect(e.target.value)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                    />
                    <Sparkles
                      className="h-4 w-4 pointer-events-none"
                      style={{ color: contrastFg }}
                    />
                  </label>
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--text-main)]">Custom Hex</div>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-1.5 bg-zinc-900/90 rounded-lg px-2.5 py-1 border border-zinc-700/80">
                  <span className="text-xs font-mono text-zinc-500">#</span>
                  <input
                    id="custom-color-hex-input"
                    type="text"
                    maxLength={7}
                    value={customHexInput.replace('#', '')}
                    onChange={handleCustomHexChange}
                    placeholder="9333ea"
                    className="w-full bg-transparent text-xs font-mono text-zinc-100 outline-none uppercase"
                  />
                  {isCustomColor && (
                    <span className="rounded bg-[var(--honk-accent-subtle)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--honk-accent-text)]">
                      Custom
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. HONK VIBE — CHAT WALLPAPER */}
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--honk-accent-subtle)] text-[var(--honk-accent)]">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                      Honk Vibe — Chat Wallpaper
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Customize background behind chat with opacity, blur & brightness
                    </p>
                  </div>
                </div>

                {wallpaper.type !== 'default' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateWallpaper(DEFAULT_WALLPAPER)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Vibe</span>
                  </button>
                )}
              </div>

              {/* Wallpaper Type Filter Tabs */}
              <div className="flex gap-1 rounded-lg bg-zinc-900/80 p-1 text-[11px]">
                {(['default', 'solid', 'gradient', 'preset', 'custom'] as WallpaperType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleWallpaperTypeChange(type)}
                    className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${
                      wallpaperTab === type
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {type === 'default'
                      ? 'Default'
                      : type === 'solid'
                      ? 'Solid'
                      : type === 'gradient'
                      ? 'Gradient'
                      : type === 'preset'
                      ? 'Presets'
                      : 'Upload'}
                  </button>
                ))}
              </div>

              {/* A. Default Option Selected */}
              {wallpaperTab === 'default' && (
                <div className="rounded-lg border border-dashed border-zinc-700/80 p-4 text-center text-xs text-[var(--text-muted)]">
                  <p className="font-medium text-[var(--text-main)]">Standard Clean Honk Background</p>
                  <p className="text-[11px] mt-0.5">High-contrast, distraction-free neutral canvas.</p>
                </div>
              )}

              {/* B. Solid Color Wallpapers */}
              {wallpaperTab === 'solid' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_SOLIDS.map((solid) => {
                      const isSelected = wallpaper.type === 'solid' && wallpaper.value === solid.hex;
                      return (
                        <button
                          key={solid.id}
                          type="button"
                          onClick={() =>
                            handleUpdateWallpaper({
                              ...wallpaper,
                              type: 'solid',
                              value: solid.hex,
                            })
                          }
                          className={`flex flex-col items-center rounded-xl p-2 border transition ${
                            isSelected
                              ? 'border-[var(--honk-accent)] bg-zinc-800'
                              : 'border-zinc-700/60 bg-zinc-850 hover:bg-zinc-800'
                          }`}
                        >
                          <div
                            className="h-6 w-full rounded-md shadow-inner border border-white/10"
                            style={{ backgroundColor: solid.hex }}
                          />
                          <span className="mt-1 text-[10px] text-[var(--text-muted)] font-medium truncate w-full text-center">
                            {solid.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* C. Gradient Wallpapers */}
              {wallpaperTab === 'gradient' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_GRADIENTS.map((grad) => {
                    const isSelected = wallpaper.type === 'gradient' && wallpaper.value === grad.gradient;
                    return (
                      <button
                        key={grad.id}
                        type="button"
                        onClick={() =>
                          handleUpdateWallpaper({
                            ...wallpaper,
                            type: 'gradient',
                            value: grad.gradient,
                          })
                        }
                        className={`group flex flex-col rounded-xl p-2 border transition text-left ${
                          isSelected
                            ? 'border-[var(--honk-accent)] bg-zinc-800 shadow-sm'
                            : 'border-zinc-700/60 bg-zinc-850 hover:bg-zinc-800'
                        }`}
                      >
                        <div
                          className="h-10 w-full rounded-lg shadow-inner border border-white/10 mb-1.5 transition-transform group-hover:scale-102"
                          style={{ background: grad.gradient }}
                        />
                        <span className="text-[11px] font-semibold text-[var(--text-main)] truncate">
                          {grad.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* D. Preset Wallpapers */}
              {wallpaperTab === 'preset' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_WALLPAPERS.map((preset) => {
                    const isSelected = wallpaper.type === 'preset' && wallpaper.value === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          handleUpdateWallpaper({
                            ...wallpaper,
                            type: 'preset',
                            value: preset.url,
                          })
                        }
                        className={`group relative overflow-hidden rounded-xl border p-1.5 transition text-left ${
                          isSelected
                            ? 'border-[var(--honk-accent)] bg-zinc-800 shadow-md ring-2 ring-[var(--honk-accent)]/50'
                            : 'border-zinc-700/60 bg-zinc-850 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="relative h-14 w-full rounded-lg overflow-hidden bg-zinc-950">
                          <img
                            src={preset.thumbnail}
                            alt={preset.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-white truncate drop-shadow">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* E. Custom Image Upload */}
              {wallpaperTab === 'custom' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 p-4 text-center">
                    <label className="flex flex-col items-center justify-center cursor-pointer group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 group-hover:text-zinc-100 group-hover:bg-zinc-700 transition">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-xs font-semibold text-[var(--text-main)]">
                        Click or drag custom wallpaper image
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Supports PNG, JPG, WEBP, GIF, SVG (up to 15MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomWallpaperUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {wallpaper.type === 'custom' && wallpaper.value && (
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/80 p-2.5">
                      <div className="h-12 w-20 rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-zinc-700">
                        <img
                          src={wallpaper.value}
                          alt="Custom Wallpaper Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-main)] truncate">Custom Image Active</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Applied without watermarks</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateWallpaper(DEFAULT_WALLPAPER)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-400 transition"
                        title="Remove custom wallpaper"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sliders for Opacity, Blur, Brightness (if wallpaper is active) */}
              {wallpaper.type !== 'default' && (
                <div className="space-y-3 pt-3 border-t border-zinc-750">
                  {/* Opacity Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)]">
                      <span>Wallpaper Intensity (Opacity)</span>
                      <span className="font-mono text-[var(--text-main)] font-semibold">
                        {Math.round(wallpaper.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={wallpaper.opacity}
                      onChange={(e) =>
                        handleUpdateWallpaper({
                          ...wallpaper,
                          opacity: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1 w-full honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Blur Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)]">
                      <span>Background Blur</span>
                      <span className="font-mono text-[var(--text-main)] font-semibold">
                        {wallpaper.blur}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={wallpaper.blur}
                      onChange={(e) =>
                        handleUpdateWallpaper({
                          ...wallpaper,
                          blur: parseInt(e.target.value, 10),
                        })
                      }
                      className="mt-1 w-full honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Brightness Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)]">
                      <span>Background Brightness</span>
                      <span className="font-mono text-[var(--text-main)] font-semibold">
                        {wallpaper.brightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="150"
                      step="5"
                      value={wallpaper.brightness}
                      onChange={(e) =>
                        handleUpdateWallpaper({
                          ...wallpaper,
                          brightness: parseInt(e.target.value, 10),
                        })
                      }
                      className="mt-1 w-full honk-accent-slider cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. SEASONAL WINTER MODE — SMOOTH SNOWFALL EXPERIENCE */}
            <div id="settings-winter-mode-panel" className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-zinc-850/60 to-zinc-900/60 p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                    <Snowflake className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        Winter Mode
                      </h4>
                      <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                        ❄️ Seasonal Update
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Calm, smooth snowfall animation with 3 depth layers behind the chat interface
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Toggle Option Buttons: OFF / ON / AUTO */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'off', label: 'OFF', sub: 'Standard clean' },
                  { id: 'on', label: 'ON', sub: 'Continuous snowfall' },
                  { id: 'auto', label: 'AUTO', sub: 'Seasonal default' },
                ].map((opt) => {
                  const isSelected = (winterMode || 'auto') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      id={`winter-mode-${opt.id}-btn`}
                      onClick={() => handleWinterModeChange(opt.id as WinterModeOption)}
                      className={`group flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition cursor-pointer border ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500/20 text-white shadow-sm ring-1 ring-sky-400/40'
                          : 'border-zinc-750/70 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-extrabold tracking-wide flex items-center gap-1">
                        {opt.label}
                        {isSelected && <Check className="h-3 w-3 text-sky-300" />}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5 group-hover:text-zinc-200">
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400 border-t border-zinc-750/60">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${winterMode === 'off' ? 'bg-zinc-500' : 'bg-sky-400 animate-pulse'}`} />
                  <span className={winterMode === 'off' ? 'text-zinc-400' : 'text-sky-300 font-medium'}>
                    {winterMode === 'off'
                      ? 'Snowfall paused'
                      : 'Snowfall active • 60 FPS Canvas (Zero UI obstruction)'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Respects reduced-motion
                </span>
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-800/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--honk-accent)]" />
                  <span>Real-Time Appearance Preview</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">● Instant Apply</span>
              </div>

              {/* Mock Chat Card with live wallpaper background */}
              <div className="relative overflow-hidden rounded-xl border border-zinc-700/80 bg-[var(--bg-page)] p-4 shadow-inner">
                {/* Embedded preview wallpaper */}
                {wallpaper.type !== 'default' && (
                  <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all"
                    style={{
                      backgroundImage:
                        wallpaper.type === 'preset' || wallpaper.type === 'custom'
                          ? `url("${wallpaper.value}")`
                          : undefined,
                      backgroundColor: wallpaper.type === 'solid' ? wallpaper.value : undefined,
                      background: wallpaper.type === 'gradient' ? wallpaper.value : undefined,
                      opacity: wallpaper.opacity,
                      filter: `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness}%)`,
                    }}
                  />
                )}
                {/* Contrast overlay */}
                <div className="absolute inset-0 bg-[var(--bg-page)]/60 pointer-events-none" />

                {/* Content over wallpaper */}
                <div className="relative z-10 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AssistantAvatar persona={persona} size="sm" />
                    <div className="rounded-xl border border-zinc-700/80 bg-zinc-850/90 backdrop-blur-sm px-3.5 py-2 text-xs text-zinc-100 shadow-sm max-w-sm">
                      <span className="font-semibold text-[var(--honk-accent-text)]">{persona.name || 'Honk'}:</span> Welcome!
                      Your customized theme, accent color, and chat wallpaper are live.
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-700/50 text-xs">
                    <span
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-sm"
                      style={{
                        backgroundColor: 'var(--honk-accent)',
                        color: 'var(--honk-accent-foreground)',
                      }}
                    >
                      Active Accent
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Text readability protected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* HONK PERSONA TAB (NAME & AVATAR)                              */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'persona' && (
          <div className="mt-5 space-y-6 animate-in fade-in duration-150">
            {/* 1. Assistant Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  AI Assistant Display Name
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Appears in Chat, Voice, & Header
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="persona-name-input"
                  type="text"
                  maxLength={24}
                  value={persona.name}
                  onChange={(e) =>
                    handleUpdatePersona({
                      ...persona,
                      name: e.target.value || 'Honk',
                    })
                  }
                  placeholder="e.g. Honk, Nova, Jarvis"
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
                />

                <button
                  type="button"
                  onClick={() =>
                    handleUpdatePersona({
                      ...persona,
                      name: 'Honk',
                    })
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Reset Name
                </button>
              </div>

              {/* Suggested Names Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[var(--text-muted)] mr-1">Quick Suggestions:</span>
                {SUGGESTED_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      handleUpdatePersona({
                        ...persona,
                        name,
                      })
                    }
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                      persona.name === name
                        ? 'bg-[var(--honk-accent)] text-[var(--honk-accent-foreground)] font-bold'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Assistant Avatar Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  AI Avatar & Identity
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Choose preset or upload custom image
                </span>
              </div>

              {/* Avatar Type Selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdatePersona({
                      ...persona,
                      avatarType: 'default',
                      avatarValue: '',
                    })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-3 border transition cursor-pointer ${
                    persona.avatarType === 'default'
                      ? 'border-[var(--honk-accent)] bg-[var(--honk-accent-subtle)] font-bold shadow-sm'
                      : 'border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <AssistantAvatar size="sm" />
                  <span className="text-xs">Original Goose</span>
                </button>

                <label className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 cursor-pointer transition">
                  <Upload className="h-4 w-4" />
                  <span className="text-xs font-medium">Upload Custom</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Custom Avatar preview if active */}
              {persona.avatarType === 'custom' && persona.avatarValue && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--honk-accent)] bg-[var(--honk-accent-subtle)] p-3">
                  <AssistantAvatar persona={persona} size="md" glow />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-main)]">Custom Avatar Active</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Displayed across chat and voice orb</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePersona({
                        ...persona,
                        avatarType: 'default',
                        avatarValue: '',
                      })
                    }
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Curated Preset Avatars Grid */}
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-2">
                  Curated Preset Avatars:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected =
                      (preset.id === 'honk' && persona.avatarType === 'default') ||
                      (persona.avatarType === 'preset' && persona.avatarValue === preset.id);

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (preset.id === 'honk') {
                            handleUpdatePersona({
                              ...persona,
                              avatarType: 'default',
                              avatarValue: '',
                            });
                          } else {
                            handleUpdatePersona({
                              ...persona,
                              avatarType: 'preset',
                              avatarValue: preset.id,
                            });
                          }
                        }}
                        className={`group flex flex-col items-center justify-center rounded-xl p-2.5 border transition cursor-pointer ${
                          isSelected
                            ? 'border-[var(--honk-accent)] bg-zinc-800 ring-2 ring-[var(--honk-accent)]/50 shadow-md'
                            : 'border-zinc-700/60 bg-zinc-850 hover:bg-zinc-800'
                        }`}
                        title={preset.description}
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${preset.bgGradient} text-lg shadow transition-transform group-hover:scale-105`}
                        >
                          {preset.emoji}
                        </div>
                        <span className="mt-1.5 text-[10px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] truncate w-full text-center">
                          {preset.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Persona Preview Box */}
            <div className="rounded-xl border border-zinc-700/70 bg-zinc-800/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span>Active Persona Preview</span>
                <span className="text-[10px] text-emerald-400 font-mono">● Real-time</span>
              </div>

              <div className="flex items-center gap-3.5 rounded-xl border border-zinc-700/80 bg-[var(--bg-page)] p-3.5 shadow-sm">
                <AssistantAvatar persona={persona} size="lg" glow />
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <span>{persona.name || 'Honk'}</span>
                    <span className="rounded-md bg-[var(--honk-accent-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--honk-accent-text)] border border-[var(--honk-accent-border)]">
                      AI Assistant
                    </span>
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    "Ready to assist you with unstoppable speed, coding, reasoning, and voice intelligence."
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FOCUS MODE TAB                                                */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'focus' && (
          <div className="mt-5 space-y-5 animate-in fade-in duration-150">
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/40 p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
                    <Maximize2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">
                      Distraction-Free Focus Mode
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Maximizes the conversation view by automatically collapsing navigation, sidebars, and peripheral elements for deep coding and thinking.
                    </p>
                  </div>
                </div>

                {/* Focus mode switch toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={focusMode}
                    onChange={(e) => handleToggleFocusMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--honk-accent)]"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800 text-xs">
                <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800/80">
                  <div className="font-semibold text-[var(--text-main)]">✨ Centered View</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Optimized column width for reading and writing.</div>
                </div>
                <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800/80">
                  <div className="font-semibold text-[var(--text-main)]">⚡ Full Power Active</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Voice mode, attachments, and models remain 100% active.</div>
                </div>
                <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800/80">
                  <div className="font-semibold text-[var(--text-main)]">⌨️ Quick Shortcut</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-300">Shift + F</kbd> anytime to toggle.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* COUNTRY & VOICE TAB                                           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'country' && (
          <form onSubmit={handleSaveGeneral} className="mt-5 space-y-4 animate-in fade-in duration-150">
            {/* Country Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Your Country / Region
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 p-2.5 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
              >
                {COUNTRIES_LIST.map((country) => (
                  <option key={country.code} value={country.code} className="bg-zinc-900 text-zinc-100">
                    {country.flag} {country.name} ({country.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Preferred Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 p-2.5 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-zinc-900 text-zinc-100">
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {persona.name || 'Honk'} uses this language for text chat, voice input (STT), and Piper neural speech output.
              </p>
            </div>

            {/* Voice Controls */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-4 w-4" style={{ color: 'var(--honk-accent)' }} />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-main)]">Auto-Speak Spoken Responses</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Automatically synthesize and read out AI replies in chat mode
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={voiceAutoSpeak}
                  onChange={(e) => setVoiceAutoSpeak(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                  <span>Voice Speech Rate</span>
                  <span className="font-mono" style={{ color: 'var(--honk-accent)' }}>
                    {voiceSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.1"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="mt-1.5 w-full honk-accent-slider cursor-pointer"
                />
              </div>

              {/* Piper TTS Engine Status */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-400" />
                  <span>TTS Engine: Piper Neural Audio</span>
                </span>
                <button
                  type="button"
                  onClick={handleTestVoicePlayback}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] font-semibold border border-zinc-700 transition active:scale-95 flex items-center gap-1.5"
                  style={{ color: 'var(--honk-accent-text)' }}
                >
                  <Volume2 className="h-3 w-3" />
                  <span>{isTestingVoice ? 'Stop Audio' : 'Test Audio'}</span>
                </button>
              </div>
            </div>

            {/* Low-Data Mode Toggle */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-main)]">Low-Data Mode (2G / Slow Networks)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Compresses payloads and minimizes data footprint.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={lowDataMode}
                  onChange={(e) => setLowDataMode(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                />
              </div>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* AI BEHAVIOR & SYSTEM TAB                                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="mt-5 space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                System Instructions / Behavior
              </label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 p-3 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Creativity / Temperature</span>
                <span className="font-mono text-zinc-200">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="mt-1 w-full honk-accent-slider cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/40 p-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-main)]">Enable Web Search by Default</div>
                <div className="text-[11px] text-[var(--text-muted)]">Grounds answers with real-time Google Search results</div>
              </div>
              <input
                type="checkbox"
                checked={enableWebSearch}
                onChange={(e) => setEnableWebSearch(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 honk-accent-slider cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/40 p-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-main)]">Stream Responses Real-Time</div>
                <div className="text-[11px] text-[var(--text-muted)]">Live token-by-token text generation</div>
              </div>
              <input
                type="checkbox"
                checked={stream}
                onChange={(e) => setStream(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 honk-accent-slider cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/40 p-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-main)]">Honest AI Verification Warnings</div>
                <div className="text-[11px] text-[var(--text-muted)]">Displays confidence disclaimers on critical topics</div>
              </div>
              <input
                type="checkbox"
                checked={honestAiDisclaimers}
                onChange={(e) => setHonestAiDisclaimers(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 honk-accent-slider cursor-pointer"
              />
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* QUOTA TAB                                                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'quota' && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-150">
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Daily Message Quota</span>
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--honk-accent)' }}>
                  {usage ? `${usage.remaining} / ${usage.limit} remaining` : '100 / 100 remaining'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: 'var(--honk-accent)',
                    width: `${usage ? Math.min(100, (usage.used / usage.limit) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onResetUsage}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Quota</span>
              </button>
              <button
                type="button"
                onClick={() => onSimulateLimit(100)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-800/50 bg-rose-950/40 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition"
              >
                <span>Simulate 0 Remaining</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DATA & PRIVACY TAB                                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'data' && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-150">
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4 space-y-3">
              <div className="text-xs font-semibold text-[var(--text-main)]">Export & Backup Conversations</div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Download all your chats and memory to a secure, portable JSON file.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export JSON</span>
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 space-y-2">
              <div className="text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Danger Zone</span>
              </div>
              <p className="text-[11px] text-rose-200/70">
                Permanently deletes all active conversations and reset local storage.
              </p>
              {confirmClear ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllConversations();
                      setConfirmClear(false);
                    }}
                    className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                  >
                    Confirm Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-800/80 bg-rose-950/60 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All Conversations</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PRIVACY & SHARED CHATS TAB                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'privacy' && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-150">
            {/* Revoke Confirmation Dialog */}
            {confirmRevokeTarget && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Revoke Public Share Link?</span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Are you sure you want to revoke the public share link for{' '}
                  <span className="font-semibold text-zinc-100">"{confirmRevokeTarget.title}"</span>?
                  Anyone visiting this link in the future will see that access has been revoked.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!!revokingShareId}
                    onClick={() => handleConfirmRevoke(confirmRevokeTarget)}
                    className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    {revokingShareId ? 'Revoking...' : 'Confirm Revoke'}
                  </button>
                  <button
                    type="button"
                    disabled={!!revokingShareId}
                    onClick={() => setConfirmRevokeTarget(null)}
                    className="flex-1 rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Notification alert */}
            {shareActionMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{shareActionMessage}</span>
              </div>
            )}

            {/* Shared Chats List */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Shared Chats</span>
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Manage active and revoked snapshot links created from your conversations.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                  {userShares.length} link{userShares.length === 1 ? '' : 's'}
                </span>
              </div>

              {isLoadingShares ? (
                <div className="py-6 text-center text-xs text-zinc-400">Loading shared links...</div>
              ) : userShares.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-6 text-center space-y-1">
                  <p className="text-xs text-zinc-400">No conversations shared yet.</p>
                  <p className="text-[11px] text-zinc-500">
                    Use the Share button at the top of any completed conversation to generate a shareable link.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {userShares.map((share) => (
                    <div
                      key={share.shareId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-zinc-700/60 bg-zinc-900/80 p-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200 truncate max-w-[220px]">
                            {share.title}
                          </span>
                          {share.revoked ? (
                            <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 shrink-0">
                              Revoked
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span>{new Date(share.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{share.messageCount} messages</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-zinc-500">ID: {share.shareId.slice(0, 8)}...</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* View Share */}
                        <a
                          href={`/share/${share.shareId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View</span>
                        </a>

                        {/* Revoke Share */}
                        {!share.revoked && (
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeTarget(share)}
                            className="flex items-center gap-1 rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-900/60 transition cursor-pointer"
                          >
                            <Lock className="h-3 w-3" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Architecture Guarantee */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Privacy & Secrecy Safeguards</span>
              </div>
              <ul className="space-y-1 text-[11px] text-zinc-400 list-disc list-inside leading-relaxed">
                <li>Shared links are unguessable cryptographically secure random identifiers.</li>
                <li>API keys, passwords, authentication tokens, and system instructions are never stored in shares.</li>
                <li>Shared pages are tagged with <span className="font-mono text-zinc-300">noindex, nofollow, noarchive</span> to protect them from search engines.</li>
                <li>Visitors are restricted to read-only access and cannot modify or continue your original chat.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
