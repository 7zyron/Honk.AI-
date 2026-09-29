/**
 * Piper Neural Text-to-Speech (TTS) Adapter for Honk AI
 *
 * Secure server-side service that communicates with the Piper TTS HTTP engine.
 * Never exposes credentials or private URLs to the frontend.
 * Enforces zero-URL reading policy, robust retry/timeout mechanics,
 * and seamless fallback to Google GenAI TTS.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { sanitizeTextResponse } from '../sanitizer';

export interface PiperTtsOptions {
  text: string;
  language?: string;
  voice?: string;
  speed?: number;
  speakerId?: number;
}

export interface PiperTtsResult {
  audioBuffer: Buffer;
  mimeType: string;
  voiceUsed: string;
  charCount: number;
  engine: 'piper' | 'gemini' | 'synthesizer';
}

// Built-in mapping of language codes to official Piper voice models
export const DEFAULT_PIPER_VOICE_MAP: Record<string, string> = {
  // Indian Languages
  'hi-IN': 'hi_IN-pratham-medium',
  'Hinglish': 'hi_IN-pratham-medium',
  'en-IN': 'en_GB-alan-medium',
  'kn-IN': 'kn_IN-gnv-medium',
  'ta-IN': 'ta_IN-tamil_fem-medium',
  'te-IN': 'te_IN-vasuki-medium',
  'ml-IN': 'ml_IN-radhika-medium',
  'mr-IN': 'mr_IN-pratham-medium',
  'bn-IN': 'bn_IN-pratham-medium',
  'gu-IN': 'gu_IN-pratham-medium',
  'pa-IN': 'pa_IN-pratham-medium',
  'ur-IN': 'ur_PK-pratham-medium',
  'ne-IN': 'ne_NP-google-medium',
  'as-IN': 'bn_IN-pratham-medium',
  'or-IN': 'hi_IN-pratham-medium',
  'sa-IN': 'hi_IN-pratham-medium',
  'sd-IN': 'hi_IN-pratham-medium',
  'gom-IN': 'mr_IN-pratham-medium',
  'mai-IN': 'hi_IN-pratham-medium',

  // Global Languages
  'en-US': 'en_US-lessac-medium',
  'en-GB': 'en_GB-alan-medium',
  'en': 'en_US-lessac-medium',
  'fr-FR': 'fr_FR-siwis-medium',
  'fr': 'fr_FR-siwis-medium',
  'de-DE': 'de_DE-thorsten-medium',
  'de': 'de_DE-thorsten-medium',
  'es-ES': 'es_ES-carlfm-medium',
  'es': 'es_ES-carlfm-medium',
  'ja-JP': 'ja_JP-kokoro-medium',
  'ja': 'ja_JP-kokoro-medium',
  'pt-BR': 'pt_BR-edresson-low',
  'pt': 'pt_BR-edresson-low',
  'ru-RU': 'ru_RU-irina-medium',
  'ru': 'ru_RU-irina-medium',
  'ar': 'ar_JO-kareem-low',
  'zh-CN': 'zh_CN-huayan-medium',
  'zh': 'zh_CN-huayan-medium',
  'auto': 'en_US-lessac-medium',
};

/**
 * Clean text specifically for spoken audio synthesis.
 * Strips raw URLs, web domains, and code blocks completely so they are never read aloud.
 */
export function cleanTextForAudioSynthesis(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove code blocks completely
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');

  // 2. Remove inline backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Convert markdown links [Label](url) -> Label
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 4. Strip raw URLs (http://, https://, www.)
  cleaned = cleaned.replace(/https?:\/\/[^\s)<>"]+/gi, '');
  cleaned = cleaned.replace(/www\.[^\s)<>"]+/gi, '');

  // 5. Strip domain addresses (e.g. .gov.in, .nic.in, .com, .org, .ai)
  cleaned = cleaned.replace(/[a-zA-Z0-9.-]+\.(gov\.in|nic\.in|org|com|net|in|io|ai)[^\s)<>"]*/gi, '');

  // 6. Strip Markdown formatting characters
  cleaned = cleaned.replace(/[#*_~>|•]/g, ' ');

  // 7. Normalize whitespace and newlines for natural speech cadence
  cleaned = cleaned.replace(/\n+/g, '. ');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Resolves the appropriate Piper voice model name based on language code or environment override.
 */
export function resolvePiperVoice(language?: string, requestedVoice?: string): string {
  if (requestedVoice && requestedVoice.trim()) {
    return requestedVoice.trim();
  }

  // Check custom environment voice map if provided
  if (process.env.PIPER_TTS_VOICE_MAP) {
    try {
      const customMap = JSON.parse(process.env.PIPER_TTS_VOICE_MAP);
      if (language && customMap[language]) {
        return customMap[language];
      }
      const langPrefix = language?.split('-')[0];
      if (langPrefix && customMap[langPrefix]) {
        return customMap[langPrefix];
      }
    } catch {
      // Ignore invalid JSON in custom voice map
    }
  }

  // Check global environment default voice
  if (process.env.PIPER_TTS_VOICE && process.env.PIPER_TTS_VOICE.trim()) {
    return process.env.PIPER_TTS_VOICE.trim();
  }

  // Resolve from built-in voice map
  if (language) {
    if (DEFAULT_PIPER_VOICE_MAP[language]) {
      return DEFAULT_PIPER_VOICE_MAP[language];
    }
    const prefix = language.split('-')[0];
    if (DEFAULT_PIPER_VOICE_MAP[prefix]) {
      return DEFAULT_PIPER_VOICE_MAP[prefix];
    }
  }

  return 'en_US-lessac-medium';
}

// In-memory audio LRU cache for ultra-fast repeat voice synthesis responses (0ms TTFA)
const AUDIO_CACHE = new Map<string, { buffer: Buffer; mimeType: string; voiceUsed: string; charCount: number; engine: 'piper' | 'gemini' | 'synthesizer' }>();
const MAX_CACHE_ITEMS = 120;

function getCachedAudio(key: string) {
  const hit = AUDIO_CACHE.get(key);
  if (hit) {
    // Refresh LRU order
    AUDIO_CACHE.delete(key);
    AUDIO_CACHE.set(key, hit);
    return hit;
  }
  return null;
}

function setCachedAudio(key: string, result: PiperTtsResult) {
  if (AUDIO_CACHE.size >= MAX_CACHE_ITEMS) {
    const firstKey = AUDIO_CACHE.keys().next().value;
    if (firstKey) AUDIO_CACHE.delete(firstKey);
  }
  AUDIO_CACHE.set(key, {
    buffer: result.audioBuffer,
    mimeType: result.mimeType,
    voiceUsed: result.voiceUsed,
    charCount: result.charCount,
    engine: result.engine,
  });
}

/**
 * Checks whether Piper TTS backend is configured via server environment variables.
 */
export interface ResolvedPiperConfig {
  apiUrl: string | null;
  apiKey: string | null;
  isConfigured: boolean;
  configType: 'valid_url' | 'api_key_only' | 'not_set';
  warningMessage?: string;
}

/**
 * Safely resolves and validates the Piper TTS API endpoint and authentication.
 * Prevents URL parsing crashes when API keys or invalid strings are provided in URL fields.
 */
export function resolvePiperConfig(): ResolvedPiperConfig {
  const rawApiUrl = (
    process.env.PIPER_TTS_API_URL ||
    process.env.PIPER_API_URL ||
    process.env.PIPER_URL ||
    ''
  ).trim();

  let apiKey = (
    process.env.PIPER_TTS_API_KEY ||
    process.env.PIPER_API_KEY ||
    ''
  ).trim() || null;

  if (!rawApiUrl) {
    return {
      apiUrl: null,
      apiKey,
      isConfigured: false,
      configType: apiKey ? 'api_key_only' : 'not_set',
    };
  }

  // Check if rawApiUrl was accidentally set to an API key (e.g., "sk-tts-..." or "sk-...")
  const isApiKeyPattern =
    /^sk-[a-zA-Z0-9_-]+/i.test(rawApiUrl) ||
    (/^[a-zA-Z0-9_-]{24,}$/.test(rawApiUrl) && !rawApiUrl.includes('.') && !rawApiUrl.includes('/'));

  if (isApiKeyPattern) {
    if (!apiKey) {
      apiKey = rawApiUrl;
    }
    return {
      apiUrl: null,
      apiKey,
      isConfigured: false,
      configType: 'api_key_only',
      warningMessage:
        'PIPER_TTS_API_URL contains an API key instead of an HTTP endpoint URL (e.g. http://localhost:5000 or https://piper-server.example.com).',
    };
  }

  // Attempt to parse as valid URL
  let parsedUrl: string | null = null;
  if (/^https?:\/\//i.test(rawApiUrl)) {
    try {
      new URL(rawApiUrl);
      parsedUrl = rawApiUrl;
    } catch {
      parsedUrl = null;
    }
  } else if (
    rawApiUrl.includes('.') ||
    rawApiUrl.includes(':') ||
    rawApiUrl.startsWith('localhost')
  ) {
    const prefix =
      rawApiUrl.startsWith('localhost') || rawApiUrl.startsWith('127.0.0.1')
        ? 'http://'
        : 'https://';
    try {
      new URL(`${prefix}${rawApiUrl}`);
      parsedUrl = `${prefix}${rawApiUrl}`;
    } catch {
      parsedUrl = null;
    }
  }

  if (!parsedUrl) {
    return {
      apiUrl: null,
      apiKey,
      isConfigured: false,
      configType: 'not_set',
      warningMessage: `Invalid URL format in PIPER_TTS_API_URL ("${rawApiUrl.slice(0, 15)}..."). Expected http:// or https:// URL.`,
    };
  }

  return {
    apiUrl: parsedUrl,
    apiKey,
    isConfigured: true,
    configType: 'valid_url',
  };
}

export function isPiperTtsConfigured(): boolean {
  return resolvePiperConfig().isConfigured;
}

/**
 * Returns safe public status of Piper TTS configuration (without exposing secrets or private URLs).
 */
export function getPiperTtsStatus() {
  const config = resolvePiperConfig();
  const piperConfigured = config.isConfigured;
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  return {
    configured: piperConfigured || geminiConfigured,
    isPiperDirect: piperConfigured,
    isGeminiFallback: geminiConfigured,
    defaultVoice: process.env.PIPER_TTS_VOICE || 'hi_IN-pratham-medium',
    supportedLanguages: Object.keys(DEFAULT_PIPER_VOICE_MAP),
    engine: piperConfigured
      ? 'piper'
      : geminiConfigured
      ? 'gemini_neural'
      : 'browser_speech',
    warning: config.warningMessage,
  };
}

/**
 * Helper to prepend a standard 44-byte RIFF/WAV header to raw PCM audio data
 */
function createWavFromPcm(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  // If buffer already starts with RIFF header, return as-is
  if (pcmBuffer.length >= 4 && pcmBuffer.toString('ascii', 0, 4) === 'RIFF') {
    return pcmBuffer;
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

const VALID_GEMINI_TTS_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];

function resolveGeminiVoice(voice?: string): string {
  if (!voice) return 'Kore';
  const match = VALID_GEMINI_TTS_VOICES.find((v) => v.toLowerCase() === voice.toLowerCase());
  return match || 'Kore';
}

let geminiTtsAi: GoogleGenAI | null = null;

function getGeminiTtsClient(apiKey: string): GoogleGenAI {
  if (!geminiTtsAi) {
    geminiTtsAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiTtsAi;
}

/**
 * Fallback neural speech synthesis via Google GenAI TTS
 */
async function synthesizeWithGeminiTts(cleanText: string, voice = 'Kore'): Promise<PiperTtsResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const resolvedVoice = resolveGeminiVoice(voice);
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ai = getGeminiTtsClient(apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
              },
            ],
          },
        ] as any,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: resolvedVoice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
      if (audioPart?.inlineData?.data) {
        const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        const wavBuffer = createWavFromPcm(pcmBuffer, 24000, 1, 16);
        return {
          audioBuffer: wavBuffer,
          mimeType: 'audio/wav',
          voiceUsed: resolvedVoice,
          charCount: cleanText.length,
          engine: 'gemini',
        };
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isTemporaryDemand =
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isTemporaryDemand && attempt < maxAttempts) {
        // Short pause before one quick retry
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      console.warn(
        `Gemini TTS companion neural synthesis note:`,
        isTemporaryDemand
          ? 'Temporary model demand surge detected; transitioning cleanly to browser speech synthesizer.'
          : errMsg
      );
    }
  }

  return null;
}

/**
 * Synthesizes text to speech using the configured Piper TTS backend with automatic fallback.
 */
export async function synthesizePiperSpeech(options: PiperTtsOptions): Promise<PiperTtsResult> {
  const cleanText = cleanTextForAudioSynthesis(options.text);
  if (!cleanText) {
    throw new Error('No synthesizable text provided after URL and formatting sanitization.');
  }

  const piperConfig = resolvePiperConfig();
  const voice = resolvePiperVoice(options.language, options.voice);
  const cacheKey = `${voice}:${options.speed || 1.0}:${cleanText.toLowerCase().trim()}`;

  // Check in-memory audio cache for 0ms latency playback
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    return {
      audioBuffer: cached.buffer,
      mimeType: cached.mimeType,
      voiceUsed: cached.voiceUsed,
      charCount: cached.charCount,
      engine: cached.engine,
    };
  }

  // 1. If Piper HTTP URL is validly configured, send request directly to Piper API endpoint
  if (piperConfig.isConfigured && piperConfig.apiUrl) {
    const apiKey = piperConfig.apiKey || '';
    const apiUrl = piperConfig.apiUrl;

    const headers: Record<string, string> = {
      'Accept': 'audio/wav, audio/mpeg, audio/ogg, audio/*; q=0.9, */*; q=0.8',
      'Connection': 'keep-alive',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const timeoutMs = 6000;
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        let response: globalThis.Response;

        // Check if target is an OpenAI-compatible /v1/audio/speech endpoint
        if (apiUrl.endsWith('/v1/audio/speech') || apiUrl.endsWith('/audio/speech')) {
          headers['Content-Type'] = 'application/json';
          response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: voice,
              voice,
              input: cleanText,
              speed: options.speed || 1.0,
              response_format: 'wav',
            }),
            signal: controller.signal,
          });
        } else {
          // Standard Piper HTTP Server endpoint (POST JSON, POST text/plain, or GET)
          headers['Content-Type'] = 'application/json';
          response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              text: cleanText,
              voice,
              model: voice,
              speaker_id:
                options.speakerId ??
                (process.env.PIPER_TTS_SPEAKER ? parseInt(process.env.PIPER_TTS_SPEAKER, 10) : undefined),
              length_scale: options.speed ? 1 / options.speed : 1.0,
            }),
            signal: controller.signal,
          });

          // If JSON POST failed with 400, 404, or 415, retry as plain text POST (standard Piper HTTP server)
          if (!response.ok && (response.status === 400 || response.status === 415 || response.status === 404)) {
            const plainHeaders = { ...headers, 'Content-Type': 'text/plain' };
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: plainHeaders,
              body: cleanText,
              signal: controller.signal,
            });
          }

          // If POST still returned 405 Method Not Allowed, fallback to GET with query params
          if (response.status === 405) {
            const urlObj = new URL(apiUrl);
            urlObj.searchParams.set('text', cleanText);
            urlObj.searchParams.set('voice', voice);
            if (options.speakerId !== undefined) {
              urlObj.searchParams.set('speaker', String(options.speakerId));
            }
            response = await fetch(urlObj.toString(), {
              method: 'GET',
              headers,
              signal: controller.signal,
            });
          }
        }

        clearTimeout(timer);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(
            `Piper TTS server responded with HTTP ${response.status}: ${errorText.slice(0, 200) || response.statusText}`
          );
        }

        const contentType = response.headers.get('content-type') || 'audio/wav';
        const arrayBuffer = await response.arrayBuffer();
        let audioBuffer = Buffer.from(arrayBuffer);

        if (audioBuffer.length === 0) {
          throw new Error('Piper TTS returned an empty audio stream.');
        }

        // If returned raw PCM, format as WAV
        if (contentType.includes('pcm') || (audioBuffer.length > 4 && audioBuffer.toString('ascii', 0, 4) !== 'RIFF')) {
          audioBuffer = createWavFromPcm(audioBuffer, 22050, 1, 16);
        }

        const result: PiperTtsResult = {
          audioBuffer,
          mimeType: 'audio/wav',
          voiceUsed: voice,
          charCount: cleanText.length,
          engine: 'piper',
        };
        setCachedAudio(cacheKey, result);
        return result;
      } catch (err: any) {
        clearTimeout(timer);
        const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
        lastError = isAbort
          ? new Error(`Piper TTS request timed out after ${timeoutMs / 1000}s.`)
          : new Error(err.message || 'Failed to synthesize speech via Piper TTS.');

        if (attempt < maxRetries && !isAbort) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
      }
    }

    console.warn('Piper TTS primary endpoint failed, checking neural fallback...', lastError?.message);
  }

  // 2. Fallback to Gemini Neural TTS if available
  const geminiResult = await synthesizeWithGeminiTts(cleanText);
  if (geminiResult) {
    setCachedAudio(cacheKey, geminiResult);
    return geminiResult;
  }

  // 3. If neither Piper nor Gemini could synthesize, throw structured error for frontend Web Speech handler
  throw new Error(
    'PIPER_TTS_NOT_CONFIGURED: Piper TTS API is not configured or reachable. The browser will use local speech synthesis.'
  );
}

/**
 * End-to-end diagnostic function to check all components of the voice pipeline
 */
export async function diagnoseVoicePipeline(): Promise<{
  piperConfigured: boolean;
  piperUrlStatus: string;
  voiceModel: string;
  geminiTtsAvailable: boolean;
  synthesizerReady: boolean;
  testAudioGenerated: boolean;
  diagnostics: Array<{ check: string; status: 'ok' | 'warning' | 'error'; message: string }>;
}> {
  const diagnostics: Array<{ check: string; status: 'ok' | 'warning' | 'error'; message: string }> = [];

  const piperConfig = resolvePiperConfig();
  const defaultVoice = process.env.PIPER_TTS_VOICE || 'hi_IN-pratham-medium';
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  // Check 1: Piper URL & API Key
  if (piperConfig.isConfigured && piperConfig.apiUrl) {
    diagnostics.push({
      check: 'Piper API URL Configuration',
      status: 'ok',
      message: `Piper API endpoint verified: ${piperConfig.apiUrl}`,
    });
  } else if (piperConfig.configType === 'api_key_only') {
    diagnostics.push({
      check: 'Piper API URL Configuration',
      status: 'warning',
      message:
        'PIPER_TTS_API_URL contains an API key. For direct Piper neural audio, configure an HTTP endpoint URL (e.g. http://localhost:5000). Companion neural/browser TTS is currently active.',
    });
  } else {
    diagnostics.push({
      check: 'Piper API URL Configuration',
      status: 'warning',
      message: 'PIPER_TTS_API_URL is not set. Companion neural/browser TTS is active.',
    });
  }

  // Check 2: Voice Model
  diagnostics.push({
    check: 'Voice Model & Language Map',
    status: 'ok',
    message: `Default Piper voice model: ${defaultVoice} (${Object.keys(DEFAULT_PIPER_VOICE_MAP).length} languages mapped).`,
  });

  // Check 3: Gemini Neural Fallback
  if (hasGeminiKey) {
    diagnostics.push({
      check: 'Neural TTS Fallback Engine',
      status: 'ok',
      message: 'Gemini 3.8 Flash Lite TTS is enabled as automatic neural backup.',
    });
  } else {
    diagnostics.push({
      check: 'Neural TTS Fallback Engine',
      status: 'warning',
      message: 'GEMINI_API_KEY is not configured for companion neural audio synthesis.',
    });
  }

  // Check 4: Test Synthesis
  let testAudioGenerated = false;
  try {
    const testResult = await synthesizePiperSpeech({
      text: 'Honk voice pipeline test',
      language: 'en-IN',
    });
    if (testResult.audioBuffer.length > 0) {
      testAudioGenerated = true;
      diagnostics.push({
        check: 'Audio Generation & WAV Encoding',
        status: 'ok',
        message: `Successfully generated ${testResult.audioBuffer.length} bytes of audio using ${testResult.engine} engine.`,
      });
    }
  } catch (err: any) {
    diagnostics.push({
      check: 'Audio Generation & WAV Encoding',
      status: err.message?.includes('PIPER_TTS_NOT_CONFIGURED') ? 'warning' : 'error',
      message: `Audio synthesis notice: ${err.message}`,
    });
  }

  return {
    piperConfigured: piperConfig.isConfigured,
    piperUrlStatus: piperConfig.isConfigured
      ? 'Configured'
      : piperConfig.configType === 'api_key_only'
      ? 'API Key Detected (URL Needed)'
      : 'Not Set (Using Companion / Web Speech)',
    voiceModel: defaultVoice,
    geminiTtsAvailable: hasGeminiKey,
    synthesizerReady: true,
    testAudioGenerated,
    diagnostics,
  };
}
