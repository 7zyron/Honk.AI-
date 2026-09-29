// HONK AI Master Platform - Unified Core Types

export enum Capability {
  CHAT = 'CHAT',
  REASONING = 'REASONING',
  VISION = 'VISION',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  APP_BUILDER = 'APP_BUILDER',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  TRANSLATION = 'TRANSLATION',
  CODE = 'CODE',
  PROMPT_ENHANCEMENT = 'PROMPT_ENHANCEMENT',
}

export enum PublicHonkModel {
  HONK = 'HONK',
  HONK_1_5 = 'HONK 1.5',
  HONK_2_0 = 'HONK 2.0',
}

// Scheduled Indian Languages (8th Schedule of Indian Constitution) + English
export const SUPPORTED_INDIAN_LANGUAGES = [
  'Assamese',
  'Bengali',
  'Bodo',
  'Dogri',
  'English',
  'Gujarati',
  'Hindi',
  'Kannada',
  'Kashmiri',
  'Konkani',
  'Maithili',
  'Malayalam',
  'Manipuri',
  'Marathi',
  'Nepali',
  'Odia',
  'Punjabi',
  'Sanskrit',
  'Santali',
  'Sindhi',
  'Tamil',
  'Telugu',
  'Urdu',
] as const;

export type SupportedLanguage = typeof SUPPORTED_INDIAN_LANGUAGES[number] | 'auto' | 'Hinglish';

export interface AttachmentData {
  id?: string;
  name: string;
  type: string;
  size?: number;
  dataUrl: string; // base64 data URI
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
  attachments?: AttachmentData[];
  timestamp?: number;
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  model?: string; // HONK, HONK 1.5, HONK 2.0 or legacy aliases
  systemPrompt?: string;
  temperature?: number;
  stream?: boolean;
  enableWebSearch?: boolean;
  language?: SupportedLanguage | string;
  lowData?: boolean; // 2G / low-bandwidth optimization
  clientStartTime?: number;
}

export interface VisionRequestPayload {
  image: string; // base64 or url
  prompt?: string;
  mode?: 'general' | 'ocr' | 'diagram' | 'screenshot' | 'reasoning';
  model?: string;
}

export interface ImageGenerationPayload {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: '512px' | '1K' | '2K';
  mode?: 'generate' | 'edit';
  inputImage?: string; // base64 data url for image editing
  model?: string;
}

export interface VideoJob {
  id: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  aspectRatio?: string;
  durationSeconds?: number;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
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

export interface DocumentAnalysisPayload {
  document: string; // base64 data URI
  filename: string;
  mimeType: string;
  mode?: 'summary' | 'qa' | 'extract' | 'structured' | 'compare';
  query?: string;
  schema?: Record<string, unknown>;
  model?: string;
}

export interface TranslationPayload {
  text: string;
  sourceLanguage?: SupportedLanguage | string;
  targetLanguage: SupportedLanguage | string;
  preserveCodeAndMarkdown?: boolean;
}

export interface PromptEnhancementPayload {
  prompt: string;
  domain?: 'coding' | 'creative' | 'technical' | 'general' | 'business';
  outputStyle?: 'structured' | 'step-by-step' | 'direct';
}

export interface UsageRecord {
  userId: string;
  capability: Capability;
  timestamp: number;
  latencyMs: number;
  status: 'success' | 'failure';
  model: string;
  tokenCount?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}
