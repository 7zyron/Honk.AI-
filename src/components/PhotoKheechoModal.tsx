import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Send,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  FileText,
  HelpCircle,
  FlipHorizontal,
  ArrowLeft,
  ExternalLink,
  Volume2,
  Globe,
} from 'lucide-react';
import { PhotoKheechoResult, PhotoKheechoChatMessage } from '../types';
import {
  compressImageForVision,
  analyzePhoto,
  followUpPhoto,
  PHOTO_SAMPLE_PRESETS,
  PhotoSamplePreset,
} from '../lib/photoKheecho';
import { MarkdownRenderer } from './MarkdownRenderer';
import { speakWithHonkVoice } from '../lib/voice';

interface PhotoKheechoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToMainChat?: (image: string, analysisMarkdown: string, category: string) => void;
}

export const PhotoKheechoModal: React.FC<PhotoKheechoModalProps> = ({
  isOpen,
  onClose,
  onSendToMainChat,
}) => {
  // Mode: 'pick' (selection/camera) | 'analyzing' | 'result'
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [imageSizeInfo, setImageSizeInfo] = useState<{ orig: number; comp: number } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Inspecting image...');
  const [analysisResult, setAnalysisResult] = useState<PhotoKheechoResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Language preference
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');

  // Follow-up Chat State
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpMessages, setFollowUpMessages] = useState<PhotoKheechoChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  // Copy Feedback
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [copiedOcr, setCopiedOcr] = useState(false);

  // Active Tab in result view: 'overview' | 'explanation' | 'ocr'
  const [activeTab, setActiveTab] = useState<'overview' | 'explanation' | 'ocr'>('overview');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Clean up camera stream
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
    }
  }, [isOpen, stopCameraStream]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Scroll to bottom of follow-up chat
  useEffect(() => {
    if (showFollowUp && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [followUpMessages, showFollowUp]);

  // Handle Clipboard Paste (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen || isAnalyzing) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processAndAnalyzeImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isAnalyzing]);

  // Start Camera
  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    stopCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        'Camera access not available. Please allow camera permissions or upload an image file instead.'
      );
      setIsCameraActive(false);
    }
  };

  // Toggle Camera Facing
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Take Snapshot from Camera
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    stopCameraStream();
    await processAndAnalyzeImage(dataUrl);
  };

  // Process & Analyze Image
  const processAndAnalyzeImage = async (
    input: File | Blob | string,
    optionalPrompt?: string
  ) => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalysisStep('Compressing & optimizing image...');

    try {
      // 1. Client-side compression
      const { dataUrl, originalSize, compressedSize } = await compressImageForVision(input, 1600, 0.85);
      setCurrentImage(dataUrl);
      setImageSizeInfo({ orig: originalSize, comp: compressedSize });

      // Progressive status steps
      setAnalysisStep('Scanning visual elements & text...');
      const stepTimer1 = setTimeout(() => {
        setAnalysisStep('Detecting problem, category & notation...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setAnalysisStep('Generating solution & actionable steps...');
      }, 2600);

      // 2. Call backend
      const result = await analyzePhoto({
        image: dataUrl,
        question: optionalPrompt,
        language: selectedLanguage,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setAnalysisResult(result);
      setIsAnalyzing(false);

      // Initialize follow-up history
      setFollowUpMessages([
        {
          id: 'initial-solution',
          role: 'assistant',
          content: `${result.summary}\n\n**${result.categoryName}**\n\n${result.answer}\n\n*${result.explanation}*`,
          timestamp: Date.now(),
          suggestedQuestions: result.suggestedQuestions,
        },
      ]);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setIsAnalyzing(false);
      setErrorMessage(
        err.message || 'Failed to inspect image. Please verify network or try another photo.'
      );
    }
  };

  // Select File from Picker
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndAnalyzeImage(file);
    }
  };

  // Select Sample Preset
  const handleSelectPreset = (preset: PhotoSamplePreset) => {
    stopCameraStream();
    processAndAnalyzeImage(preset.imageUrl);
  };

  // Reset / Clear
  const handleClear = () => {
    stopCameraStream();
    setCurrentImage(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setIsAnalyzing(false);
    setShowFollowUp(false);
    setFollowUpMessages([]);
    setFollowUpInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Copy Full Result
  const handleCopyResult = () => {
    if (!analysisResult) return;
    const textToCopy = `[HONK: Photo Kheecho Result - ${analysisResult.categoryName}]\n\n${analysisResult.summary}\n\n=== ANSWER ===\n${analysisResult.answer}\n\n=== EXPLANATION ===\n${analysisResult.explanation}\n\n=== NEXT STEP ===\n${analysisResult.nextStep}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  // Copy OCR Text
  const handleCopyOcr = () => {
    if (!analysisResult?.extractedText) return;
    navigator.clipboard.writeText(analysisResult.extractedText);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
  };

  // Send Follow-Up Message
  const handleSendFollowUp = async (textToSend?: string) => {
    const prompt = (textToSend || followUpInput).trim();
    if (!prompt || !currentImage || isFollowUpLoading) return;

    const userMsg: PhotoKheechoChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setFollowUpMessages((prev) => [...prev, userMsg]);
    setFollowUpInput('');
    setIsFollowUpLoading(true);

    try {
      // Build conversation history for context
      const history = followUpMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await followUpPhoto({
        image: currentImage,
        question: prompt,
        language: selectedLanguage,
        history,
      });

      const assistantMsg: PhotoKheechoChatMessage = {
        id: 'ast-' + Date.now(),
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        suggestedQuestions: res.suggestedQuestions,
      };

      setFollowUpMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: PhotoKheechoChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `⚠️ Sorry, couldn't process that follow-up: ${err.message || 'Please try again.'}`,
        timestamp: Date.now(),
      };
      setFollowUpMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  // Speak Answer aloud with Honk voice
  const handleSpeakAnswer = () => {
    if (!analysisResult) return;
    const spokenText = `${analysisResult.summary}. ${analysisResult.answer.slice(0, 300)}`;
    speakWithHonkVoice({
      text: spokenText,
      language:
        selectedLanguage === 'Hindi'
          ? 'hi-IN'
          : selectedLanguage === 'Kannada'
          ? 'kn-IN'
          : 'en-IN',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div
        id="photo-kheecho-modal-card"
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-700/80 bg-zinc-900 text-zinc-100 shadow-2xl overflow-hidden"
      >
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-zinc-950 font-black shadow-md shadow-amber-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-100 flex items-center gap-1.5">
                  <span>PHOTO KHEECHO, KAAM KHATAM</span>
                  <span className="hidden sm:inline-block rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    📸 MULTIMODAL AI
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                “Take a photo. Honk understands. Work done.”
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2 py-1 text-xs text-zinc-300">
              <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer pr-1"
                title="Response Language"
              >
                <option value="auto" className="bg-zinc-900 text-zinc-200">Auto / English</option>
                <option value="Hindi" className="bg-zinc-900 text-zinc-200">Hindi (हिन्दी)</option>
                <option value="Kannada" className="bg-zinc-900 text-zinc-200">Kannada (ಕನ್ನಡ)</option>
                <option value="Hinglish" className="bg-zinc-900 text-zinc-200">Hinglish</option>
              </select>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. INITIAL STATE: NO IMAGE YET */}
          {!currentImage && !isAnalyzing && (
            <div className="space-y-6">
              {/* Tagline Banner */}
              <div className="text-center py-3">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Snap it. Understand it. Done.
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto mt-1">
                  Don't tell Honk what it is. Just show Honk the photo — math problems, error messages, receipts, documents, charts, or everyday objects.
                </p>
              </div>

              {/* CAMERA ACTIVE VIEWFINDER */}
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-black aspect-video sm:max-h-[380px] mx-auto shadow-2xl flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Camera Targeting Crosshairs */}
                  <div className="absolute inset-8 border border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-t-2 border-l-2 border-amber-400" />
                      <div className="w-5 h-5 border-t-2 border-r-2 border-amber-400" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-b-2 border-l-2 border-amber-400" />
                      <div className="w-5 h-5 border-b-2 border-r-2 border-amber-400" />
                    </div>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-10 px-4">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="rounded-full bg-zinc-900/80 p-3 text-white backdrop-blur-md border border-white/20 hover:bg-zinc-800 transition cursor-pointer"
                      title="Flip camera"
                    >
                      <FlipHorizontal className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 text-sm font-black text-zinc-950 shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
                    >
                      <Camera className="h-5 w-5" />
                      <span>CLICK PHOTO</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="rounded-full bg-zinc-900/80 p-3 text-white backdrop-blur-md border border-white/20 hover:bg-zinc-800 transition cursor-pointer"
                      title="Cancel Camera"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* TWO PRIMARY ACTIONS: TAKE PHOTO & UPLOAD PHOTO */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Action 1: TAKE PHOTO */}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-zinc-900/60 to-zinc-950 p-6 sm:p-8 text-center transition hover:border-amber-400 hover:bg-amber-500/15 cursor-pointer shadow-lg active:scale-[0.99]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                      <Camera className="h-8 w-8" />
                    </div>
                    <h4 className="mt-4 text-base sm:text-lg font-black text-zinc-100 group-hover:text-amber-300 transition">
                      📷 Take Photo
                    </h4>
                    <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                      Open device camera to snap textbook problems, screen errors, bills, or objects live.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                      Snap live photo →
                    </span>
                  </button>

                  {/* Action 2: UPLOAD PHOTO / DRAG & DROP */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith('image/')) {
                        processAndAnalyzeImage(file);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/60 p-6 sm:p-8 text-center transition hover:border-zinc-500 hover:bg-zinc-850 cursor-pointer shadow-lg active:scale-[0.99]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300 border border-zinc-700 group-hover:scale-110 group-hover:border-zinc-500 transition-transform">
                      <Upload className="h-8 w-8 text-zinc-300" />
                    </div>
                    <h4 className="mt-4 text-base sm:text-lg font-black text-zinc-100 group-hover:text-white transition">
                      🖼️ Upload Photo
                    </h4>
                    <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                      Drag & drop image here, paste with <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">Ctrl+V</kbd>, or browse gallery.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300 border border-zinc-700">
                      Select image file →
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              )}

              {/* Camera Error Banner */}
              {cameraError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* SAMPLE TEST PRESETS */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Or try instant test presets:
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PHOTO_SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="group flex flex-col text-left p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-850/80 transition cursor-pointer"
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <span className="mt-1 text-xs font-bold text-zinc-200 group-hover:text-amber-300 truncate">
                        {preset.title}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {preset.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. PROCESSING / ANALYZING STATE */}
          {isAnalyzing && currentImage && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
              {/* Image with Scanning Radar Bar */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/50 shadow-2xl max-h-[300px] max-w-md w-full bg-black flex items-center justify-center">
                <img
                  src={currentImage}
                  alt="Analyzing target"
                  className="w-full h-full object-contain filter brightness-90"
                />

                {/* Laser scanline animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-pulse"
                    style={{
                      position: 'absolute',
                      top: '0%',
                      animation: 'scanline 2s ease-in-out infinite alternate',
                    }}
                  />
                </div>

                <style>{`
                  @keyframes scanline {
                    0% { top: 5%; }
                    100% { top: 95%; }
                  }
                `}</style>
              </div>

              {/* Progress Text */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span>Analyzing your photo...</span>
                </div>
                <h4 className="text-base font-bold text-zinc-100">
                  {analysisStep}
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Detecting whether this is a math problem, document, error screenshot, chart, or object.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancel Analysis
              </button>
            </div>
          )}

          {/* 3. ERROR STATE */}
          {errorMessage && !isAnalyzing && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 space-y-3 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-rose-200">
                Analysis Encountered an Issue
              </h4>
              <p className="text-xs text-rose-300 max-w-md mx-auto">
                {errorMessage}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => currentImage && processAndAnalyzeImage(currentImage)}
                  className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Choose Another Photo
                </button>
              </div>
            </div>
          )}

          {/* 4. RESULT STATE */}
          {analysisResult && currentImage && !isAnalyzing && (
            <div className="space-y-4">
              {/* Top Banner: Category & Quick Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">{analysisResult.categoryIcon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 truncate">
                        {analysisResult.categoryName}
                      </h3>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        {analysisResult.confidence === 'high' ? '✓ High Accuracy' : 'Verified'}
                      </span>
                      {analysisResult.detectedLanguage && (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-700">
                          {analysisResult.detectedLanguage}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {analysisResult.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSpeakAnswer}
                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                    title="Read answer aloud"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="hidden sm:inline">Listen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  >
                    {copiedAnswer ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Clarity Warning if image was blurry/partial */}
              {analysisResult.clarityWarning && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{analysisResult.clarityWarning}</span>
                </div>
              )}

              {/* Main Content Layout: Image Thumbnail + Structured Result */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left Column: Image Preview + OCR Tab */}
                <div className="md:col-span-1 space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black max-h-[220px] flex items-center justify-center group">
                    <img
                      src={currentImage}
                      alt="Uploaded visual target"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                      <span className="text-[10px] text-zinc-300 font-mono">
                        {imageSizeInfo ? `${Math.round(imageSizeInfo.comp / 1024)} KB` : 'Image'}
                      </span>
                      <button
                        type="button"
                        onClick={() => window.open(currentImage, '_blank')}
                        className="p-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                        title="View Full Size"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Extracted Text (OCR) snippet */}
                  {analysisResult.extractedText && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Extracted Text</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyOcr}
                          className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          {copiedOcr ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] text-zinc-400 font-mono bg-zinc-900 p-2 rounded-lg max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {analysisResult.extractedText}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Right Column: Structured Solution (Answer, Explanation, Next Step) */}
                <div className="md:col-span-2 space-y-3">
                  {/* Tabs: Overview vs Step-by-Step */}
                  <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeTab === 'overview'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Answer &amp; Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('explanation')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeTab === 'explanation'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Full Explanation &amp; Steps
                    </button>
                  </div>

                  {/* TAB 1: OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div className="space-y-3">
                      {/* 1. ANSWER SECTION */}
                      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-950 p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                            DIRECT ANSWER
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-zinc-100 leading-relaxed overflow-x-auto">
                          <MarkdownRenderer content={analysisResult.answer} />
                        </div>
                      </div>

                      {/* 2. EXPLANATION SECTION */}
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                          EXPLANATION &amp; REASONING
                        </span>
                        <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <MarkdownRenderer content={analysisResult.explanation} />
                        </div>
                      </div>

                      {/* 3. NEXT STEP */}
                      {analysisResult.nextStep && (
                        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3.5 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400 flex items-center gap-1">
                            <span>NEXT ACTIONABLE STEP</span>
                          </span>
                          <p className="text-xs text-sky-200">
                            {analysisResult.nextStep}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: EXPLANATION DEEP DIVE */}
                  {activeTab === 'explanation' && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Comprehensive Walkthrough
                        </h4>
                        <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed space-y-2">
                          <MarkdownRenderer content={analysisResult.explanation} />
                        </div>
                      </div>

                      {analysisResult.nextStep && (
                        <div className="pt-2 border-t border-zinc-800">
                          <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
                            Recommended Verification / Execution
                          </h4>
                          <p className="text-xs text-zinc-300">
                            {analysisResult.nextStep}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK SMART ACTION SUGGESTION PILLS */}
              {analysisResult.suggestedQuestions && analysisResult.suggestedQuestions.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 mb-2">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span>Quick Follow-up Questions:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.suggestedQuestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setShowFollowUp(true);
                          handleSendFollowUp(sug);
                        }}
                        className="rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 transition cursor-pointer text-left"
                      >
                        {sug} →
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION TOOLBAR: ASK ABOUT PHOTO / CLEAR / ANALYZE AGAIN / MAIN CHAT */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFollowUp(!showFollowUp)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      showFollowUp
                        ? 'bg-amber-500 text-zinc-950 shadow-md'
                        : 'border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>💬 {showFollowUp ? 'Hide Follow-up Chat' : 'Ask about this photo'}</span>
                  </button>

                  {onSendToMainChat && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentImage && analysisResult) {
                          onSendToMainChat(
                            currentImage,
                            analysisResult.fullMarkdown,
                            analysisResult.categoryName
                          );
                          onClose();
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                      title="Import this photo & analysis into your primary chat"
                    >
                      <span>Continue in Main Chat →</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => currentImage && processAndAnalyzeImage(currentImage)}
                    className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    title="Re-analyze photo"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Re-analyze</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:border-rose-900 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* 5. INTERACTIVE FOLLOW-UP CHAT DRAWER */}
              {showFollowUp && (
                <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/90 p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                        Threaded Follow-up on this Photo
                      </h4>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Image context preserved across turns
                    </span>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {followUpMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-none'
                              : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none'
                          }`}
                        >
                          <MarkdownRenderer content={msg.content} />
                        </div>

                        {/* Suggested follow-up buttons returned from assistant */}
                        {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 max-w-[85%]">
                            {msg.suggestedQuestions.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                type="button"
                                onClick={() => handleSendFollowUp(q)}
                                className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-amber-300 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {isFollowUpLoading && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 py-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Honk is thinking about this photo...</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Follow-up input form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendFollowUp();
                    }}
                    className="flex items-center gap-2 pt-2 border-t border-zinc-800"
                  >
                    <input
                      type="text"
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      placeholder="Ask anything about this photo (e.g. 'Explain step 2', 'Show formula', 'Translate to Hindi')..."
                      disabled={isFollowUpLoading}
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!followUpInput.trim() || isFollowUpLoading}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
