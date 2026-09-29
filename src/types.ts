export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 data url
}

export interface LanguageOption {
  code: string; // e.g. 'hi-IN', 'en-IN', 'Hinglish', 'kn-IN', 'ta-IN', 'te-IN'
  name: string; // e.g. 'Hindi'
  nativeName: string; // e.g. 'हिन्दी'
  speechCode: string; // BCP-47 code for SpeechSynthesis & SpeechRecognition
  sampleQuery: string; // e.g. 'How do I file GST?'
  piperVoice?: string; // Default Piper voice identifier
}

export interface CountryOption {
  code: string; // ISO 3166-1 alpha-2 code e.g. 'IN', 'US', 'GB', 'other'
  name: string; // e.g. 'India'
  nativeName: string; // e.g. 'भारत'
  flag: string; // Emoji flag e.g. '🇮🇳'
  supportedLanguages: LanguageOption[];
}

export type IndianLanguageOption = LanguageOption;

// Major Indian languages defined per user specification
export const INDIA_LANGUAGES: LanguageOption[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', speechCode: 'en-IN', sampleQuery: 'What are the current UPI transaction limits?', piperVoice: 'en_GB-alan-medium' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', sampleQuery: 'आधार कार्ड में पता कैसे बदलें?', piperVoice: 'hi_IN-pratham-medium' },
  { code: 'Hinglish', name: 'Hinglish', nativeName: 'हिंग्लिश (Hindi + English)', speechCode: 'hi-IN', sampleQuery: 'Bhai ye GST filing kaise hoti hai?', piperVoice: 'hi_IN-pratham-medium' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN', sampleQuery: 'ಬೆಳೆ ವಿಮೆ ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?', piperVoice: 'kn_IN-gnv-medium' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN', sampleQuery: 'பொங்கல் பண்டிகையின் முக்கியத்துவம் என்ன?', piperVoice: 'ta_IN-tamil_fem-medium' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN', sampleQuery: 'రైతు బంధు పథకం వివరాలు ఏమిటి?', piperVoice: 'te_IN-vasuki-medium' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN', sampleQuery: 'ഓണം ആഘോഷത്തിന്റെ ചരിത്രം എന്താണ്?', piperVoice: 'ml_IN-radhika-medium' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN', sampleQuery: 'नवीन रेशन कार्ड कसे काढायचे?', piperVoice: 'mr_IN-pratham-medium' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN', sampleQuery: 'প্যান কার্ডের সঙ্গে আধার লিঙ্ক কীভাবে করব?', piperVoice: 'bn_IN-pratham-medium' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN', sampleQuery: 'આવકવેરા રિટર્ન કેવી રીતે ફાઇલ કરવું?', piperVoice: 'gu_IN-pratham-medium' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN', sampleQuery: 'ਕਣਕ ਦਾ ਐਮ.ਐਸ.ਪੀ. ਰੇਟ ਕੀ ਹੈ?', piperVoice: 'pa_IN-pratham-medium' },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', speechCode: 'ur-IN', sampleQuery: 'یو پی آئی سے رقم کی منتقلی کا طریقہ کیا ہے؟', piperVoice: 'ur_PK-pratham-medium' },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechCode: 'or-IN', sampleQuery: 'କାଳିଆ ଯୋଜନାର ଲାଭ କିପରି ପାଇବେ?', piperVoice: 'hi_IN-pratham-medium' },
  { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া', speechCode: 'as-IN', sampleQuery: 'বিহু উৎসৱৰ পৰম্পৰা কি?', piperVoice: 'bn_IN-pratham-medium' },
  { code: 'ne-IN', name: 'Nepali', nativeName: 'नेपाली', speechCode: 'ne-NP', sampleQuery: 'दशैं र तिहारको सांस्कृतिक महत्व के छ?', piperVoice: 'ne_NP-google-medium' },
  { code: 'gom-IN', name: 'Konkani', nativeName: 'कोंकणी', speechCode: 'mr-IN', sampleQuery: 'गोवाचे शिग्मो उत्सवाची माहिती काय?', piperVoice: 'mr_IN-pratham-medium' },
  { code: 'mai-IN', name: 'Maithili', nativeName: 'मैथिली', speechCode: 'hi-IN', sampleQuery: 'छठ पूजा के विधि-विधान की अछि?', piperVoice: 'hi_IN-pratham-medium' },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'संस्कृतम्', speechCode: 'hi-IN', sampleQuery: 'भगवद्गीतायाः सारं संक्षेपेण वर्णयतु।', piperVoice: 'hi_IN-pratham-medium' },
  { code: 'sd-IN', name: 'Sindhi', nativeName: 'سنڌي / सिन्धी', speechCode: 'hi-IN', sampleQuery: 'ચેટી ચંડ ઉત્સવની ઉજવણી કેવી રીતે થાય?', piperVoice: 'hi_IN-pratham-medium' },
  { code: 'other', name: 'Other Language', nativeName: 'अन्य भाषा', speechCode: 'en-IN', sampleQuery: 'Ask anything naturally in your language', piperVoice: 'en_US-lessac-medium' },
];

export const INDIAN_LANGUAGES = INDIA_LANGUAGES;

export const COUNTRIES_LIST: CountryOption[] = [
  {
    code: 'IN',
    name: 'India',
    nativeName: 'भारत',
    flag: '🇮🇳',
    supportedLanguages: INDIA_LANGUAGES,
  },
  {
    code: 'US',
    name: 'United States',
    nativeName: 'United States',
    flag: '🇺🇸',
    supportedLanguages: [
      { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', speechCode: 'en-US', sampleQuery: 'How can I optimize this React component?', piperVoice: 'en_US-lessac-medium' },
      { code: 'es-US', name: 'Spanish (US)', nativeName: 'Español (EE. UU.)', speechCode: 'es-US', sampleQuery: '¿Cómo puedo escribir una consulta SQL eficiente?', piperVoice: 'es_ES-carlfm-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'en-US', sampleQuery: 'Speak naturally in any language', piperVoice: 'en_US-lessac-medium' },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    flag: '🇬🇧',
    supportedLanguages: [
      { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', speechCode: 'en-GB', sampleQuery: 'Explain quantum computing in simple terms.', piperVoice: 'en_GB-alan-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'en-GB', sampleQuery: 'Speak naturally in any language', piperVoice: 'en_GB-alan-medium' },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    nativeName: 'Canada',
    flag: '🇨🇦',
    supportedLanguages: [
      { code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', speechCode: 'en-CA', sampleQuery: 'Summarize the latest research paper on machine learning.', piperVoice: 'en_US-lessac-medium' },
      { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', speechCode: 'fr-CA', sampleQuery: 'Comment fonctionne l\'apprentissage profond ?', piperVoice: 'fr_FR-siwis-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'en-CA', sampleQuery: 'Speak naturally in any language', piperVoice: 'en_US-lessac-medium' },
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    nativeName: 'Australia',
    flag: '🇦🇺',
    supportedLanguages: [
      { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', speechCode: 'en-AU', sampleQuery: 'Help me debug this TypeScript code.', piperVoice: 'en_GB-alan-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'en-AU', sampleQuery: 'Speak naturally in any language', piperVoice: 'en_GB-alan-medium' },
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    nativeName: 'Singapore',
    flag: '🇸🇬',
    supportedLanguages: [
      { code: 'en-SG', name: 'English (Singapore)', nativeName: 'English (Singapore)', speechCode: 'en-SG', sampleQuery: 'Help me draft a concise business proposal.', piperVoice: 'en_US-lessac-medium' },
      { code: 'zh-SG', name: 'Chinese (Simplified)', nativeName: '简体中文', speechCode: 'zh-CN', sampleQuery: '请帮我写一份简洁的业务方案。', piperVoice: 'zh_CN-huayan-medium' },
      { code: 'ms-SG', name: 'Malay', nativeName: 'Bahasa Melayu', speechCode: 'ms-MY', sampleQuery: 'Bagaimanakah cara untuk merancang projek ini?', piperVoice: 'en_US-lessac-medium' },
      { code: 'ta-SG', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN', sampleQuery: 'வணக்கம், எனக்கு உதவி தேவை.', piperVoice: 'ta_IN-tamil_fem-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'en-SG', sampleQuery: 'Speak naturally in any language', piperVoice: 'en_US-lessac-medium' },
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    nativeName: 'الإمارات',
    flag: '🇦🇪',
    supportedLanguages: [
      { code: 'ar-AE', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-AE', sampleQuery: 'كيف يمكنني تحسين كفاءة الخوارزمية؟', piperVoice: 'ar_JO-kareem-low' },
      { code: 'en-AE', name: 'English', nativeName: 'English', speechCode: 'en-GB', sampleQuery: 'Help me review this architecture diagram.', piperVoice: 'en_GB-alan-medium' },
      { code: 'hi-AE', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', sampleQuery: 'नमस्ते, क्या आप मेरी सहायता कर सकते हैं?', piperVoice: 'hi_IN-pratham-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'en-GB', sampleQuery: 'Speak naturally in any language', piperVoice: 'en_GB-alan-medium' },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    nativeName: 'Deutschland',
    flag: '🇩🇪',
    supportedLanguages: [
      { code: 'de-DE', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', sampleQuery: 'Wie funktioniert eine asynchrone Funktion in JavaScript?', piperVoice: 'de_DE-thorsten-medium' },
      { code: 'en-DE', name: 'English', nativeName: 'English', speechCode: 'en-GB', sampleQuery: 'Explain microservices architecture in detail.', piperVoice: 'en_GB-alan-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'de-DE', sampleQuery: 'Speak naturally in any language', piperVoice: 'de_DE-thorsten-medium' },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    nativeName: 'France',
    flag: '🇫🇷',
    supportedLanguages: [
      { code: 'fr-FR', name: 'French', nativeName: 'Français', speechCode: 'fr-FR', sampleQuery: 'Expliquez-moi le fonctionnement des transformateurs en IA.', piperVoice: 'fr_FR-siwis-medium' },
      { code: 'en-FR', name: 'English', nativeName: 'English', speechCode: 'en-GB', sampleQuery: 'Explain neural networks simply.', piperVoice: 'en_GB-alan-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'fr-FR', sampleQuery: 'Speak naturally in any language', piperVoice: 'fr_FR-siwis-medium' },
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    nativeName: '日本',
    flag: '🇯🇵',
    supportedLanguages: [
      { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', speechCode: 'ja-JP', sampleQuery: '人工知能の基本概念について説明してください。', piperVoice: 'ja_JP-kokoro-medium' },
      { code: 'en-JP', name: 'English', nativeName: 'English', speechCode: 'en-US', sampleQuery: 'Help me design an API.', piperVoice: 'en_US-lessac-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'ja-JP', sampleQuery: 'Speak naturally in any language', piperVoice: 'ja_JP-kokoro-medium' },
    ],
  },
  {
    code: 'NP',
    name: 'Nepal',
    nativeName: 'नेपाल',
    flag: '🇳🇵',
    supportedLanguages: [
      { code: 'ne-NP', name: 'Nepali', nativeName: 'नेपाली', speechCode: 'ne-NP', sampleQuery: 'नमस्ते, मलाई यो विषय बुझाइदिनुहोस्।', piperVoice: 'ne_NP-google-medium' },
      { code: 'en-NP', name: 'English', nativeName: 'English', speechCode: 'en-IN', sampleQuery: 'Explain the principles of clean code.', piperVoice: 'en_GB-alan-medium' },
      { code: 'other', name: 'Other', nativeName: 'Other language', speechCode: 'ne-NP', sampleQuery: 'Speak naturally in any language', piperVoice: 'ne_NP-google-medium' },
    ],
  },
  {
    code: 'OTHER',
    name: 'Other Country / Region',
    nativeName: 'Global',
    flag: '🌍',
    supportedLanguages: [
      { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', speechCode: 'en-US', sampleQuery: 'How can I solve this problem?', piperVoice: 'en_US-lessac-medium' },
      { code: 'es-ES', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES', sampleQuery: '¿Cómo puedo resolver este problema?', piperVoice: 'es_ES-carlfm-medium' },
      { code: 'fr-FR', name: 'French', nativeName: 'Français', speechCode: 'fr-FR', sampleQuery: 'Comment puis-je résoudre ce problème ?', piperVoice: 'fr_FR-siwis-medium' },
      { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', sampleQuery: 'नमस्ते, मेरी मदद करें।', piperVoice: 'hi_IN-pratham-medium' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', sampleQuery: 'مرحبا، كيف يمكنك مساعدتي؟', piperVoice: 'ar_JO-kareem-low' },
      { code: 'zh-CN', name: 'Chinese', nativeName: '中文', speechCode: 'zh-CN', sampleQuery: '你好，请帮我解答这个问题。', piperVoice: 'zh_CN-huayan-medium' },
      { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', speechCode: 'pt-BR', sampleQuery: 'Como posso resolver este problema?', piperVoice: 'pt_BR-edresson-low' },
      { code: 'de-DE', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', sampleQuery: 'Wie kann ich dieses Problem lösen?', piperVoice: 'de_DE-thorsten-medium' },
      { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', sampleQuery: 'Как решить эту задачу?', piperVoice: 'ru_RU-irina-medium' },
      { code: 'other', name: 'Other Language', nativeName: 'Other', speechCode: 'en-US', sampleQuery: 'Speak freely in your native language', piperVoice: 'en_US-lessac-medium' },
    ],
  },
];

export interface GeneratedImageItem {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
}

export interface LatencyTimings {
  t0_sendClicked: number;
  t1_requestCreated: number;
  t2_backendReceived?: number;
  t3_aiRequestStarted?: number;
  t4_firstAiToken?: number;
  t5_firstChunkReceived?: number;
  t6_firstTokenRendered?: number;
  t7_streamCompleted?: number;
  clientRequestPrepMs?: number;
  frontendToBackendMs?: number;
  backendToAiMs?: number;
  aiGenerationMs?: number;
  backendToFrontendMs?: number;
  domRenderMs?: number;
  ttftMs: number;
  firstRenderMs: number;
  totalDurationMs: number;
  tokensPerSec?: number;
  modelUsed?: string;
  bottleneck?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
  model?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
  rating?: 'like' | 'dislike' | null;
  languageDetected?: string;
  isLowData?: boolean;
  generatedImage?: GeneratedImageItem;
  isGeneratingImage?: boolean;
  latencyTimings?: LatencyTimings;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  systemPrompt?: string;
  pinned?: boolean;
  messages: Message[];
}

export interface AIModel {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  geminiModel: string;
  description: string;
  contextWindow: string;
  maxOutputTokens?: string;
  supportedInputTypes?: string[];
  category: 'fast' | 'reasoning' | 'creative' | 'lite';
  thinkingLevel?: 'LOW' | 'HIGH';
}

export interface UserBirthday {
  month: number; // 1 to 12 (Jan - Dec)
  day: number; // 1 to 31
}

export type UserRole = 'USER' | 'DEVELOPER' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isGuest: boolean;
  isAuthenticated?: boolean;
  role?: UserRole;
  developerToken?: string;
  createdAt: number;
  birthday?: UserBirthday | null;
}

export interface DailyUsage {
  limit: number;
  used: number;
  remaining: number;
  resetAt: number;
}

export type WallpaperType = 'default' | 'solid' | 'gradient' | 'preset' | 'custom';

export interface WallpaperConfig {
  type: WallpaperType;
  value: string; // hex color, css gradient, preset image url, or base64 data url
  opacity: number; // 0.1 to 1.0
  blur: number; // 0 to 20 px
  brightness: number; // 30 to 150 %
}

export interface AssistantPersona {
  name: string; // Default: 'Honk'
  avatarType: 'default' | 'preset' | 'custom';
  avatarValue: string; // preset id or base64 data url
}

export type WinterModeOption = 'off' | 'on' | 'auto';

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string; // e.g. '#9333ea', '#2563eb', '#06b6d4', etc.
  winterMode?: WinterModeOption; // Seasonal winter snowfall background effect ('off' | 'on' | 'auto')
  wallpaper?: WallpaperConfig;
  persona?: AssistantPersona;
  focusMode?: boolean;
  selectedModel?: string; // 'honk-flash', 'honk-pro', 'honk-thinking', 'honk-lite'
  systemPrompt: string;
  temperature: number;
  stream: boolean;
  enableWebSearch: boolean;
  lowDataMode: boolean; // 2G & low-bandwidth optimization mode
  selectedCountry?: string; // e.g. 'IN', 'US', 'GB', 'CA', etc.
  selectedLanguage: string; // 'en-IN', 'hi-IN', 'kn-IN', 'Hinglish', etc.
  hasCompletedLanguageOnboarding: boolean; // First-time country + language selection gate
  askedOtherLanguage?: boolean; // Whether user was prompted 'do you need other language?'
  voiceAutoSpeak: boolean; // Read out assistant responses automatically
  voiceSpeed: number; // 0.8 to 1.2
  ttsEngine?: 'piper' | 'webspeech' | 'auto'; // TTS backend provider
  piperVoice?: string; // Custom Piper voice override
  honestAiDisclaimers: boolean; // Show uncertainty & verification warnings
  soundNotifications?: boolean; // Play sound chime on generation complete
  quotaAlerts?: boolean; // Show warning when approaching 100 limit
  featureAnnouncements?: boolean; // Show update announcements
}

export interface SharedChatSummary {
  shareId: string;
  conversationId: string;
  title: string;
  model: string;
  language: string;
  createdAt: number;
  revoked: boolean;
  revokedAt?: number | null;
  messageCount: number;
  shareUrl?: string;
  ownerSecret?: string;
}

export interface PublicSharedChat {
  shareId: string;
  conversationId: string;
  title: string;
  model: string;
  language: string;
  createdAt: number;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      url?: string;
    }>;
  }>;
  isOwner?: boolean;
}

export interface AppBuilderJob {
  id: string;
  prompt: string;
  name: string;
  status: 'specifying' | 'generating' | 'validating' | 'ready' | 'failed';
  specification: {
    title: string;
    description: string;
    features: string[];
    techStack: {
      frontend: string;
      backend: string;
      database: string;
      styling: string;
    };
  };
  files: Record<string, string>; // path -> content
  previewHtml?: string;
  error?: string;
  modelUsed?: {
    id: string;
    name: string;
    provider: string;
  };
  activeOperation?: string;
  activitySteps?: Array<{
    id: string;
    title: string;
    status: 'completed' | 'in_progress' | 'pending' | 'failed';
    timestamp?: number;
    durationMs?: number;
  }>;
  deploymentId?: string;
  deploymentUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DeploymentRecord {
  id: string;
  projectId?: string;
  name: string;
  slug: string;
  description: string;
  url: string;
  status: 'building' | 'testing' | 'fixing' | 'ready' | 'publishing' | 'published' | 'failed';
  modelUsed: {
    name: string;
    provider: string;
    version?: string;
  };
  buildLogs: Array<{
    step: string;
    status: 'pending' | 'running' | 'done' | 'failed' | 'fixed';
    message: string;
    timestamp: number;
    durationMs?: number;
  }>;
  files: Record<string, string>;
  compiledHtml: string;
  buildTimeMs: number;
  createdAt: number;
  updatedAt: number;
  viewCount: number;
  error?: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'honk-flash',
    name: 'Honk Fast',
    tagline: 'Lightning speed & conversational clarity',
    badge: 'Default',
    geminiModel: 'gemini-3.8-flash',
    description: 'Ultra-low latency model optimized for general chat, fast answers, and workflow tasks.',
    contextWindow: '1M tokens (~4M chars)',
    maxOutputTokens: '64k tokens',
    supportedInputTypes: ['Text', 'Code', 'Documents', 'Images', 'Audio', 'Video'],
    category: 'fast',
  },
  {
    id: 'honk-pro',
    name: 'Honk Pro Reasoning',
    tagline: 'Deep reasoning, architecture & coding',
    badge: 'Pro',
    geminiModel: 'gemini-3.1-pro-preview',
    description: 'High-capability reasoning model for complex STEM problems, code synthesis, and deep analysis.',
    contextWindow: '2M tokens (~8M chars)',
    maxOutputTokens: '64k tokens',
    supportedInputTypes: ['Text', 'Code', 'Large Repos', 'PDFs', 'Images', 'Audio', 'Video'],
    category: 'reasoning',
  },
  {
    id: 'honk-thinking',
    name: 'Honk Thinking',
    tagline: 'Explicit deliberate reasoning chain',
    badge: 'Deep',
    geminiModel: 'gemini-3.8-flash',
    description: 'Allocates high thinking budget for intricate logic puzzles, math proofs, and bug diagnostics.',
    contextWindow: '1M tokens (~4M chars)',
    maxOutputTokens: '64k tokens',
    supportedInputTypes: ['Text', 'Code', 'Math Proofs', 'Logic Problems'],
    category: 'reasoning',
    thinkingLevel: 'HIGH',
  },
  {
    id: 'honk-lite',
    name: 'Honk Lite',
    tagline: 'Instant summaries & micro-edits',
    badge: 'Lite',
    geminiModel: 'gemini-3.1-flash-lite',
    description: 'Lightweight resource-friendly engine for quick grammar checks, summaries, and edits.',
    contextWindow: '1M tokens (~4M chars)',
    maxOutputTokens: '64k tokens',
    supportedInputTypes: ['Text', 'Code', 'Documents'],
    category: 'lite',
  },
];

export interface PhotoKheechoResult {
  category:
    | 'homework_math'
    | 'homework_science'
    | 'document_text'
    | 'handwritten_note'
    | 'screenshot_error'
    | 'screenshot_code'
    | 'chart_table'
    | 'receipt_bill'
    | 'diagram_architecture'
    | 'real_world_object'
    | 'plant_animal'
    | 'general_scene'
    | 'other';
  categoryName: string;
  categoryIcon: string;
  confidence: 'high' | 'medium' | 'low';
  clarityWarning: string | null;
  summary: string;
  answer: string;
  explanation: string;
  nextStep: string;
  extractedText?: string;
  suggestedQuestions: string[];
  detectedLanguage: string;
  fullMarkdown: string;
}

export interface PhotoKheechoChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestedQuestions?: string[];
}

export * from './types/search';

