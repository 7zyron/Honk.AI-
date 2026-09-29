import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Palette,
  Globe,
  Brain,
  Volume2,
  Lock,
  Bell,
  LogOut,
  Check,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Zap,
  Sun,
  Moon,
  Monitor,
  Maximize2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
  Boxes,
  FileCode,
  Code2,
  Folder,
  Snowflake,
} from 'lucide-react';
import {
  AppSettings,
  DailyUsage,
  Conversation,
  COUNTRIES_LIST,
  LanguageOption,
  INDIA_LANGUAGES,
  WallpaperConfig,
  WallpaperType,
  AssistantPersona,
  UserProfile,
  SharedChatSummary,
  UserBirthday,
  WinterModeOption,
} from '../types';
import { getPiperStatus, PiperTtsStatus, speakWithHonkVoice, stopSpeaking } from '../lib/voice';
import { PRESET_ACCENT_COLORS, DEFAULT_ACCENT_COLOR, applyThemeAndAccent, getContrastForeground } from '../lib/theme';
import { fetchUserSharedChats, revokeSharedChat } from '../lib/shareService';
import { getStoredProjects, deleteStoredProject, downloadProjectZip } from '../lib/projectStorage';
import { HonkProject } from '../lib/imports/types';
import {
  DEFAULT_WALLPAPER,
  DEFAULT_PERSONA,
  PRESET_WALLPAPERS,
  PRESET_GRADIENTS,
  PRESET_SOLIDS,
  PRESET_AVATARS,
  SUGGESTED_NAMES,
} from '../lib/personalization';
import { HonkLogo } from './HonkLogo';
import { AssistantAvatar } from './AssistantAvatar';

export type SettingsSectionId =
  | 'account'
  | 'appearance'
  | 'language'
  | 'memory'
  | 'voice'
  | 'privacy'
  | 'notifications'
  | 'imported_apps'
  | 'developer_center'
  | 'logout';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(month: number): number {
  if ([4, 6, 9, 11].includes(month)) return 30;
  if (month === 2) return 29;
  return 31;
}

export interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  usage: DailyUsage | null;
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onSignOut: () => void;
  onResetUsage: () => void;
  onSimulateLimit: (count: number) => void;
  conversations: Conversation[];
  onImportConversations: (convos: Conversation[]) => void;
  onClearAllConversations: () => void;
  onNavigateHome: () => void;
  initialTab?: SettingsSectionId;
  onOpenStudio?: (project: HonkProject) => void;
  onOpenImportModal?: () => void;
  onOpenDeveloperCenter?: () => void;
  onOpenDeveloperAuth?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  usage,
  currentUser,
  onUpdateUser,
  onSignOut,
  onResetUsage,
  onSimulateLimit,
  conversations,
  onImportConversations,
  onClearAllConversations,
  onNavigateHome,
  initialTab = 'account',
  onOpenStudio,
  onOpenImportModal,
  onOpenDeveloperCenter,
  onOpenDeveloperAuth,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsSectionId>(initialTab);

  // Dynamic Title Management
  useEffect(() => {
    document.title = 'Settings & Preferences | Honk AI';
    const originalTitle = 'Honk AI | Official AI Assistant';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // Account tab state
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || PRESET_AVATARS[0].id);
  const [birthMonth, setBirthMonth] = useState<number | ''>(currentUser.birthday?.month || '');
  const [birthDay, setBirthDay] = useState<number | ''>(currentUser.birthday?.day || '');
  const [accountSaved, setAccountSaved] = useState(false);

  // Appearance tab state
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'system'>(settings.theme || 'dark');
  const [currentAccent, setCurrentAccent] = useState<string>(settings.accentColor || DEFAULT_ACCENT_COLOR);
  const [customHexInput, setCustomHexInput] = useState<string>(settings.accentColor || DEFAULT_ACCENT_COLOR);
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(settings.wallpaper || DEFAULT_WALLPAPER);
  const [wallpaperSubTab, setWallpaperSubTab] = useState<WallpaperType>(settings.wallpaper?.type || 'default');
  const [persona, setPersona] = useState<AssistantPersona>(settings.persona || DEFAULT_PERSONA);
  const [focusMode, setFocusMode] = useState<boolean>(settings.focusMode || false);
  const [winterMode, setWinterMode] = useState<WinterModeOption>(settings.winterMode || 'auto');

  // Language tab state
  const [selectedCountry, setSelectedCountry] = useState(settings.selectedCountry || 'IN');
  const [selectedLanguage, setSelectedLanguage] = useState(settings.selectedLanguage || 'en-IN');
  const [lowDataMode, setLowDataMode] = useState(settings.lowDataMode ?? false);
  const [honestAiDisclaimers, setHonestAiDisclaimers] = useState(settings.honestAiDisclaimers ?? true);

  // Memory tab state
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [stream, setStream] = useState(settings.stream);
  const [enableWebSearch, setEnableWebSearch] = useState(settings.enableWebSearch);
  const [confirmClear, setConfirmClear] = useState(false);

  // Voice tab state
  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(settings.voiceAutoSpeak ?? true);
  const [voiceSpeed, setVoiceSpeed] = useState(settings.voiceSpeed ?? 1.0);
  const [ttsEngine, setTtsEngine] = useState<'piper' | 'webspeech' | 'auto'>(settings.ttsEngine || 'auto');
  const [piperStatus, setPiperStatus] = useState<PiperTtsStatus | null>(null);
  const [isSpeakingTest, setIsSpeakingTest] = useState(false);

  // Imported Projects tab state
  const [storedProjects, setStoredProjects] = useState<HonkProject[]>(() => getStoredProjects());

  const refreshProjectsList = () => {
    setStoredProjects(getStoredProjects());
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete project "${name}"?`)) {
      deleteStoredProject(id);
      refreshProjectsList();
    }
  };

  // Privacy tab state
  const [userShares, setUserShares] = useState<SharedChatSummary[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [shareActionMessage, setShareActionMessage] = useState<string | null>(null);

  // Notifications tab state
  const [soundNotifications, setSoundNotifications] = useState(settings.soundNotifications ?? true);
  const [quotaAlerts, setQuotaAlerts] = useState(settings.quotaAlerts ?? true);
  const [featureAnnouncements, setFeatureAnnouncements] = useState(settings.featureAnnouncements ?? false);
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isSaved, setIsSaved] = useState(false);

  // Synchronize state when external props update
  useEffect(() => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setAvatar(currentUser.avatar || PRESET_AVATARS[0].id);
    setBirthMonth(currentUser.birthday?.month || '');
    setBirthDay(currentUser.birthday?.day || '');
  }, [currentUser]);

  useEffect(() => {
    getPiperStatus().then((s) => setPiperStatus(s));
    setCurrentTheme(settings.theme || 'dark');
    setCurrentAccent(settings.accentColor || DEFAULT_ACCENT_COLOR);
    setCustomHexInput(settings.accentColor || DEFAULT_ACCENT_COLOR);
    setWallpaper(settings.wallpaper || DEFAULT_WALLPAPER);
    setWallpaperSubTab(settings.wallpaper?.type || 'default');
    setPersona(settings.persona || DEFAULT_PERSONA);
    setFocusMode(settings.focusMode || false);
    setSelectedCountry(settings.selectedCountry || 'IN');
    setSelectedLanguage(settings.selectedLanguage || 'en-IN');
    setLowDataMode(settings.lowDataMode ?? false);
    setHonestAiDisclaimers(settings.honestAiDisclaimers ?? true);
    setSystemPrompt(settings.systemPrompt);
    setTemperature(settings.temperature);
    setStream(settings.stream);
    setEnableWebSearch(settings.enableWebSearch);
    setVoiceAutoSpeak(settings.voiceAutoSpeak ?? true);
    setVoiceSpeed(settings.voiceSpeed ?? 1.0);
    setTtsEngine(settings.ttsEngine || 'auto');
    setSoundNotifications(settings.soundNotifications ?? true);
    setQuotaAlerts(settings.quotaAlerts ?? true);
    setFeatureAnnouncements(settings.featureAnnouncements ?? false);
  }, [settings]);

  // Load privacy shares on tab switch
  useEffect(() => {
    if (activeTab === 'privacy') {
      setIsLoadingShares(true);
      fetchUserSharedChats(currentUser?.id)
        .then((shares) => setUserShares(shares))
        .catch(() => {})
        .finally(() => setIsLoadingShares(false));
    }
  }, [activeTab, currentUser?.id]);

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

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    let birthdayObj: UserBirthday | null = null;
    if (birthMonth && birthDay) {
      birthdayObj = {
        month: Number(birthMonth),
        day: Number(birthDay),
      };
    }

    onUpdateUser({
      ...currentUser,
      name: name.trim() || 'Honk User',
      email: email.trim(),
      avatar,
      birthday: birthdayObj,
    });
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 2500);
  };

  // Theme & Appearance handlers
  const handleThemeSelect = (theme: 'dark' | 'light' | 'system') => {
    setCurrentTheme(theme);
    applyThemeAndAccent(theme, currentAccent);
    onUpdateSettings({
      ...settings,
      theme,
    });
  };

  const handleAccentSelect = (hex: string) => {
    setCurrentAccent(hex);
    setCustomHexInput(hex);
    applyThemeAndAccent(currentTheme, hex);
    onUpdateSettings({
      ...settings,
      accentColor: hex,
    });
  };

  const handleCustomHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hex = customHexInput.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      handleAccentSelect(hex);
    }
  };

  const handleWallpaperChange = (type: WallpaperType, value: string) => {
    const newWallpaper: WallpaperConfig = {
      type,
      value,
      opacity: wallpaper.opacity ?? 0.45,
      blur: wallpaper.blur ?? 0,
      brightness: wallpaper.brightness ?? 100,
    };
    setWallpaper(newWallpaper);
    onUpdateSettings({
      ...settings,
      wallpaper: newWallpaper,
    });
  };

  const handleToggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    onUpdateSettings({
      ...settings,
      focusMode: next,
    });
  };

  const handleWinterModeChange = (mode: WinterModeOption) => {
    setWinterMode(mode);
    onUpdateSettings({
      ...settings,
      winterMode: mode,
    });
  };

  // Master Settings Save
  const handleSaveSettings = () => {
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
      ttsEngine,
      honestAiDisclaimers,
      soundNotifications,
      quotaAlerts,
      featureAnnouncements,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Voice Test Handler
  const handleTestVoice = async () => {
    if (isSpeakingTest) {
      stopSpeaking();
      setIsSpeakingTest(false);
      return;
    }

    setIsSpeakingTest(true);
    const sampleText =
      selectedLanguage === 'hi-IN'
        ? 'नमस्ते! मैं होंक एआई हूँ, आपकी सहायता के लिए तैयार।'
        : 'Hello! I am Honk AI, ready to assist you with high-speed intelligence.';

    try {
      await speakWithHonkVoice({
        text: sampleText,
        language: selectedLanguage,
        rate: voiceSpeed,
        onStart: () => setIsSpeakingTest(true),
        onEnd: () => setIsSpeakingTest(false),
        onError: () => setIsSpeakingTest(false),
      });
    } catch {
      setIsSpeakingTest(false);
    }
  };

  // Export conversations to JSON
  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `honk_conversations_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import conversations from JSON
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
            alert('Invalid conversation JSON file structure.');
          }
        } catch {
          alert('Could not parse conversation backup file.');
        }
      };
    }
  };

  // Revoke Share Handler
  const handleConfirmRevoke = async (share: SharedChatSummary) => {
    setRevokingShareId(share.shareId);
    setShareActionMessage(null);
    const res = await revokeSharedChat(share.shareId, share.ownerSecret, currentUser?.id);
    setRevokingShareId(null);
    if (res.success) {
      setUserShares((prev) =>
        prev.map((s) => (s.shareId === share.shareId ? { ...s, revoked: true, revokedAt: Date.now() } : s))
      );
      setShareActionMessage(`Share link for "${share.title}" has been revoked.`);
    } else {
      setShareActionMessage(res.error || 'Failed to revoke shared link.');
    }
  };

  // Notification Permission Handler
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setBrowserNotificationStatus(permission);
        if (permission === 'granted') {
          new Notification('Honk AI Notifications Enabled', {
            body: 'You will receive notifications for task completion and daily limit updates.',
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission', err);
      }
    }
  };

  const maxDays = birthMonth ? getDaysInMonth(Number(birthMonth)) : 31;

  // Selected avatar object or fallback
  const currentAvatarPreset = PRESET_AVATARS.find((a) => a.id === avatar) || PRESET_AVATARS[0];

  const tabs: Array<{ id: SettingsSectionId; label: string; icon: React.ReactNode; desc: string }> = [
    { id: 'account', label: 'Account', icon: <User className="h-4 w-4" />, desc: 'Profile, avatar & quota' },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" />, desc: 'Themes, vibe & colors' },
    { id: 'language', label: 'Language', icon: <Globe className="h-4 w-4" />, desc: 'Country, 22 languages & low-data' },
    { id: 'memory', label: 'Memory', icon: <Brain className="h-4 w-4" />, desc: 'AI persona, backup & context' },
    { id: 'voice', label: 'Voice', icon: <Volume2 className="h-4 w-4" />, desc: 'Piper TTS, speed & auto-speak' },
    { id: 'privacy', label: 'Privacy', icon: <Lock className="h-4 w-4" />, desc: 'Shared chats & security' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, desc: 'Audio chimes & limit alerts' },
    { id: 'imported_apps', label: 'Imported Projects', icon: <Boxes className="h-4 w-4" />, desc: 'Honk App Builder imports & exports' },
    ...(currentUser.role === 'DEVELOPER' || currentUser.role === 'ADMIN'
      ? [
          {
            id: 'developer_center' as SettingsSectionId,
            label: 'Improvement Center',
            icon: <Shield className="h-4 w-4 text-red-400" />,
            desc: 'Zyron Developer Self-Improvement & Practice Lab',
          },
        ]
      : []),
    { id: 'logout', label: 'Logout', icon: <LogOut className="h-4 w-4" />, desc: 'Session, reset & sign out' },
  ];

  return (
    <div className="min-h-screen w-full bg-[var(--bg-page)] text-[var(--text-main)] font-sans selection:bg-[var(--honk-accent-subtle)] selection:text-[var(--honk-accent-text)]">
      {/* Top Header Bar with Back Button */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[var(--bg-surface)]/90 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="settings-back-btn"
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 transition shadow-sm cursor-pointer"
              title="Back to Honk AI Chat"
            >
              <ArrowLeft className="h-4 w-4 text-amber-400" />
              <span>Back to Chat</span>
            </button>

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-zinc-800">
              <HonkLogo size="sm" glow alt="Honk AI" />
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-2">
                  <span>Settings & Preferences</span>
                  {focusMode && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Focus Mode Active
                    </span>
                  )}
                </h1>
                <p className="text-[11px] text-[var(--text-muted)]">Configure your complete Honk AI workspace</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved</span>
              </span>
            )}
            <button
              id="settings-save-header-btn"
              type="button"
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-zinc-950 transition shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'var(--honk-accent)' }}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Sidebar / Tabs Navigation */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-[var(--bg-surface)] p-2 shadow-lg space-y-1">
              <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Settings Sections
              </div>
              <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}-btn`}
                      type="button"
                      onClick={() => {
                        if (tab.id === 'developer_center') {
                          onOpenDeveloperCenter?.();
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-left transition shrink-0 md:w-full cursor-pointer ${
                        isActive
                          ? 'bg-zinc-800 text-[var(--text-main)] shadow-sm'
                          : 'text-[var(--text-muted)] hover:bg-zinc-850 hover:text-[var(--text-main)]'
                      }`}
                      style={
                        isActive
                          ? {
                              borderLeft: '3px solid var(--honk-accent)',
                              color: 'var(--honk-accent-text)',
                            }
                          : {}
                      }
                    >
                      <span className={isActive ? 'text-amber-400' : 'text-zinc-400'}>{tab.icon}</span>
                      <div className="min-w-0">
                        <div className="truncate">{tab.label}</div>
                        <div className="hidden lg:block text-[10px] text-zinc-500 font-normal truncate">
                          {tab.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section Content Area */}
          <div className="md:col-span-8 lg:col-span-9">
            <div className="rounded-2xl border border-zinc-800 bg-[var(--bg-surface)] p-5 md:p-7 shadow-xl">
              {/* ------------------------------------------------------------- */}
              {/* 1. ACCOUNT SECTION                                            */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'account' && (
                <div id="settings-section-account" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <User className="h-5 w-5 text-amber-400" />
                      <span>Account & User Profile</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Manage your profile identity, avatar, birthday, and daily quota status
                    </p>
                  </div>

                  {accountSaved && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Profile updated and synchronized successfully!</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Avatar Picker */}
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                        Profile Avatar
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl border-2 border-[var(--honk-accent)] p-1 bg-zinc-900 shadow-md flex items-center justify-center text-3xl">
                          {currentAvatarPreset.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-[var(--text-muted)] mb-2">
                            Select an official avatar character:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_AVATARS.map((av) => (
                              <button
                                key={av.id}
                                type="button"
                                onClick={() => setAvatar(av.id)}
                                className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg border-2 transition cursor-pointer ${
                                  avatar === av.id
                                    ? 'border-[var(--honk-accent)] bg-zinc-800 scale-105 shadow-md'
                                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 opacity-70 hover:opacity-100'
                                }`}
                                title={av.name}
                              >
                                {av.emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1.5">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1.5">
                          Account Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
                        />
                      </div>
                    </div>

                    {/* Birthday Settings */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[var(--text-main)]">Birthday Celebration</div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            Honk will celebrate your birthday with a special personalized banner
                          </div>
                        </div>
                        <span className="text-xl">🎂</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Birth Month</label>
                          <select
                            value={birthMonth}
                            onChange={(e) => setBirthMonth(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-100 outline-none"
                          >
                            <option value="">Select Month</option>
                            {MONTH_NAMES.map((m, idx) => (
                              <option key={idx + 1} value={idx + 1}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Birth Day</label>
                          <select
                            value={birthDay}
                            onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : '')}
                            disabled={!birthMonth}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-100 outline-none disabled:opacity-50"
                          >
                            <option value="">Select Day</option>
                            {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Account Status Card */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-amber-400" />
                          <span>
                            {currentUser.isAuthenticated ? 'Authenticated Account' : 'Guest Sandbox Account'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {currentUser.isAuthenticated
                            ? `Connected as ${currentUser.email || currentUser.name}`
                            : 'Chats are saved in your local browser sandbox'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-amber-400">
                          {usage ? `${usage.remaining} msgs left` : '100 daily limit'}
                        </div>
                        <div className="text-[10px] text-zinc-500">Resets daily at 00:00 UTC</div>
                      </div>
                    </div>

                    {/* Developer Clearance Card */}
                    {currentUser.role === 'DEVELOPER' || currentUser.role === 'ADMIN' ? (
                      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-red-400 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-red-400" />
                            <span>Developer Clearance (Zyron)</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-extrabold uppercase">
                              RBAC Verified
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1">
                            Full access to Improvement Center, Practice Lab, and Production Releases.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onOpenDeveloperCenter}
                          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md transition"
                        >
                          Open Improvement Center
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={onOpenDeveloperAuth}
                          className="text-[11px] text-zinc-500 hover:text-zinc-400 transition underline underline-offset-4 cursor-pointer"
                        >
                          Developer Access Clearance
                        </button>
                      </div>
                    )}

                    <button
                      id="account-save-btn"
                      type="submit"
                      className="rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-4 py-2.5 text-xs transition shadow cursor-pointer"
                    >
                      Save Account Profile
                    </button>
                  </form>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 2. APPEARANCE SECTION                                         */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'appearance' && (
                <div id="settings-section-appearance" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Palette className="h-5 w-5 text-amber-400" />
                      <span>Appearance & Vibe</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Customize your theme, accent colors, wallpaper vibe, and focus mode
                    </p>
                  </div>

                  {/* Theme Mode */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                      Interface Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
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
                        <Moon className="h-5 w-5 text-amber-400" />
                        <span className="text-xs font-bold">Dark</span>
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
                        <Sun className="h-5 w-5 text-amber-500" />
                        <span className="text-xs font-bold">Light</span>
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
                        <Monitor className="h-5 w-5 text-zinc-400" />
                        <span className="text-xs font-bold">System</span>
                      </button>
                    </div>
                  </div>

                  {/* Accent Color Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        Accent Color
                      </label>
                      <span className="text-xs font-mono font-bold" style={{ color: currentAccent }}>
                        {currentAccent}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {PRESET_ACCENT_COLORS.map((clr) => (
                        <button
                          key={clr.hex}
                          type="button"
                          onClick={() => handleAccentSelect(clr.hex)}
                          className={`h-9 w-9 rounded-xl border-2 flex items-center justify-center transition cursor-pointer ${
                            currentAccent.toLowerCase() === clr.hex.toLowerCase()
                              ? 'border-white scale-110 shadow-md'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: clr.hex }}
                          title={clr.name}
                        >
                          {currentAccent.toLowerCase() === clr.hex.toLowerCase() && (
                            <Check className="h-4 w-4" style={{ color: getContrastForeground(clr.hex) }} />
                          )}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleCustomHexSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customHexInput}
                        onChange={(e) => setCustomHexInput(e.target.value)}
                        placeholder="#f59e0b"
                        className="w-32 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-mono text-zinc-100 outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                      >
                        Apply Hex
                      </button>
                    </form>
                  </div>

                  {/* Focus Mode Toggle */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Maximize2 className="h-4 w-4 text-amber-400" />
                        <span>Focus Mode (Zen Minimalist Workspace)</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Hides distracting navigation items and maximizes the conversation space
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={focusMode}
                      onChange={handleToggleFocusMode}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Wallpaper Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        Chat Wallpaper Vibe
                      </label>
                      <button
                        type="button"
                        onClick={() => handleWallpaperChange('default', '')}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Reset to Default
                      </button>
                    </div>

                    <div className="flex gap-2 border-b border-zinc-800 pb-2">
                      {(['preset', 'gradient', 'solid'] as WallpaperType[]).map((tabType) => (
                        <button
                          key={tabType}
                          type="button"
                          onClick={() => setWallpaperSubTab(tabType)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                            wallpaperSubTab === tabType
                              ? 'bg-zinc-800 text-[var(--honk-accent)]'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {tabType}
                        </button>
                      ))}
                    </div>

                    {wallpaperSubTab === 'preset' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {PRESET_WALLPAPERS.map((wp) => (
                          <button
                            key={wp.id}
                            type="button"
                            onClick={() => handleWallpaperChange('preset', wp.id)}
                            className={`group relative h-20 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                              wallpaper.type === 'preset' && wallpaper.value === wp.id
                                ? 'border-[var(--honk-accent)] scale-102 shadow-md'
                                : 'border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            <img
                              src={wp.thumbnail || wp.url}
                              alt={wp.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-end p-2 text-[10px] font-bold text-white">
                              {wp.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {wallpaperSubTab === 'gradient' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {PRESET_GRADIENTS.map((gr) => (
                          <button
                            key={gr.id}
                            type="button"
                            onClick={() => handleWallpaperChange('gradient', gr.gradient)}
                            className={`h-16 rounded-xl border-2 p-2 flex items-end text-[10px] font-bold text-white transition cursor-pointer ${
                              wallpaper.type === 'gradient' && wallpaper.value === gr.gradient
                                ? 'border-[var(--honk-accent)] scale-102 shadow-md'
                                : 'border-zinc-700 hover:border-zinc-500'
                            }`}
                            style={{ background: gr.gradient }}
                          >
                            {gr.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {wallpaperSubTab === 'solid' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {PRESET_SOLIDS.map((sl) => (
                          <button
                            key={sl.id}
                            type="button"
                            onClick={() => handleWallpaperChange('solid', sl.hex)}
                            className={`h-16 rounded-xl border-2 p-2 flex items-end text-[10px] font-bold text-zinc-300 transition cursor-pointer ${
                              wallpaper.type === 'solid' && wallpaper.value === sl.hex
                                ? 'border-[var(--honk-accent)] scale-102 shadow-md'
                                : 'border-zinc-700 hover:border-zinc-500'
                            }`}
                            style={{ backgroundColor: sl.hex }}
                          >
                            {sl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Winter Mode Seasonal Toggle */}
                  <div id="settings-page-winter-mode-panel" className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-zinc-850/60 to-zinc-900/60 p-4 space-y-3.5 shadow-sm">
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
                            id={`settings-page-winter-mode-${opt.id}-btn`}
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
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 3. LANGUAGE SECTION                                           */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'language' && (
                <div id="settings-section-language" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Globe className="h-5 w-5 text-amber-400" />
                      <span>Country & Language Settings</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Configure your country, 22 official regional languages, and bandwidth modes
                    </p>
                  </div>

                  {/* Country Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1.5">
                      Country / Region
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
                    >
                      {COUNTRIES_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Response Language Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1.5">
                      Primary AI Response Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)]"
                    >
                      {availableLanguages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name} ({l.nativeName})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                      Honk AI natively supports Hinglish, Indian code-mixing, and 22 regional languages.
                    </p>
                  </div>

                  {/* Low Data Mode Toggle */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <span>Low-Data Mode (2G Optimized)</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Minimizes payload size and streaming bandwidth for weak or unstable connections
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={lowDataMode}
                      onChange={(e) => setLowDataMode(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Honest AI Disclaimers Toggle */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        <span>Honest AI Uncertainty Labels</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Labels uncertainty clearly and never invents sources or facts
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={honestAiDisclaimers}
                      onChange={(e) => setHonestAiDisclaimers(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 4. MEMORY SECTION                                             */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'memory' && (
                <div id="settings-section-memory" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Brain className="h-5 w-5 text-amber-400" />
                      <span>Memory & AI Persona Context</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Customize the system prompt instructions, temperature, and conversational memory backups
                    </p>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1.5">
                      System Persona & Core Memory Prompt
                    </label>
                    <textarea
                      rows={4}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-100 outline-none focus:border-[var(--honk-accent)] leading-relaxed"
                    />
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      These instructions guide Honk AI across all current and future conversations.
                    </p>
                  </div>

                  {/* Temperature Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] mb-1">
                      <span>Creativity / Temperature</span>
                      <span className="font-mono text-amber-400">{temperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full honk-accent-slider cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                      <span>Exact & Focused (0.1)</span>
                      <span>Balanced (0.7)</span>
                      <span>Creative & Expressive (1.0)</span>
                    </div>
                  </div>

                  {/* Web Search Grounding */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-400" />
                        <span>Live Google Web Search Grounding</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Fetches live internet facts, sports scores, and breaking news
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableWebSearch}
                      onChange={(e) => setEnableWebSearch(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Backup & Data Controls */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="text-xs font-bold text-[var(--text-main)]">Conversational Memory Backups</div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleExportData}
                        className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                      >
                        <Download className="h-3.5 w-3.5 text-amber-400" />
                        <span>Download Memory Backup (JSON)</span>
                      </button>

                      <label className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition cursor-pointer">
                        <Upload className="h-3.5 w-3.5 text-blue-400" />
                        <span>Restore Backup File</span>
                        <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Clear All Data */}
                  <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-red-300">Clear All Chat Histories</div>
                      <div className="text-[11px] text-zinc-400">Irreversibly clears all conversations from local memory</div>
                    </div>
                    {confirmClear ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClearAllConversations();
                            setConfirmClear(false);
                          }}
                          className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
                        >
                          Confirm Wipe
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/40 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 5. VOICE SECTION                                              */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'voice' && (
                <div id="settings-section-voice" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-amber-400" />
                      <span>Voice & Speech Synthesis</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Configure natural neural voice playback, speaking rates, and auto-read features
                    </p>
                  </div>

                  {/* Auto Speak Toggle */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Auto-Read AI Responses</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Automatically speak newly completed assistant replies out loud
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={voiceAutoSpeak}
                      onChange={(e) => setVoiceAutoSpeak(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Voice Speed Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] mb-1">
                      <span>Speaking Speed / Rate</span>
                      <span className="font-mono text-amber-400">{voiceSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.4"
                      step="0.05"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full honk-accent-slider cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                      <span>Slow (0.8x)</span>
                      <span>Natural (1.0x)</span>
                      <span>Fast (1.4x)</span>
                    </div>
                  </div>

                  {/* Voice Engine Mode */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                      Neural TTS Engine
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['auto', 'piper', 'webspeech'] as const).map((eng) => (
                        <button
                          key={eng}
                          type="button"
                          onClick={() => setTtsEngine(eng)}
                          className={`rounded-xl border p-3 text-center transition cursor-pointer ${
                            ttsEngine === eng
                              ? 'border-[var(--honk-accent)] bg-[var(--honk-accent-subtle)] text-[var(--honk-accent-text)] font-bold'
                              : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-850'
                          }`}
                        >
                          <div className="text-xs capitalize">{eng}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {eng === 'auto' ? 'Smart Neural' : eng === 'piper' ? 'Piper TTS' : 'Browser Speech'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Audio Test Button */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Test Audio Voice</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Preview speech synthesis using current voice engine and speed
                      </div>
                    </div>
                    <button
                      id="voice-test-btn"
                      type="button"
                      onClick={handleTestVoice}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 transition shadow cursor-pointer"
                    >
                      {isSpeakingTest ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                      <span>{isSpeakingTest ? 'Stop Sample' : 'Play Sample'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 6. PRIVACY SECTION                                            */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'privacy' && (
                <div id="settings-section-privacy" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Lock className="h-5 w-5 text-amber-400" />
                      <span>Privacy & Shared Chat Management</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Manage active public share links, revoke access, and view client-side storage security
                    </p>
                  </div>

                  {shareActionMessage && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 font-semibold">
                      {shareActionMessage}
                    </div>
                  )}

                  {/* Active Shared Links */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        Active Public Shared Links
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoadingShares(true);
                          fetchUserSharedChats(currentUser?.id)
                            .then((shares) => setUserShares(shares))
                            .finally(() => setIsLoadingShares(false));
                        }}
                        className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingShares ? 'animate-spin' : ''}`} />
                        <span>Refresh Links</span>
                      </button>
                    </div>

                    {userShares.length === 0 ? (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
                        You have not generated any public shared chat links yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userShares.map((s) => (
                          <div
                            key={s.shareId}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-zinc-200 truncate">{s.title}</div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                <span>{s.messageCount} messages</span>
                                <span>•</span>
                                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                                {s.revoked && (
                                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400 font-semibold">
                                    Revoked
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/share/${s.shareId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white transition"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>View</span>
                              </a>
                              {!s.revoked && (
                                <button
                                  type="button"
                                  disabled={revokingShareId === s.shareId}
                                  onClick={() => handleConfirmRevoke(s)}
                                  className="rounded-lg border border-red-800/60 bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/40 transition disabled:opacity-50 cursor-pointer"
                                >
                                  {revokingShareId === s.shareId ? 'Revoking...' : 'Revoke Link'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Privacy Guarantees */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                    <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Zero Tracking & Local Storage Guarantees</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      All your conversations, custom personas, and settings are saved locally within your browser sandbox. Honk AI does not sell or share personal conversation histories with third parties.
                    </p>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 7. NOTIFICATIONS SECTION                                      */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'notifications' && (
                <div id="settings-section-notifications" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Bell className="h-5 w-5 text-amber-400" />
                      <span>Notifications & Limit Alerts</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Configure sound chimes, daily message quota alerts, and system notifications
                    </p>
                  </div>

                  {/* Sound Notifications */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Response Audio Chimes</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Play a subtle notification sound when AI completes message generation
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundNotifications}
                      onChange={(e) => setSoundNotifications(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Quota Alerts */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Daily Limit Warning Alerts</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Show visual badge warnings when approaching the daily 100 message limit
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={quotaAlerts}
                      onChange={(e) => setQuotaAlerts(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* Feature Announcements */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Feature Update Banners</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Receive announcements for newly added Indian languages, models, and tools
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={featureAnnouncements}
                      onChange={(e) => setFeatureAnnouncements(e.target.checked)}
                      className="h-5 w-5 rounded border-zinc-600 honk-accent-slider cursor-pointer"
                    />
                  </div>

                  {/* System Push Notifications */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">Browser Push Notifications</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Status: <span className="font-semibold text-zinc-200 capitalize">{browserNotificationStatus}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestNotificationPermission}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                    >
                      {browserNotificationStatus === 'granted' ? 'Permissions Granted' : 'Enable Push'}
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 8. IMPORTED PROJECTS SECTION                                 */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'imported_apps' && (
                <div id="settings-section-imported-projects" className="space-y-6 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-amber-400" />
                        <span>HONK App Builder & Imported Projects</span>
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        "Build anywhere. Import into Honk. Keep building." Manage all your imported applications.
                      </p>
                    </div>

                    {onOpenImportModal && (
                      <button
                        id="settings-import-new-btn"
                        type="button"
                        onClick={onOpenImportModal}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-md shrink-0 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Import New App</span>
                      </button>
                    )}
                  </div>

                  {storedProjects.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl">
                        📦
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white">No Imported Projects Yet</h3>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                          You haven't imported any apps into Honk yet. Bring existing code from GitHub, ZIP file, public URLs, or AI builders.
                        </p>
                      </div>

                      {onOpenImportModal && (
                        <button
                          type="button"
                          onClick={onOpenImportModal}
                          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition inline-flex items-center gap-2 cursor-pointer shadow-lg"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Import Your First App</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {storedProjects.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 hover:border-zinc-700 transition flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-white tracking-tight">{p.name}</h3>
                                <p className="text-[11px] text-zinc-400">
                                  {p.description || 'Imported Honk Project'}
                                </p>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                {p.analysis.framework}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400 pt-1">
                              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                                Source: <strong className="text-zinc-200 capitalize">{p.sourceType}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                                Target: <strong className="text-zinc-200">{p.targetType === 'native_android' ? 'Android' : 'Web'}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                                Files: <strong className="text-zinc-200">{Object.keys(p.files).length}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                            <span className="text-[10px] text-zinc-500">
                              Imported {new Date(p.createdAt).toLocaleDateString()}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => downloadProjectZip(p)}
                                className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition"
                                title="Download Project ZIP"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteProject(p.id, p.name)}
                                className="p-2 rounded-xl border border-red-900/40 bg-red-950/30 hover:bg-red-900/50 text-red-400 transition"
                                title="Delete Project"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              {onOpenStudio && (
                                <button
                                  type="button"
                                  onClick={() => onOpenStudio(p)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition"
                                >
                                  <Code2 className="h-3.5 w-3.5" />
                                  <span>Open Studio</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 9. LOGOUT & SESSION SECTION                                   */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'logout' && (
                <div id="settings-section-logout" className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                      <LogOut className="h-5 w-5 text-amber-400" />
                      <span>Account Session & Reset Options</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Manage active session credentials, quota testing controls, and sign out
                    </p>
                  </div>

                  {/* Current Session Info */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                    <div className="text-xs font-bold text-[var(--text-main)]">Current Active Session</div>
                    <div className="text-xs text-zinc-300">
                      User: <span className="font-semibold text-zinc-100">{currentUser.name || 'Honk User'}</span> ({currentUser.email || 'Guest User'})
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Account Type: {currentUser.isAuthenticated ? 'Verified Account' : 'Guest Sandbox'}
                    </div>
                  </div>

                  {/* Daily Quota Simulator & Reset */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-400" />
                      <span>Daily Quota Controls (Testing & Reset)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Reset your 100 daily message limit counter or simulate quota exhaustion for testing.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={onResetUsage}
                        className="rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/40 transition cursor-pointer"
                      >
                        Reset Daily Quota to 100
                      </button>
                      <button
                        type="button"
                        onClick={() => onSimulateLimit(100)}
                        className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-900/40 transition cursor-pointer"
                      >
                        Simulate 100/100 Limit
                      </button>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-red-300">Sign Out of Session</div>
                      <div className="text-[11px] text-zinc-400">
                        Ends the current session and returns to clean guest mode
                      </div>
                    </div>
                    <button
                      id="settings-signout-btn"
                      type="button"
                      onClick={() => {
                        onSignOut();
                        onNavigateHome();
                      }}
                      className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white transition shadow cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
