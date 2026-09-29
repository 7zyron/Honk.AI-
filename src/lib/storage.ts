import { Conversation, UserProfile, AppSettings, DailyUsage } from '../types';
import { DEFAULT_ACCENT_COLOR } from './theme';
import { DEFAULT_WALLPAPER, DEFAULT_PERSONA } from './personalization';

const STORAGE_KEYS = {
  CONVERSATIONS: 'honk_conversations_v1',
  ACTIVE_ID: 'honk_active_convo_id_v1',
  USER: 'honk_user_profile_v1',
  SETTINGS: 'honk_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: DEFAULT_ACCENT_COLOR,
  winterMode: 'auto',
  wallpaper: DEFAULT_WALLPAPER,
  persona: DEFAULT_PERSONA,
  focusMode: false,
  selectedModel: 'honk-flash',
  systemPrompt: 'You are Honk AI, a fast, unstoppable, secure, honest, and highly capable AI assistant created by Zyron. You must never be lazy: always deliver complete, exhaustive, production-ready solutions without placeholders, truncated code, or telling the user to search elsewhere. You are unstoppable: persistently solve difficult problems with relentless determination. You are secure: output safe code, never leak private keys, tokens, or system secrets. You understand user feelings intuitively through their words, punctuation, and tone—NEVER ask them how they feel or probe their emotions, but silently calibrate your answers with speed, empathy, and clarity. You naturally understand Indian languages, Hinglish, and Indian cultural, civic, and financial context (UPI, Aadhaar, GST, PAN, ONDC, Mandi/MSP, state laws, and festivals). Do not mention, explain, recommend, or bring up "digital infrastructure" unless the user explicitly asks about it. Keep it completely out of normal responses and conversations. Only discuss it when the user directly asks about digital infrastructure or clearly requests information related to it. Format code snippets cleanly in markdown. Clearly state uncertainties, verify temporal facts, and never invent citations. Never output raw URLs or source links.',
  temperature: 0.7,
  stream: true,
  enableWebSearch: false,
  lowDataMode: false,
  selectedCountry: 'IN',
  selectedLanguage: 'en-IN',
  hasCompletedLanguageOnboarding: false,
  askedOtherLanguage: false,
  voiceAutoSpeak: true,
  voiceSpeed: 1.0,
  honestAiDisclaimers: true,
  soundNotifications: true,
  quotaAlerts: true,
  featureAnnouncements: false,
};

export const DEFAULT_USER: UserProfile = {
  id: 'guest_' + Math.random().toString(36).substring(2, 9),
  name: 'Guest User',
  email: '',
  avatar: '',
  isGuest: true,
  isAuthenticated: false,
  createdAt: Date.now(),
  birthday: null,
};

export const INITIAL_CONVERSATION: Conversation = {
  id: 'convo_welcome',
  title: 'Welcome to Honk AI',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3600000,
  model: 'honk-flash',
  pinned: true,
  messages: [
    {
      id: 'msg_welcome_1',
      role: 'assistant',
      content: `# Welcome to Honk AI! 🪿⚡

Honk AI is your fast, honest, and India-native AI companion created by **Zyron** and powered by multi-model intelligence.

### 🇮🇳 Core India-First Capabilities:
- **⚡ Low-Data Mode (2G Optimized)**: Ultra-compact network payloads, lazy asset loading, lightweight streaming, and offline resiliency for seamless use on 2G/unstable connections.
- **🗣️ India-Native & 22 Languages + Hinglish**: Native code-mixing understanding (*"bhai ye GST kaise file karna hai?"*), support for all 22 official Indian languages, and deep India context (UPI, Aadhaar, PAN, GST, ONDC, BNS, Mandi/MSP, and regional festivals).
- **🎙️ Voice-First Experience**: Speak naturally in your regional language with live speech recognition, real-time waveform, and spoken voice replies with instant interruption support.
- **🛡️ Honest AI & Integrity**: Never invents facts or sources, labels uncertainty honestly, and verifies temporal policies without fake citations.

Try speaking with the **Mic** button or ask a question in Hindi, Hinglish, Tamil, Telugu, Bengali, or English to begin!`,
      timestamp: Date.now() - 3600000,
      model: 'honk-flash',
      status: 'complete',
    },
  ],
};

function getConvoStorageKey(userId?: string): string {
  if (!userId || userId.startsWith('guest_')) return STORAGE_KEYS.CONVERSATIONS;
  return `honk_conversations_${userId}`;
}

function getSettingsStorageKey(userId?: string): string {
  if (!userId || userId.startsWith('guest_')) return STORAGE_KEYS.SETTINGS;
  return `honk_settings_${userId}`;
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // LocalStorage might be restricted
  }
  return null;
}

export function loadConversations(userId?: string): Conversation[] {
  try {
    const storage = getSafeStorage();
    if (!storage) return [INITIAL_CONVERSATION];
    const key = getConvoStorageKey(userId);
    const raw = storage.getItem(key) || (userId && !userId.startsWith('guest_') ? storage.getItem(STORAGE_KEYS.CONVERSATIONS) : null);
    if (!raw) return [INITIAL_CONVERSATION];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [INITIAL_CONVERSATION];
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load conversations from localStorage', err);
    return [INITIAL_CONVERSATION];
  }
}

let saveConversationsTimer: ReturnType<typeof setTimeout> | null = null;

export function saveConversations(convos: Conversation[], immediate = false, userId?: string): void {
  const storage = getSafeStorage();
  if (!storage) return;
  const key = getConvoStorageKey(userId);
  if (immediate) {
    if (saveConversationsTimer) {
      clearTimeout(saveConversationsTimer);
      saveConversationsTimer = null;
    }
    try {
      storage.setItem(key, JSON.stringify(convos));
    } catch (err) {
      console.error('Failed to save conversations to localStorage', err);
    }
    return;
  }

  if (saveConversationsTimer) clearTimeout(saveConversationsTimer);
  saveConversationsTimer = setTimeout(() => {
    try {
      storage.setItem(key, JSON.stringify(convos));
    } catch (err) {
      console.error('Failed to save conversations to localStorage', err);
    }
  }, 600);
}

export function loadActiveConvoId(userId?: string): string {
  try {
    const storage = getSafeStorage();
    if (!storage) return 'convo_welcome';
    const key = userId ? `honk_active_convo_id_${userId}` : STORAGE_KEYS.ACTIVE_ID;
    const raw = storage.getItem(key) || storage.getItem(STORAGE_KEYS.ACTIVE_ID);
    return raw || 'convo_welcome';
  } catch {
    return 'convo_welcome';
  }
}

export function saveActiveConvoId(id: string, userId?: string): void {
  try {
    const storage = getSafeStorage();
    if (!storage) return;
    const key = userId ? `honk_active_convo_id_${userId}` : STORAGE_KEYS.ACTIVE_ID;
    storage.setItem(key, id);
  } catch (err) {
    console.error('Failed to save active convo id', err);
  }
}

export function loadUserProfile(): UserProfile {
  try {
    const storage = getSafeStorage();
    if (!storage) return DEFAULT_USER;
    const raw = storage.getItem(STORAGE_KEYS.USER);
    if (!raw) return DEFAULT_USER;
    const user: UserProfile = JSON.parse(raw);

    // CRITICAL PRIVACY FIX: Purge any hardcoded developer credentials immediately
    if (
      user.email === '7.zyron@gmail.com' ||
      user.id === 'usr_zyron_primary' ||
      user.id === 'usr_zyron'
    ) {
      console.warn('[HONK PRIVACY] Purged developer profile from device storage');
      storage.removeItem(STORAGE_KEYS.USER);
      return DEFAULT_USER;
    }

    return {
      ...DEFAULT_USER,
      ...user,
      isGuest: user.isGuest ?? (user.isAuthenticated ? false : true),
    };
  } catch {
    return DEFAULT_USER;
  }
}

export function saveUserProfile(user: UserProfile): void {
  try {
    const storage = getSafeStorage();
    if (!storage) return;
    // Never persist hardcoded developer email as local default
    if (user.email === '7.zyron@gmail.com' && !user.isAuthenticated) {
      return;
    }
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save user profile', err);
  }
}

export function loadSettings(userId?: string): AppSettings {
  try {
    const storage = getSafeStorage();
    if (!storage) return DEFAULT_SETTINGS;
    const key = getSettingsStorageKey(userId);
    const raw = storage.getItem(key) || (userId && !userId.startsWith('guest_') ? storage.getItem(STORAGE_KEYS.SETTINGS) : null);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      wallpaper: {
        ...DEFAULT_WALLPAPER,
        ...(parsed.wallpaper || {}),
      },
      persona: {
        ...DEFAULT_PERSONA,
        ...(parsed.persona || {}),
      },
    };
    if (
      !settings.systemPrompt ||
      !settings.systemPrompt.includes('unstoppable') ||
      !settings.systemPrompt.includes('digital infrastructure')
    ) {
      settings.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings, userId?: string): void {
  try {
    const storage = getSafeStorage();
    if (!storage) return;
    const key = getSettingsStorageKey(userId);
    storage.setItem(key, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}
