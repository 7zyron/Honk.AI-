import { SUPPORTED_INDIAN_LANGUAGES, SupportedLanguage, TranslationPayload } from '../types';
import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

// Script pattern detection for Indian languages
const SCRIPT_RANGES: Array<{ lang: SupportedLanguage; regex: RegExp }> = [
  { lang: 'Hindi', regex: /[\u0900-\u097F]/ }, // Devanagari (Hindi, Marathi, Sanskrit, Nepali, Konkani, Bodo, Dogri, Maithili)
  { lang: 'Bengali', regex: /[\u0980-\u09FF]/ }, // Bengali, Assamese, Manipuri
  { lang: 'Punjabi', regex: /[\u0A00-\u0A7F]/ }, // Gurmukhi
  { lang: 'Gujarati', regex: /[\u0A80-\u0AFF]/ }, // Gujarati
  { lang: 'Odia', regex: /[\u0B00-\u0B7F]/ }, // Odia
  { lang: 'Tamil', regex: /[\u0B80-\u0BFF]/ }, // Tamil
  { lang: 'Telugu', regex: /[\u0C00-\u0C7F]/ }, // Telugu
  { lang: 'Kannada', regex: /[\u0C80-\u0CFF]/ }, // Kannada
  { lang: 'Malayalam', regex: /[\u0D00-\u0D7F]/ }, // Malayalam
  { lang: 'Urdu', regex: /[\u0600-\u06FF]/ }, // Arabic/Persian/Urdu script
];

// Common Hinglish phonetic words
const HINGLISH_MARKERS = [
  'kaise',
  'kare',
  'karna',
  'kyun',
  'kya',
  'bhai',
  'bro',
  'mera',
  'meri',
  'mere',
  'aap',
  'tum',
  'karo',
  'theek',
  'ho',
  'raha',
  'rahi',
  'wala',
  'wali',
  'chahiye',
  'nahi',
  'nhi',
  'matlab',
  'yaar',
  'dost',
  'dekh',
  'batao',
];

/**
 * Automatically detects whether text is in English, an Indian script, or Hinglish/code-switched.
 */
export function detectLanguage(text: string): {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  isCodeSwitched: boolean;
} {
  if (!text || !text.trim()) {
    return { detectedLanguage: 'English', confidence: 1.0, isCodeSwitched: false };
  }

  const clean = text.toLowerCase();

  // 1. Check for native scripts
  for (const item of SCRIPT_RANGES) {
    if (item.regex.test(text)) {
      return {
        detectedLanguage: item.lang,
        confidence: 0.95,
        isCodeSwitched: /[a-zA-Z]/.test(text),
      };
    }
  }

  // 2. Check for Hinglish code-switching in Latin characters
  const words = clean.split(/\s+/);
  const matchedHinglishCount = words.filter((w) => HINGLISH_MARKERS.includes(w)).length;

  if (matchedHinglishCount >= 1) {
    return {
      detectedLanguage: 'Hinglish',
      confidence: 0.85,
      isCodeSwitched: true,
    };
  }

  return {
    detectedLanguage: 'English',
    confidence: 0.9,
    isCodeSwitched: false,
  };
}

/**
 * Executes high-fidelity translation between Indian languages and English.
 */
export async function executeTranslation(payload: TranslationPayload): Promise<{
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  preservedCodeBlocks: number;
}> {
  const providerManager = ProviderManager.getInstance();
  const detection = detectLanguage(payload.text);
  const sourceLang = payload.sourceLanguage && payload.sourceLanguage !== 'auto'
    ? payload.sourceLanguage
    : detection.detectedLanguage;

  const prompt = `You are the HONK AI Master Translation Engine.
Translate the following text accurately from ${sourceLang} to ${payload.targetLanguage}.

Rules:
1. Preserve markdown formatting, bullet points, headers, tables, numbers, and proper names.
2. DO NOT translate programming code blocks, variable names, HTML tags, or JSON keys unless explicitly requested.
3. If source is in colloquial Hinglish or Indian English code-switching, capture the exact natural meaning in ${payload.targetLanguage}.
4. Return ONLY the translated output without meta-explanations.

Text to translate:
"""
${payload.text}
"""`;

  const result = await providerManager.executeWithRetry(async (adapter) => {
    return await adapter.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.2 },
    });
  });

  const codeBlockCount = (payload.text.match(/```/g) || []).length / 2;

  return {
    translatedText: sanitizeTextResponse(result.text.trim()),
    sourceLanguage: sourceLang,
    targetLanguage: payload.targetLanguage,
    preservedCodeBlocks: Math.floor(codeBlockCount),
  };
}
