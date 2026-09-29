import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  AlertCircle,
  Square,
  Play,
  Send,
  Loader2,
  Globe,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  COUNTRIES_LIST,
  CountryOption,
  LanguageOption,
  INDIA_LANGUAGES,
  AssistantPersona,
} from '../types';
import { AssistantAvatar } from './AssistantAvatar';
import { HonkLogo } from './HonkLogo';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakWithHonkVoice,
  createStreamingVoiceSpeaker,
  StreamingSpeakerSession,
  stopSpeaking,
  isCurrentlySpeaking,
  unlockAudioContext,
  runVoiceDiagnostics,
  VoiceDiagnosticReport,
} from '../lib/voice';

export type VoiceState =
  | 'listening'
  | 'thinking'
  | 'loading'
  | 'speaking'
  | 'error';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  selectedCountry?: string;
  persona?: AssistantPersona;
  onSelectLanguage: (langCode: string) => void;
  onSendVoiceMessage: (
    text: string,
    onChunk?: (chunk: string) => void
  ) => Promise<string | undefined>;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  selectedCountry = 'IN',
  persona,
  onSelectLanguage,
  onSendVoiceMessage,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('listening');
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantSpokenText, setAssistantSpokenText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const assistantName = persona?.name || 'Honk';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Diagnostics panel state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<VoiceDiagnosticReport | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  const recognizerRef = useRef<{ start: () => void; stop: () => void; abort: () => void } | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSpeakerRef = useRef<StreamingSpeakerSession | null>(null);
  const isMountedRef = useRef(true);

  // Find language definition across country catalogs
  const allLanguages: LanguageOption[] = COUNTRIES_LIST.flatMap((c) => c.supportedLanguages);
  const currentLangObj =
    allLanguages.find((l) => l.code === selectedLanguage) ||
    INDIA_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    INDIA_LANGUAGES[0];

  const speechCode = currentLangObj.speechCode || 'hi-IN';

  // Stop any silence debounce timer
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const report = await runVoiceDiagnostics();
      if (isMountedRef.current) {
        setDiagnosticReport(report);
      }
    } catch (e) {
      console.warn('Diagnostics run note:', e);
    } finally {
      if (isMountedRef.current) {
        setIsRunningDiag(false);
      }
    }
  };

  // Start speech recognition for continuous voice chat
  const startListeningSession = () => {
    if (!isMountedRef.current) return;
    setErrorMessage(null);
    clearSilenceTimer();
    stopSpeaking();
    setIsPlayingAudio(false);
    unlockAudioContext();

    if (isMicMuted) {
      setVoiceState('listening');
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceState('error');
      setErrorMessage(
        'Speech recognition is not supported in this browser. You can still type your questions or check microphone settings.'
      );
      return;
    }

    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }

    setVoiceState('listening');

    const recognizer = createSpeechRecognizer(
      speechCode,
      (text, isFinal) => {
        if (!isMountedRef.current) return;
        if (isFinal) {
          setUserTranscript((prev) => (prev ? `${prev} ${text}` : text));
          setInterimTranscript('');

          // Auto-trigger send on natural sentence pause after user finishes speaking
          clearSilenceTimer();
          silenceTimerRef.current = setTimeout(() => {
            handleProcessUserSpeech();
          }, 750);
        } else {
          setInterimTranscript(text);
          clearSilenceTimer();
        }
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.warn('Speech recognition notice:', err);
        if (err.includes('not-allowed') || err.includes('permission')) {
          setVoiceState('error');
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
        }
      },
      () => {
        // Recognition ended naturally - if still in listening mode and not muted, keep listening
        if (isMountedRef.current && voiceState === 'listening' && !isMicMuted && !isPlayingAudio) {
          try {
            recognizerRef.current?.start();
          } catch {}
        }
      }
    );

    if (recognizer) {
      recognizerRef.current = recognizer;
      recognizer.start();
    }
  };

  const stopListeningSession = () => {
    clearSilenceTimer();
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
    }
  };

  // Synthesize and play actual audio
  const playSpokenResponse = async (text: string) => {
    unlockAudioContext();
    setVoiceState('loading');

    await speakWithHonkVoice({
      text,
      language: selectedLanguage,
      voice: currentLangObj.piperVoice,
      rate: 1.0,
      onLoading: () => {
        if (isMountedRef.current) {
          setVoiceState('loading');
        }
      },
      onStart: () => {
        if (isMountedRef.current) {
          setIsPlayingAudio(true);
          setVoiceState('speaking');
        }
      },
      onEnd: () => {
        if (isMountedRef.current) {
          setIsPlayingAudio(false);
          // Auto resume listening session for continuous natural back-and-forth conversation
          setUserTranscript('');
          setInterimTranscript('');
          startListeningSession();
        }
      },
      onError: (err) => {
        console.warn('Voice playback note:', err);
        if (isMountedRef.current) {
          setIsPlayingAudio(false);
          setTimeout(() => {
            if (isMountedRef.current) {
              setUserTranscript('');
              setInterimTranscript('');
              startListeningSession();
            }
          }, 1000);
        }
      },
    });
  };

  // Submit what the user said to Honk AI and speak the response aloud
  const handleProcessUserSpeech = async (overrideText?: string) => {
    const textToSend = (overrideText ?? `${userTranscript} ${interimTranscript}`).trim();
    if (!textToSend) return;

    clearSilenceTimer();
    stopListeningSession();
    unlockAudioContext();
    setVoiceState('thinking');
    setErrorMessage(null);
    setAssistantSpokenText('');

    if (activeSpeakerRef.current) {
      activeSpeakerRef.current.stop();
      activeSpeakerRef.current = null;
    }

    try {
      // 1. Start streaming speaker session immediately
      // Background audio fetch begins as soon as the first sentence terminator (. ! ? \n ।) arrives!
      const speaker = createStreamingVoiceSpeaker({
        language: selectedLanguage,
        voice: currentLangObj.piperVoice,
        rate: 1.0,
        onFirstAudio: () => {
          if (isMountedRef.current) {
            setIsPlayingAudio(true);
            setVoiceState('speaking');
          }
        },
        onStart: () => {
          if (isMountedRef.current) {
            setIsPlayingAudio(true);
            setVoiceState('speaking');
          }
        },
        onEnd: () => {
          if (isMountedRef.current) {
            setIsPlayingAudio(false);
            setUserTranscript('');
            setInterimTranscript('');
            startListeningSession();
          }
        },
        onError: (err) => {
          console.warn('Voice streaming playback note:', err);
          if (isMountedRef.current) {
            setIsPlayingAudio(false);
            setUserTranscript('');
            setInterimTranscript('');
            startListeningSession();
          }
        },
      });
      activeSpeakerRef.current = speaker;

      // 2. Stream tokens from Honk AI and push chunks into the speaker session
      const aiResponse = await onSendVoiceMessage(textToSend, (chunk: string) => {
        if (!isMountedRef.current) return;
        setAssistantSpokenText((prev) => prev + chunk);
        speaker.pushChunk(chunk);
      });

      if (!isMountedRef.current) return;

      if (!aiResponse || !aiResponse.trim()) {
        speaker.stop();
        throw new Error('No response received from Honk AI.');
      }

      speaker.finish();
    } catch (err: any) {
      if (activeSpeakerRef.current) {
        activeSpeakerRef.current.stop();
        activeSpeakerRef.current = null;
      }
      if (isMountedRef.current) {
        setVoiceState('error');
        setErrorMessage(err.message || 'Failed to process voice conversation with Honk AI.');
      }
    }
  };

  // Interrupt / Stop assistant speaking and resume listening
  const handleInterruptSpeaking = () => {
    if (activeSpeakerRef.current) {
      activeSpeakerRef.current.stop();
      activeSpeakerRef.current = null;
    }
    stopSpeaking();
    setIsPlayingAudio(false);
    setUserTranscript('');
    setInterimTranscript('');
    startListeningSession();
  };

  // Replay last spoken response
  const handleReplayLast = () => {
    if (!assistantSpokenText) return;
    playSpokenResponse(assistantSpokenText);
  };

  // Toggle Mute / Unmute
  const handleToggleMute = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      startListeningSession();
    } else {
      setIsMicMuted(true);
      stopListeningSession();
    }
  };

  // Reset & Try Again
  const handleRetry = () => {
    if (activeSpeakerRef.current) {
      activeSpeakerRef.current.stop();
      activeSpeakerRef.current = null;
    }
    stopSpeaking();
    setUserTranscript('');
    setInterimTranscript('');
    setAssistantSpokenText('');
    setErrorMessage(null);
    startListeningSession();
  };

  // Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      unlockAudioContext();
      setUserTranscript('');
      setInterimTranscript('');
      setAssistantSpokenText('');
      setErrorMessage(null);
      setIsMicMuted(false);
      setIsPlayingAudio(false);
      startListeningSession();
      handleRunDiagnostics();
    } else {
      if (activeSpeakerRef.current) {
        activeSpeakerRef.current.stop();
        activeSpeakerRef.current = null;
      }
      stopListeningSession();
      stopSpeaking();
    }

    return () => {
      isMountedRef.current = false;
      if (activeSpeakerRef.current) {
        activeSpeakerRef.current.stop();
        activeSpeakerRef.current = null;
      }
      clearSilenceTimer();
      stopListeningSession();
      stopSpeaking();
    };
  }, [isOpen, selectedLanguage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-zinc-100 flex flex-col items-center text-center overflow-hidden">
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          {voiceState === 'listening' && !isMicMuted && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-amber-500 blur-[80px] animate-pulse" />
          )}
          {voiceState === 'thinking' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500 blur-[80px] animate-pulse" />
          )}
          {voiceState === 'loading' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-500 blur-[80px] animate-pulse" />
          )}
          {voiceState === 'speaking' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-500 blur-[80px] animate-pulse" />
          )}
          {voiceState === 'error' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-rose-500 blur-[80px]" />
          )}
        </div>

        {/* Top Header Bar */}
        <div className="relative z-10 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <HonkLogo size="xs" glow alt="Honk Voice" />
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Honk Voice</span>
            </span>

            {/* Language Selector Pill */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-xs text-zinc-300">
              <Globe className="h-3 w-3 text-amber-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => onSelectLanguage(e.target.value)}
                className="bg-transparent text-amber-400 font-semibold outline-none cursor-pointer text-xs"
              >
                {allLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-zinc-900 text-zinc-100">
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400 transition"
              title="Voice Pipeline Diagnostics"
            >
              <Wrench className="h-4 w-4" />
            </button>
            <button
              id="close-voice-modal-btn"
              onClick={() => {
                stopListeningSession();
                stopSpeaking();
                onClose();
              }}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
              title="Exit voice mode"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Diagnostics Drawer (Collapsible) */}
        {showDiagnostics && (
          <div className="relative z-20 my-3 w-full rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3.5 text-left text-xs text-zinc-300 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                <span>Voice Pipeline Diagnostics</span>
              </span>
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={isRunningDiag}
                className="text-[11px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1 font-medium"
              >
                {isRunningDiag ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                <span>Refresh</span>
              </button>
            </div>

            {diagnosticReport ? (
              <div className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Microphone Permission:</span>
                  <span className="font-mono text-zinc-200">{diagnosticReport.browser.microphonePermission}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Speech Recognition:</span>
                  <span className={diagnosticReport.browser.speechRecognitionSupported ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagnosticReport.browser.speechRecognitionSupported ? 'Supported' : 'Not Supported'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Piper TTS Backend:</span>
                  <span className={diagnosticReport.backend.piperConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                    {diagnosticReport.backend.piperUrlStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Voice Model:</span>
                  <span className="font-mono text-zinc-200">{diagnosticReport.backend.voiceModel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Audio Latency:</span>
                  <span className="font-mono text-zinc-200">{diagnosticReport.backend.latencyMs}ms</span>
                </div>

                {diagnosticReport.backend.diagnostics.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-zinc-800 space-y-1">
                    {diagnosticReport.backend.diagnostics.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        {d.status === 'ok' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                        ) : d.status === 'warning' ? (
                          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span className="text-zinc-300">{d.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 text-center text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                <span>Diagnosing audio pipeline...</span>
              </div>
            )}
          </div>
        )}

        {/* State Visualizer Centerpiece */}
        <div className="relative z-10 my-6 sm:my-8 flex flex-col items-center justify-center">
          {/* Main Visualizer Orb */}
          <div className="relative flex items-center justify-center">
            {/* Listening Ripple */}
            {voiceState === 'listening' && !isMicMuted && (
              <>
                <div className="absolute h-36 w-36 rounded-full bg-amber-500/20 animate-ping" />
                <div className="absolute h-28 w-28 rounded-full bg-amber-500/30 animate-pulse" />
              </>
            )}

            {/* Speaking Ripple (Strictly when audio is playing) */}
            {voiceState === 'speaking' && (
              <>
                <div className="absolute h-36 w-36 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="absolute h-28 w-28 rounded-full bg-emerald-500/30 animate-pulse" />
              </>
            )}

            {/* Thinking / Loading Spinner */}
            {(voiceState === 'thinking' || voiceState === 'loading') && (
              <div className="absolute h-28 w-28 rounded-full border-2 border-dashed border-amber-400/60 animate-spin" />
            )}

            <button
              type="button"
              onClick={() => {
                if (voiceState === 'speaking') {
                  handleInterruptSpeaking();
                } else if (voiceState === 'listening') {
                  handleToggleMute();
                } else if (voiceState === 'error') {
                  handleRetry();
                }
              }}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all duration-200 active:scale-95 ${
                voiceState === 'listening'
                  ? isMicMuted
                    ? 'bg-zinc-800 text-zinc-500'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 scale-105 ring-4 ring-amber-500/20'
                  : voiceState === 'thinking'
                  ? 'bg-zinc-900 border border-amber-500/50 text-amber-400'
                  : voiceState === 'loading'
                  ? 'bg-zinc-900 border border-indigo-500/50 text-indigo-400'
                  : voiceState === 'speaking'
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 scale-105 ring-4 ring-emerald-500/20'
                  : 'bg-rose-950/80 border border-rose-800 text-rose-300'
              }`}
            >
              {voiceState === 'listening' && (
                isMicMuted ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10 animate-bounce" />
              )}
              {voiceState === 'thinking' && <Loader2 className="h-10 w-10 animate-spin" />}
              {voiceState === 'loading' && <Volume2 className="h-10 w-10 animate-pulse" />}
              {voiceState === 'speaking' && <Volume2 className="h-10 w-10 animate-pulse" />}
              {voiceState === 'error' && <AlertCircle className="h-10 w-10 text-rose-400" />}
            </button>
          </div>

          {/* State Label & Subtitle */}
          <div className="mt-5">
            {voiceState === 'listening' && (
              <div>
                <h2 className="text-xl font-bold text-zinc-100">
                  {isMicMuted ? 'Microphone Muted' : 'Listening...'}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {isMicMuted
                    ? 'Tap microphone to unmute'
                    : 'Speak naturally about anything'}
                </p>
              </div>
            )}

            {voiceState === 'thinking' && (
              <div>
                <h2 className="text-xl font-bold text-amber-300">
                  {assistantName} is thinking...
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">Processing your query...</p>
              </div>
            )}

            {voiceState === 'loading' && (
              <div>
                <h2 className="text-xl font-bold text-indigo-300">
                  Generating {assistantName} Voice...
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">Synthesizing neural voice stream...</p>
              </div>
            )}

            {voiceState === 'speaking' && (
              <div>
                <h2 className="text-xl font-bold text-emerald-300">
                  {assistantName} is speaking
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">Playing audio • Tap to stop</p>
              </div>
            )}

            {voiceState === 'error' && (
              <div>
                <h2 className="text-xl font-bold text-rose-300">Voice Notice</h2>
                <p className="mt-0.5 text-xs text-zinc-400">{errorMessage || 'Something went wrong'}</p>
              </div>
            )}
          </div>

          {/* Audio Waveform Bars when listening or speaking */}
          {(voiceState === 'listening' || voiceState === 'speaking') && !isMicMuted && (
            <div className="mt-3 flex items-center justify-center gap-1.5 h-6">
              <span className={`w-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-emerald-400' : 'bg-amber-400'} animate-[pulse_0.6s_ease-in-out_infinite] h-4`} />
              <span className={`w-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-emerald-400' : 'bg-amber-400'} animate-[pulse_0.4s_ease-in-out_infinite] h-7`} />
              <span className={`w-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-emerald-400' : 'bg-amber-400'} animate-[pulse_0.8s_ease-in-out_infinite] h-3`} />
              <span className={`w-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-emerald-400' : 'bg-amber-400'} animate-[pulse_0.5s_ease-in-out_infinite] h-8`} />
              <span className={`w-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-emerald-400' : 'bg-amber-400'} animate-[pulse_0.7s_ease-in-out_infinite] h-5`} />
              <span className={`w-1.5 rounded-full ${voiceState === 'speaking' ? 'bg-emerald-400' : 'bg-amber-400'} animate-[pulse_0.9s_ease-in-out_infinite] h-3`} />
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Area */}
        <div className="relative z-10 w-full min-h-[110px] max-h-[160px] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left text-sm leading-relaxed text-zinc-200">
          {voiceState === 'speaking' || voiceState === 'loading' || assistantSpokenText ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Honk AI:
                </span>
                {assistantSpokenText && voiceState !== 'speaking' && voiceState !== 'loading' && (
                  <button
                    type="button"
                    onClick={handleReplayLast}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Replay Audio</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-100">{assistantSpokenText}</p>
            </div>
          ) : userTranscript || interimTranscript ? (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                You:
              </span>
              <p>
                <span>{userTranscript}</span>{' '}
                <span className="text-amber-400/90 italic">{interimTranscript}</span>
              </p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 italic text-xs">
              Talk freely. Honk AI listens and responds in real-time.
            </div>
          )}
        </div>

        {/* Bottom Voice Controls */}
        <div className="relative z-10 mt-6 flex w-full items-center justify-between gap-3">
          {/* Mute/Unmute */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
              isMicMuted
                ? 'border-rose-800/80 bg-rose-950/40 text-rose-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Action Center: Stop, Try Again, Play, or Send */}
          {voiceState === 'speaking' ? (
            <button
              type="button"
              onClick={handleInterruptSpeaking}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-100 hover:bg-zinc-700 transition"
            >
              <Square className="h-3.5 w-3.5 fill-current text-amber-400" />
              <span>Stop & Reply</span>
            </button>
          ) : voiceState === 'error' ? (
            <button
              type="button"
              onClick={handleRetry}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleProcessUserSpeech()}
              disabled={!userTranscript && !interimTranscript}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-40 disabled:hover:bg-amber-500"
            >
              <span>Send Query</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Close Voice Mode */}
          <button
            type="button"
            onClick={() => {
              stopListeningSession();
              stopSpeaking();
              onClose();
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            Exit Voice
          </button>
        </div>
      </div>
    </div>
  );
};
