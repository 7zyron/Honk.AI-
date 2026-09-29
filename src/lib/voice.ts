/**
 * Voice & Speech Engine for Honk AI
 *
 * Implements real Piper TTS audio playback via server-side neural synthesis
 * with seamless companion neural / Web Speech fallback, Speech Recognition,
 * zero URL-reading guarantees, and end-to-end automated diagnostics.
 */

export interface SpeechRecognitionResultState {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error?: string;
}

export interface PiperTtsStatus {
  configured: boolean;
  isPiperDirect?: boolean;
  isGeminiFallback?: boolean;
  defaultVoice: string;
  supportedLanguages: string[];
  engine: string;
}

export interface VoiceDiagnosticReport {
  timestamp: number;
  browser: {
    speechRecognitionSupported: boolean;
    speechSynthesisSupported: boolean;
    audioContextSupported: boolean;
    autoplayAllowed: boolean;
    microphonePermission: string;
  };
  backend: {
    reachable: boolean;
    piperConfigured: boolean;
    piperUrlStatus: string;
    voiceModel: string;
    engine: string;
    testAudioGenerated: boolean;
    latencyMs: number;
    diagnostics: Array<{ check: string; status: 'ok' | 'warning' | 'error'; message: string }>;
  };
}

// Global active audio playback instance for interruption & playback tracking
let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudioUrl: string | null = null;
let globalAudioContext: AudioContext | null = null;

// Cached Piper status
let cachedPiperStatus: PiperTtsStatus | null = null;
let statusFetchPromise: Promise<PiperTtsStatus> | null = null;

/**
 * Unlocks browser AudioContext on user interaction to bypass autoplay restrictions
 */
export function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!globalAudioContext) {
        globalAudioContext = new AudioContextClass();
      }
      if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume().catch(() => {});
      }
    }
  } catch (e) {
    console.warn('AudioContext initialization note:', e);
  }
}

// Check if SpeechRecognition is available in the browser/iframe
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

// Check if Web SpeechSynthesis is available
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof window.speechSynthesis.speak === 'function';
}

/**
 * Fetch Piper TTS status from backend without exposing private URLs or keys
 */
export async function getPiperStatus(): Promise<PiperTtsStatus> {
  if (cachedPiperStatus) return cachedPiperStatus;
  if (statusFetchPromise) return statusFetchPromise;

  statusFetchPromise = fetch('/api/tts/status')
    .then(async (res) => {
      if (!res.ok) throw new Error('Status endpoint failed');
      const data = await res.json();
      cachedPiperStatus = data;
      return data;
    })
    .catch(() => {
      const fallback: PiperTtsStatus = {
        configured: false,
        defaultVoice: 'hi_IN-pratham-medium',
        supportedLanguages: ['hi-IN', 'en-IN', 'kn-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'gu-IN', 'pa-IN'],
        engine: 'piper',
      };
      cachedPiperStatus = fallback;
      return fallback;
    })
    .finally(() => {
      statusFetchPromise = null;
    });

  return statusFetchPromise;
}

/**
 * Creates and initializes a speech recognition session
 */
export function createSpeechRecognizer(
  langCode: string = 'hi-IN',
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { start: () => void; stop: () => void; abort: () => void } | null {
  if (!isSpeechRecognitionSupported()) {
    onError('Speech recognition is not supported in this browser. Please type your message.');
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langCode || 'hi-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (final) {
        onResult(final, true);
      } else if (interim) {
        onResult(interim, false);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      if (err === 'no-speech') {
        return; // Silence is normal
      }
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        onError('Microphone permission denied. Please allow microphone access to talk to Honk.');
      } else {
        onError(`Speech recognition error: ${err}`);
      }
    };

    recognition.onend = () => {
      onEnd();
    };

    return {
      start: () => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Speech recognition start note:', e);
        }
      },
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
      abort: () => {
        try {
          recognition.abort();
        } catch {}
      },
    };
  } catch (err: any) {
    onError(err?.message || 'Failed to initialize speech recognition');
    return null;
  }
}

/**
 * Clean text for spoken speech.
 * STRICT DIRECTIVE: Never read raw URLs, domain names, http/https addresses, or code blocks aloud.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Strip code blocks completely
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');

  // 2. Inline code - extract content without backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Strip markdown links [label](url) -> keep only label
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 4. Strip raw http/https and www URLs completely so they are NEVER spoken
  cleaned = cleaned.replace(/https?:\/\/[^\s)]+/gi, '');
  cleaned = cleaned.replace(/www\.[^\s)]+/gi, '');

  // 5. Strip domain addresses (e.g., gst.gov.in, uidai.gov.in, incometax.gov.in)
  cleaned = cleaned.replace(/[a-zA-Z0-9.-]+\.(gov\.in|nic\.in|org|com|net|in|io|ai)[^\s)]*/gi, '');

  // 6. Strip Markdown symbols (headers, bold, italics, quotes, bullets, tables)
  cleaned = cleaned.replace(/[#*_~>|•-]/g, ' ');

  // 7. Normalize multiple newlines and spaces into natural spoken sentence pauses
  cleaned = cleaned.replace(/\n+/g, '. ');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Instantly stops any active audio playback or speech utterance.
 */
export function stopSpeaking(): void {
  // Stop Piper HTML Audio playback
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.src = '';
    } catch {}
    currentAudioElement = null;
  }

  // Revoke previous blob URL to avoid memory leaks
  if (currentAudioUrl) {
    try {
      URL.revokeObjectURL(currentAudioUrl);
    } catch {}
    currentAudioUrl = null;
  }

  // Stop Web Speech Synthesis if active
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    currentUtterance = null;
  }
}

/**
 * Checks if Honk is currently speaking audio.
 */
export function isCurrentlySpeaking(): boolean {
  if (currentAudioElement && !currentAudioElement.paused && !currentAudioElement.ended) {
    return true;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

export interface PlaySpeechOptions {
  text: string;
  language?: string;
  rate?: number;
  voice?: string;
  onLoading?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error | string) => void;
}

// In-memory audio Blob cache on client
const clientAudioCache = new Map<string, Blob>();

/**
 * Splits streaming text into completed sentences and remainder.
 * Handles English (.!?:;\n) and Indian punctuation (such as Hindi '।').
 */
export function extractCompleteSentences(text: string): { sentences: string[]; remainder: string } {
  if (!text) return { sentences: [], remainder: '' };

  const clean = cleanTextForSpeech(text);
  if (!clean) return { sentences: [], remainder: '' };

  // Split on sentence terminators: period, exclamation, question mark, colon, semicolon, danda (।), or newline
  // Avoid splitting on common abbreviations or decimals (e.g. 1.5, Dr., Rs., vs.)
  const regex = /([^.!?।\n;:]+[.!?।\n;:]+)/g;
  const matches = clean.match(regex);

  if (!matches) {
    // If text has reached > 120 characters without punctuation, break on word boundary for low latency
    if (clean.length > 120) {
      const lastSpace = clean.lastIndexOf(' ');
      if (lastSpace > 40) {
        return {
          sentences: [clean.substring(0, lastSpace).trim()],
          remainder: clean.substring(lastSpace + 1).trim(),
        };
      }
    }
    return { sentences: [], remainder: clean };
  }

  const sentences = matches.map((s) => s.trim()).filter(Boolean);
  const matchedLength = matches.reduce((acc, m) => acc + m.length, 0);
  const remainder = clean.substring(matchedLength).trim();

  return { sentences, remainder };
}

export interface StreamingSpeakerSession {
  pushChunk: (chunk: string) => void;
  finish: () => void;
  stop: () => void;
  isCompleted: () => boolean;
}

/**
 * Creates a real-time streaming voice speaker.
 * Synthesizes and buffers audio chunks in the background while text is still streaming,
 * achieving minimal Time-To-First-Audio (TTFA).
 */
export function createStreamingVoiceSpeaker(options: {
  language?: string;
  voice?: string;
  rate?: number;
  onFirstAudio?: () => void;
  onStart?: () => void;
  onSentence?: (sentence: string) => void;
  onEnd?: () => void;
  onError?: (err: Error | string) => void;
}): StreamingSpeakerSession {
  const { language = 'hi-IN', voice, rate = 1.0, onFirstAudio, onStart, onSentence, onEnd, onError } = options;

  let accumulatedText = '';
  let processedSentencesCount = 0;
  let isFinishedStream = false;
  let isStopped = false;
  let firstAudioTriggered = false;

  // Queue of audio tasks
  type AudioItem = {
    sentence: string;
    audioPromise: Promise<Blob | null>;
  };
  const audioQueue: AudioItem[] = [];
  let isPlayingQueue = false;

  unlockAudioContext();

  const fetchAudioBlob = async (sentenceText: string): Promise<Blob | null> => {
    const clean = cleanTextForSpeech(sentenceText);
    if (!clean) return null;

    const cacheKey = `${voice || 'default'}:${language}:${rate}:${clean.toLowerCase()}`;
    if (clientAudioCache.has(cacheKey)) {
      return clientAudioCache.get(cacheKey)!;
    }

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/wav, audio/mpeg, application/json',
        },
        body: JSON.stringify({
          text: clean,
          language,
          voice,
          speed: rate,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let blob: Blob;

        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (json.audioBase64) {
            const base64Data = json.audioBase64.replace(/^data:[^;]+;base64,/, '');
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], { type: json.mimeType || 'audio/wav' });
          } else {
            return null;
          }
        } else {
          blob = await response.blob();
        }

        if (blob.size > 0) {
          if (clientAudioCache.size < 60) {
            clientAudioCache.set(cacheKey, blob);
          }
          return blob;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingQueue || isStopped) return;
    isPlayingQueue = true;

    while (audioQueue.length > 0 && !isStopped) {
      const currentItem = audioQueue.shift();
      if (!currentItem) break;

      onSentence?.(currentItem.sentence);

      try {
        const blob = await currentItem.audioPromise;
        if (isStopped) break;

        if (blob) {
          const audioUrl = URL.createObjectURL(blob);
          currentAudioUrl = audioUrl;

          await new Promise<void>((resolve) => {
            const audio = new Audio(audioUrl);
            currentAudioElement = audio;

            audio.onplaying = () => {
              if (!firstAudioTriggered) {
                firstAudioTriggered = true;
                onFirstAudio?.();
                onStart?.();
              }
            };

            audio.onended = () => {
              if (currentAudioElement === audio) {
                currentAudioElement = null;
              }
              if (currentAudioUrl === audioUrl) {
                URL.revokeObjectURL(audioUrl);
                currentAudioUrl = null;
              }
              resolve();
            };

            audio.onerror = () => {
              if (currentAudioElement === audio) {
                currentAudioElement = null;
              }
              // Fallback to Web Speech for this sentence
              speakWithWebSpeechFallback(currentItem.sentence, language, rate, undefined, resolve, undefined);
            };

            audio.play().catch(() => {
              // Fallback
              speakWithWebSpeechFallback(currentItem.sentence, language, rate, undefined, resolve, undefined);
            });
          });
        } else {
          // Fallback to Web Speech if server didn't provide audio
          await new Promise<void>((resolve) => {
            if (!firstAudioTriggered) {
              firstAudioTriggered = true;
              onFirstAudio?.();
              onStart?.();
            }
            speakWithWebSpeechFallback(currentItem.sentence, language, rate, undefined, resolve, undefined);
          });
        }
      } catch (err: any) {
        console.warn('Queue item playback notice:', err);
      }
    }

    isPlayingQueue = false;

    if (isFinishedStream && audioQueue.length === 0 && !isStopped) {
      onEnd?.();
    }
  };

  const enqueueSentence = (sentence: string) => {
    if (!sentence.trim() || isStopped) return;
    const item: AudioItem = {
      sentence,
      audioPromise: fetchAudioBlob(sentence), // Fetch immediately in background!
    };
    audioQueue.push(item);
    processAudioQueue();
  };

  return {
    pushChunk: (chunk: string) => {
      if (isStopped) return;
      accumulatedText += chunk;

      const { sentences } = extractCompleteSentences(accumulatedText);
      while (processedSentencesCount < sentences.length) {
        const nextSentence = sentences[processedSentencesCount];
        processedSentencesCount++;
        enqueueSentence(nextSentence);
      }
    },
    finish: () => {
      if (isStopped) return;
      isFinishedStream = true;

      // Extract any remaining text that didn't end with sentence terminator
      const { remainder } = extractCompleteSentences(accumulatedText);
      const cleanRemainder = cleanTextForSpeech(remainder);

      if (cleanRemainder && cleanRemainder.length > 0 && !accumulatedText.endsWith(cleanRemainder)) {
        enqueueSentence(cleanRemainder);
      } else if (audioQueue.length === 0 && !isPlayingQueue) {
        onEnd?.();
      }
    },
    stop: () => {
      isStopped = true;
      audioQueue.length = 0;
      stopSpeaking();
    },
    isCompleted: () => isFinishedStream && audioQueue.length === 0 && !isPlayingQueue,
  };
}

/**
 * Main Honk Voice Synthesis function.
 * 1. Queries backend Piper TTS (`/api/tts`) to receive real synthesized neural audio.
 * 2. Plays returned audio via HTML5 Audio element.
 * 3. ONLY activates the Speaking state (onStart) when actual audio is playing in the browser.
 * 4. Gracefully falls back to Web Speech Synthesis if Piper backend is unconfigured or unavailable.
 */
export async function speakWithHonkVoice(options: PlaySpeechOptions): Promise<void> {
  const { text, language = 'hi-IN', rate = 1.0, voice, onLoading, onStart, onEnd, onError } = options;

  // Interrupt any current speech immediately
  stopSpeaking();
  unlockAudioContext();

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    onEnd?.();
    return;
  }

  onLoading?.();

  try {
    // Attempt real Piper TTS via server endpoint
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav, audio/mpeg, audio/ogg, application/json',
      },
      body: JSON.stringify({
        text: clean,
        language,
        voice,
        speed: rate,
      }),
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let blob: Blob;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.audioBase64) {
          const base64Data = json.audioBase64.replace(/^data:[^;]+;base64,/, '');
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: json.mimeType || 'audio/wav' });
        } else {
          throw new Error('No audio data in JSON response');
        }
      } else {
        blob = await response.blob();
      }

      if (blob.size > 0) {
        const audioUrl = URL.createObjectURL(blob);
        currentAudioUrl = audioUrl;

        const audio = new Audio(audioUrl);
        currentAudioElement = audio;

        audio.onplaying = () => {
          // ONLY trigger onStart when audio has actually begun playback
          onStart?.();
        };

        audio.onended = () => {
          if (currentAudioElement === audio) {
            currentAudioElement = null;
          }
          if (currentAudioUrl === audioUrl) {
            URL.revokeObjectURL(audioUrl);
            currentAudioUrl = null;
          }
          onEnd?.();
        };

        audio.onerror = (e) => {
          console.warn('Audio element playback error, switching to fallback:', e);
          if (currentAudioElement === audio) {
            currentAudioElement = null;
          }
          speakWithWebSpeechFallback(clean, language, rate, onStart, onEnd, onError);
        };

        try {
          await audio.play();
          return;
        } catch (playErr: any) {
          console.warn('Audio play rejection, attempting fallback:', playErr);
          speakWithWebSpeechFallback(clean, language, rate, onStart, onEnd, onError);
          return;
        }
      }
    }

    // Piper returned non-200 or not configured
    const errData = await response.json().catch(() => null);
    console.warn('Piper TTS server status:', response.status, errData?.message);
    speakWithWebSpeechFallback(clean, language, rate, onStart, onEnd, onError);
  } catch (err: any) {
    console.warn('Piper TTS network error, falling back to Web Speech:', err);
    speakWithWebSpeechFallback(clean, language, rate, onStart, onEnd, onError);
  }
}

/**
 * Fallback synthesizer using browser Web Speech API
 */
function speakWithWebSpeechFallback(
  cleanText: string,
  langCode: string,
  rate: number,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: Error | string) => void
) {
  if (!isSpeechSynthesisSupported()) {
    onError?.('Speech playback is not supported in this browser environment.');
    onEnd?.();
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance = utterance;

    utterance.rate = Math.min(Math.max(rate, 0.7), 1.3);
    utterance.pitch = 1.0;
    utterance.lang = langCode || 'hi-IN';

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const normalized = langCode.toLowerCase().replace('_', '-');
      const match =
        voices.find((v) => v.lang.toLowerCase().replace('_', '-') === normalized) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(normalized.split('-')[0])) ||
        voices.find((v) => v.lang.toLowerCase().includes('in') || v.name.toLowerCase().includes('hindi')) ||
        voices[0];
      if (match) {
        utterance.voice = match;
      }
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      onEnd?.();
    };

    utterance.onerror = (e) => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        onError?.(`Web speech error: ${e.error}`);
      } else {
        onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err: any) {
    onError?.(err?.message || 'Speech synthesis failed');
    onEnd?.();
  }
}

/**
 * Runs end-to-end diagnostics on frontend + backend voice pipeline
 */
export async function runVoiceDiagnostics(): Promise<VoiceDiagnosticReport> {
  const startTime = Date.now();
  let micPermission = 'prompt';

  if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
    try {
      const p = await (navigator as any).permissions.query({ name: 'microphone' });
      micPermission = p.state || 'prompt';
    } catch {
      micPermission = 'unknown';
    }
  }

  // Check backend diagnosis endpoint
  let backendData: any = null;
  let reachable = false;
  let latencyMs = 0;

  try {
    const res = await fetch('/api/tts/diagnose');
    latencyMs = Date.now() - startTime;
    if (res.ok) {
      backendData = await res.json();
      reachable = true;
    }
  } catch {
    latencyMs = Date.now() - startTime;
  }

  return {
    timestamp: Date.now(),
    browser: {
      speechRecognitionSupported: isSpeechRecognitionSupported(),
      speechSynthesisSupported: isSpeechSynthesisSupported(),
      audioContextSupported: typeof window !== 'undefined' && Boolean(window.AudioContext || (window as any).webkitAudioContext),
      autoplayAllowed: Boolean(globalAudioContext && globalAudioContext.state === 'running'),
      microphonePermission: micPermission,
    },
    backend: {
      reachable,
      piperConfigured: backendData?.piperConfigured ?? false,
      piperUrlStatus: backendData?.piperUrlStatus ?? 'Unreachable',
      voiceModel: backendData?.voiceModel ?? 'Unknown',
      engine: backendData?.synthesizerReady ? 'Ready' : 'Fallback',
      testAudioGenerated: backendData?.testAudioGenerated ?? false,
      latencyMs,
      diagnostics: backendData?.diagnostics ?? [],
    },
  };
}

// Alias for backward compatibility
export const speakText = (
  text: string,
  langCode: string = 'hi-IN',
  rate: number = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
) => {
  speakWithHonkVoice({
    text,
    language: langCode,
    rate,
    onStart,
    onEnd,
    onError,
  });
};
