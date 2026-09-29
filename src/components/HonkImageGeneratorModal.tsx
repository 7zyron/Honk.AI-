import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Download,
  Copy,
  Check,
  RotateCcw,
  Maximize2,
  ExternalLink,
  Layers,
  Wand2,
  Image as ImageIcon,
  Upload,
  Zap,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { LudoMiniGame } from './LudoMiniGame';

interface HonkImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onSendToChat?: (image: string, prompt: string, model: string) => void;
}

export interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
  createdAt: number;
}

const SAMPLE_PROMPT_PRESETS = [
  {
    title: 'Futuristic Lamborghini',
    prompt: 'A futuristic cybernetic Lamborghini racing through a neon-lit cyberpunk metropolis in heavy rain with realistic reflections and volumetric light',
    category: 'Cyberpunk',
    icon: '🏎️',
  },
  {
    title: 'Ancient Floating Temple',
    prompt: 'Majestic ancient Hindu temple floating amidst golden mystical clouds at sunrise, surrounded by floating lotus islands and waterfalls in hyperrealistic detail',
    category: 'Fantasy',
    icon: '🛕',
  },
  {
    title: 'Astronaut Golden Retriever',
    prompt: 'A cute golden retriever wearing a high-tech NASA astronaut helmet on Mars, exploring red alien terrain with Earth visible in the star-studded background',
    category: '3D Render',
    icon: '🐕',
  },
  {
    title: 'Diwali Cyber Festival',
    prompt: 'Vibrant Indian Diwali celebration in 2077 with glowing holographic diyas, colorful laser rangoli, and fireworks reflecting off sleek modern architecture',
    category: 'Cultural',
    icon: '✨',
  },
  {
    title: 'Majestic Snow Leopard',
    prompt: 'Photorealistic close-up portrait of a wild snow leopard on a rugged Himalayan cliff during a soft snowfall, intense crystalline blue eyes, 8k documentary style',
    category: 'Wildlife',
    icon: '🐆',
  },
  {
    title: 'Cozy Ghibli Coffee Shop',
    prompt: 'Cozy anime illustration of a warm coffee bakery shop on a rainy afternoon, warm glowing lights, steam rising from fresh pastries, Studio Ghibli aesthetic',
    category: 'Anime',
    icon: '☕',
  },
];

export const HonkImageGeneratorModal: React.FC<HonkImageGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  onSendToChat,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [inputImage, setInputImage] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLudoActive, setIsLudoActive] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const [storedResult, setStoredResult] = useState<GeneratedImageRecord | null>(null);
  const [currentImage, setCurrentImage] = useState<GeneratedImageRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number>(0);

  // Session history
  const [history, setHistory] = useState<GeneratedImageRecord[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
    }
  }, [initialPrompt]);

  if (!isOpen) return null;

  // Start generation flow
  const handleGenerate = async (overridePrompt?: string) => {
    const activePrompt = (overridePrompt || prompt).trim();
    if (!activePrompt && !inputImage) {
      setErrorMessage('Please enter a description for your image.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setIsLudoActive(true);
    setIsImageReady(false);
    setStoredResult(null);
    setGenerationStartTime(Date.now());

    // 1. Immediately fire real Google Image API request in background
    const apiCallPromise = (async () => {
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: activePrompt,
            aspectRatio,
            resolution,
            inputImage: inputImage || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate image from Google API');
        }

        const data = await res.json();
        const record: GeneratedImageRecord = {
          id: data.id || `img_${Date.now()}`,
          imageUrl: data.imageUrl,
          prompt: activePrompt,
          aspectRatio: data.aspectRatio || aspectRatio,
          resolution: data.resolution || resolution,
          model: data.model || 'gemini-3.1-flash-lite-image',
          createdAt: Date.now(),
        };

        if (isMountedRef.current) {
          setStoredResult(record);
          setIsImageReady(true);
        }
        return record;
      } catch (err: any) {
        if (isMountedRef.current) {
          setErrorMessage(err.message || 'Image generation encountered an error.');
        }
        throw err;
      }
    })();

    // Note: We do NOT reveal immediately even if apiCallPromise finishes in 4s!
    // The 12-second UX timer in LudoMiniGame controls the authoritative reveal.
  };

  // Called when 12-second Ludo timer finishes (exact 12s milestone)
  const handleLudoTimerComplete = () => {
    setIsLudoActive(false);

    if (storedResult) {
      // Image was ready early! Reveal immediately.
      setCurrentImage(storedResult);
      setHistory((prev) => [storedResult, ...prev.filter((h) => h.id !== storedResult.id)]);
      setIsGenerating(false);
    } else {
      // Image is still generating on Google's backend.
      // Keep lightweight loading state until real promise finishes.
    }
  };

  // When storedResult arrives after 12s (i.e. Ludo has already ended)
  useEffect(() => {
    if (!isLudoActive && storedResult && isGenerating) {
      setCurrentImage(storedResult);
      setHistory((prev) => [storedResult, ...prev.filter((h) => h.id !== storedResult.id)]);
      setIsGenerating(false);
    }
  }, [isLudoActive, storedResult, isGenerating]);

  // When error occurs after 12s
  useEffect(() => {
    if (!isLudoActive && errorMessage && isGenerating) {
      setIsGenerating(false);
    }
  }, [isLudoActive, errorMessage, isGenerating]);

  // Download image helper
  const handleDownload = (img: GeneratedImageRecord) => {
    const link = document.createElement('a');
    link.href = img.imageUrl;
    const cleanName = img.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 40);
    link.download = `honk-ai-${cleanName || 'generated'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Image / Link
  const handleCopy = async (img: GeneratedImageRecord) => {
    try {
      await navigator.clipboard.writeText(img.imageUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  // Image Upload handler
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setInputImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Main Modal Card */}
      <div
        id="honk-image-generator-modal"
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-amber-500/40 bg-zinc-900 text-zinc-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-zinc-950 font-black shadow-md shadow-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-100 flex items-center gap-1.5">
                  <span>HONK IMAGE GENERATOR</span>
                  <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    GOOGLE IMAGE API
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Powered by Google Gemini Image API with interactive 12s mini-game experience.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STATE 1: 12-SECOND 1V1 LUDO WAITING EXPERIENCE */}
          {isGenerating && isLudoActive && (
            <div className="space-y-4">
              <LudoMiniGame
                isImageReady={isImageReady}
                onTimeExpired={handleLudoTimerComplete}
                targetDurationSeconds={12}
                promptText={prompt}
              />
            </div>
          )}

          {/* STATE 2: EXTENDED GENERATING (IF API TAKES > 12s) */}
          {isGenerating && !isLudoActive && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="relative flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 shadow-xl animate-pulse">
                  <RefreshCw className="h-8 w-8 text-amber-400 animate-spin" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-amber-400 animate-ping" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-100">
                  Finalizing Image from Google API...
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  The Google Gemini Image model is rendering final high-resolution details. Displaying real image in moments.
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: IDLE / COMPLETED VIEW */}
          {!isGenerating && (
            <div className="space-y-4">
              {/* PROMPT INPUT SECTION */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Wand2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Describe the image you want to create:</span>
                  </label>
                  {inputImage && (
                    <button
                      type="button"
                      onClick={() => setInputImage(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Remove reference photo
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="e.g. A futuristic cybernetic Lamborghini in a neon metropolis with rain reflections..."
                    rows={3}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* CONTROLS: ASPECT RATIO, RESOLUTION, REFERENCE IMAGE, GENERATE BUTTON */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition cursor-pointer ${
                            aspectRatio === ratio
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Quality Resolution
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['1K', '2K', '4K'] as const).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setResolution(res)}
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition cursor-pointer ${
                            resolution === res
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button & Image Upload */}
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
                        inputImage
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                      title={inputImage ? 'Reference image loaded' : 'Attach reference photo'}
                    >
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">{inputImage ? 'Photo Attached' : 'Ref Photo'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileSelect}
                    />

                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 p-2.5 text-xs sm:text-sm font-black text-zinc-950 shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 fill-zinc-950" />
                      <span>GENERATE</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ERROR BANNER */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <span className="font-bold">⚠️ Error:</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* CURRENTLY GENERATED IMAGE DISPLAY */}
              {currentImage && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        ✓ Real Google Image Generated
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        Model: {currentImage.model}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase">
                        {currentImage.aspectRatio}
                      </span>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        {currentImage.resolution}
                      </span>
                    </div>
                  </div>

                  {/* Main Image View */}
                  <div
                    className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center max-h-[480px] cursor-pointer group"
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img
                      src={currentImage.imageUrl}
                      alt={currentImage.prompt}
                      className="w-full h-auto max-h-[460px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <p className="text-xs text-zinc-200 italic line-clamp-2 max-w-xl">
                        &ldquo;{currentImage.prompt}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxOpen(true);
                        }}
                        className="rounded-lg bg-zinc-800/80 p-1.5 text-zinc-200 hover:bg-zinc-700"
                        title="Expand Full Size"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(currentImage)}
                        className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-100 transition cursor-pointer shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5 text-amber-400" />
                        <span>Download PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(currentImage)}
                        className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition cursor-pointer"
                      >
                        {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                      </button>

                      {onSendToChat && (
                        <button
                          type="button"
                          onClick={() => {
                            onSendToChat(currentImage.imageUrl, currentImage.prompt, currentImage.model);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Insert into Chat</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerate(currentImage.prompt)}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                      <span>Re-roll (12s Ludo)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SAMPLE PROMPT PRESETS */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Or try popular creative prompt presets:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {SAMPLE_PROMPT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(preset.prompt);
                        handleGenerate(preset.prompt);
                      }}
                      className="group flex flex-col text-left p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-amber-500/40 hover:bg-zinc-850 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {preset.category}
                        </span>
                      </div>
                      <span className="mt-1.5 text-xs font-bold text-zinc-200 group-hover:text-amber-300">
                        {preset.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                        {preset.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SESSION GALLERY */}
              {history.length > 1 && (
                <div className="pt-3 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Session History ({history.length})
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setCurrentImage(item)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-square bg-black ${
                          currentImage?.id === item.id ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-zinc-800'
                        }`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.prompt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FULL-SIZE LIGHTBOX */}
      {lightboxOpen && currentImage && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={currentImage.imageUrl}
              alt={currentImage.prompt}
              className="w-full h-full object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 rounded-full bg-zinc-900/80 p-2 text-white hover:bg-zinc-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
