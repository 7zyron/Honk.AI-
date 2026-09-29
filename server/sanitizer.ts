// HONK AI - Response Sanitization, Security & Brand Integrity Engine

/**
 * Sanitizes any text string before returning it to public clients.
 * Strips internal provider keys, raw paths, internal model IDs,
 * prevents XSS/script injection, and preserves HONK AI brand identity and security.
 */
export function sanitizeTextResponse(text: string): string {
  if (!text) return '';

  // Ultra-fast path: if no sensitive triggers or special characters exist, bypass heavy regexes
  if (
    text.length < 50 &&
    !/[<>/\\_:\.\[\]]/.test(text) &&
    !/(AIza|sk-|csk-|gemini|http|www|Bearer|script)/i.test(text)
  ) {
    return text;
  }

  let sanitized = text;

  // 1. Never leak API keys, secret tokens, or authorization headers
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[HONK_CREDENTIAL_PROTECTED]');
  sanitized = sanitized.replace(/csk-[a-zA-Z0-9_-]{20,}/g, '[HONK_CREDENTIAL_PROTECTED]');
  sanitized = sanitized.replace(/sk-or-[a-zA-Z0-9_-]{10,}/g, '[HONK_CREDENTIAL_PROTECTED]');
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[HONK_CREDENTIAL_PROTECTED]');
  sanitized = sanitized.replace(/HONK_KEY_[a-zA-Z0-9]+/g, '[HONK_CREDENTIAL_PROTECTED]');
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_.-]{25,}/gi, 'Bearer [HONK_CREDENTIAL_PROTECTED]');
  sanitized = sanitized.replace(/([A-Z0-9_]+_KEY|[A-Z0-9_]+_SECRET)\s*=\s*['"]?[a-zA-Z0-9_-]{16,}['"]?/gi, '$1=[HONK_CREDENTIAL_PROTECTED]');

  // 2. Strip container file system paths
  sanitized = sanitized.replace(/\/app\/applet\/[a-zA-Z0-9_./-]+/g, '[honk-system-path]');
  sanitized = sanitized.replace(/\/workspace\/[a-zA-Z0-9_./-]+/g, '[honk-system-path]');

  // 3. Prevent raw malicious HTML and script injections outside code blocks
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/javascript:[^\s"'`<>]+/gi, '#');

  // 4. Normalize internal model references to HONK public identity
  sanitized = sanitized.replace(/\bgemini-3\.1-flash-image\b/gi, 'Honk AI Image');
  sanitized = sanitized.replace(/\bgemini-image\b/gi, 'Honk AI Image');
  sanitized = sanitized.replace(/\bgemini-3\.8-flash\b/gi, 'HONK');
  sanitized = sanitized.replace(/\bgemini-3\.1-pro-preview\b/gi, 'HONK 1.5');
  sanitized = sanitized.replace(/\bgemini-3\.1-flash-lite\b/gi, 'HONK Fast Engine');
  sanitized = sanitized.replace(/\bgemini-2\.5-flash\b/gi, 'HONK');
  sanitized = sanitized.replace(/\bgemini-flash-latest\b/gi, 'HONK');

  // 5. Strip raw URLs and markdown links - never show raw URLs to users
  sanitized = sanitized.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  sanitized = sanitized.replace(/https?:\/\/[^\s)<>"]+/gi, '');
  sanitized = sanitized.replace(/www\.[^\s)<>"]+/gi, '');

  // 6. Delete/replace false refusals when controlling devices
  sanitized = sanitized.replace(/I don't have direct control over your device[^.]*\.?/gi, '');
  sanitized = sanitized.replace(/I cannot open applications on your device[^.]*\.?/gi, '');
  sanitized = sanitized.replace(/I can't open applications[^.]*\.?/gi, '');
  sanitized = sanitized.replace(/You can access [A-Za-z0-9\s]+ here[^.]*\.?/gi, '');
  sanitized = sanitized.replace(/Open [A-Za-z0-9\s]+ →/gi, '');
  sanitized = sanitized.replace(/Click this link[^.]*\.?/gi, '');
  sanitized = sanitized.replace(/You can use your device's built-in assistant[^.]*\.?/gi, '');
  sanitized = sanitized.replace(/Open YouTube here[^.]*\.?/gi, '');

  return sanitized;
}

/**
 * Standard truthful answer for inquiries regarding HONK AI architecture.
 * Ref: Rule 17: "I'm HONK AI, powered by the HONK AI platform."
 */
export const HONK_IDENTITY_STATEMENT =
  "I'm HONK AI, powered by the HONK AI platform created by Zyron for chat, reasoning, coding, vision, and creativity.";

/**
 * Check if a prompt is inquiring about internal identity or underlying providers.
 */
export function isAskingAboutModelIdentity(prompt: string): boolean {
  const normalized = prompt.toLowerCase().trim();
  const identityQuestions = [
    'what model are you',
    'which model are you',
    'which ai are you using',
    'what ai are you using',
    'who is your api provider',
    'are you using google',
    'are you using openai',
    'are you using anthropic',
    'what powers honk',
    'what are you powered by',
    'what llm are you',
  ];

  return identityQuestions.some((q) => normalized.includes(q));
}

/**
 * Clean up error objects into user-safe messages without leaking provider stack traces.
 */
export function sanitizeErrorMessage(err: unknown): { code: number; message: string } {
  let message = 'An unexpected error occurred while communicating with HONK AI services.';
  let code = 500;

  if (typeof err === 'string') {
    message = err;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Parse nested JSON errors if present
  let depth = 0;
  while (depth < 5 && (message.startsWith('{') || message.startsWith('['))) {
    depth++;
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) {
        message = parsed.error.message;
        if (parsed.error.code) code = Number(parsed.error.code) || code;
      } else if (parsed?.message) {
        message = parsed.message;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('context window') ||
    lower.includes('token count exceeds') ||
    lower.includes('context length') ||
    lower.includes('maximum context') ||
    lower.includes('too many tokens') ||
    lower.includes('payload too large') ||
    lower.includes('request is too large') ||
    lower.includes('exceeds the maximum allowed token count')
  ) {
    code = 400;
    message = 'This request is larger than the selected model can process at once. Honk can split and process it in smaller sections.';
  } else if (lower.includes('high demand') || lower.includes('spikes in demand') || lower.includes('503')) {
    code = 503;
    message = 'HONK AI engine is currently experiencing high demand. Automatic failover and retry are active; please try again shortly.';
  } else if (lower.includes('rate limit') || lower.includes('429') || lower.includes('resource_exhausted')) {
    code = 429;
    message = 'Rate limit reached. Please wait a moment before sending another request.';
  } else if (lower.includes('not found') || lower.includes('404')) {
    code = 404;
    message = 'The requested HONK capability or resource was not found.';
  } else if (lower.includes('invalid') || lower.includes('bad request') || lower.includes('400')) {
    code = 400;
  }

  return {
    code,
    message: sanitizeTextResponse(message),
  };
}
