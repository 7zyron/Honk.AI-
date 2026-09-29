import React, { useEffect } from 'react';
import {
  MessageSquare,
  Code2,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Globe,
  User,
  ArrowRight,
  Shield,
  Zap,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { HonkLogo } from './HonkLogo';

interface AboutPageProps {
  onNavigateHome: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateHome }) => {
  useEffect(() => {
    // Update document title for SEO
    document.title = 'About Honk AI | Official';

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Learn about Honk AI, its features, and its creator Zyron.');

    // Update canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://honk-ai-harshil.ai.studio/about');

    // Update og:title & og:description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', 'About Honk AI | Official');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', 'Learn about Honk AI, its features, and its creator Zyron.');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', 'https://honk-ai-harshil.ai.studio/about');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      // Revert title and tags when unmounting
      document.title = 'Honk AI | Official AI Assistant';
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          'Honk AI is an AI assistant created by Zyron for chatting, creativity, coding, images, and everyday help.'
        );
      }
      if (canonical) {
        canonical.setAttribute('href', 'https://honk-ai-harshil.ai.studio/');
      }
      if (ogTitle) ogTitle.setAttribute('content', 'Honk AI | Official AI Assistant');
      if (ogDesc) {
        ogDesc.setAttribute(
          'content',
          'Honk AI is an AI assistant created by Zyron for chatting, creativity, coding, images, and everyday help.'
        );
      }
      if (ogUrl) ogUrl.setAttribute('content', 'https://honk-ai-harshil.ai.studio/');
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header Bar with Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <HonkLogo size="sm" glow className="transition group-hover:scale-105" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-zinc-100">Honk AI</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                  Official
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">By Zyron</p>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main Navigation">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-amber-400 transition px-2.5 py-1.5 rounded-lg hover:bg-zinc-900"
            >
              Chat
            </a>
            <a
              href="/about"
              className="text-xs sm:text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg"
              aria-current="page"
            >
              About
            </a>
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 shadow-sm"
            >
              <span>Launch AI Chat</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 md:py-16 space-y-12">
        {/* Hero Section */}
        <section className="text-center sm:text-left border-b border-zinc-800/80 pb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Assistant Profile</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-100">
            About Honk AI
          </h1>

          <p className="mt-4 text-base sm:text-lg text-amber-300/90 font-medium max-w-2xl leading-relaxed">
            Honk AI is an AI assistant designed to help with chatting, coding, creativity, images, and everyday tasks.
          </p>

          <p className="mt-2 text-sm sm:text-base text-zinc-400 font-medium">
            Created by <span className="text-zinc-200 font-semibold">Zyron</span>.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 shadow-md"
            >
              <span>Start Chatting</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <a
              href="#what-can-honk-ai-do"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition"
            >
              Explore Capabilities
            </a>
          </div>
        </section>

        {/* Section 1: What is Honk AI? */}
        <section id="what-is-honk-ai" className="space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Zap className="h-5 w-5" />
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
              What is Honk AI?
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 text-sm sm:text-base leading-relaxed text-zinc-300 space-y-3">
            <p>
              <strong className="text-zinc-100">Honk AI</strong> is an official intelligent AI assistant platform designed and created by <strong className="text-amber-400">Zyron</strong>. It provides an intuitive, high-speed environment for natural language conversation, technical programming, creative generation, and everyday problem-solving.
            </p>
            <p>
              Built from scratch with a focus on responsiveness, precision, and privacy, Honk AI combines server-side AI model execution with a clean user experience. Whether you need an intelligent conversational partner, a technical collaborator for coding and debugging, or an analytical tool for processing text and files, Honk AI delivers fast, contextual, and reliable assistance.
            </p>
          </div>
        </section>

        {/* Section 2: What can Honk AI do? */}
        <section id="what-can-honk-ai-do" className="space-y-6">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
              What can Honk AI do?
            </h2>
          </div>

          <p className="text-sm text-zinc-400">
            Honk AI is equipped to assist with a diverse spectrum of creative, technical, and analytical workflows:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-zinc-100">
                Interactive AI Chat
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Engage in natural, multi-turn dialogues across any subject. Ask detailed questions, brainstorm ideas, request explanations in simple terms, or conduct in-depth research.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Code2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-zinc-100">
                Coding & Development
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Generate production-ready code, diagnose bugs, refactor existing scripts, and analyze complex algorithms with syntax-highlighted code blocks and 1-click clipboard copy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-zinc-100">
                Creativity & Writing
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Draft outlines, emails, essays, summaries, and creative narratives. Adjust tone and persona instructions to tailor responses exactly to your style.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-zinc-100">
                Images & Multimodal Files
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Attach images, documents, PDFs, and code snippets directly to messages. Inspect images in high-resolution full-screen view.
              </p>
            </div>
          </div>

          {/* Core Feature Highlights */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Additional Everyday Capabilities
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Multi-model intelligence selection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Secure backend rate-limit of 100 daily queries</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Message editing & branch resubmission</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Real-time response streaming</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Persistent conversation history & search</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>JSON conversation import & export</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: About the creator */}
        <section id="about-the-creator" className="space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <User className="h-5 w-5" />
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
              About the creator
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 space-y-3 text-sm sm:text-base leading-relaxed text-zinc-300">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xl font-black">
                Z
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Zyron</h3>
                <p className="text-xs text-amber-400 font-medium">Creator & Lead Developer of Honk AI</p>
              </div>
            </div>

            <p className="pt-2">
              <strong>Honk AI was created by Zyron</strong> with the objective of building an accessible, responsive, and robust AI assistant that simplifies daily computing, creative brainstorming, and software engineering.
            </p>
            <p>
              Zyron oversees the development, architecture, and feature enhancements of the Honk AI platform, ensuring it remains fast, reliable, and equipped with practical tools for users worldwide.
            </p>
          </div>
        </section>

        {/* Section 4: Official Honk AI */}
        <section id="official-honk-ai" className="space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Globe className="h-5 w-5" />
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
              Official Honk AI
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 space-y-4 text-sm sm:text-base text-zinc-300">
            <p>
              The official, authenticated web domain for Honk AI is:
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
              <div className="flex items-center gap-2 font-mono text-amber-400 text-sm sm:text-base truncate">
                <Globe className="h-4 w-4 shrink-0 text-amber-400" />
                <a
                  href="https://honk-ai-harshil.ai.studio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate"
                >
                  https://honk-ai-harshil.ai.studio/
                </a>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 shrink-0">
                <Shield className="h-3 w-3" />
                <span>Official Web Application</span>
              </span>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-zinc-400 pt-1">
              <p>
                • <strong>Canonical Web Route:</strong> <span className="font-mono text-zinc-300">https://honk-ai-harshil.ai.studio/</span>
              </p>
              <p>
                • <strong>Official About Route:</strong> <span className="font-mono text-zinc-300">https://honk-ai-harshil.ai.studio/about</span>
              </p>
              <p>
                • <strong>Sitemap:</strong> <a href="/sitemap.xml" className="text-amber-400 hover:underline">/sitemap.xml</a>
              </p>
              <p>
                • <strong>Robots:</strong> <a href="/robots.txt" className="text-amber-400 hover:underline">/robots.txt</a>
              </p>
            </div>
          </div>
        </section>

        {/* Action Call to Action */}
        <section className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-zinc-900 to-zinc-950 p-6 sm:p-8 text-center space-y-4">
          <div className="flex justify-center">
            <HonkLogo size="lg" glow />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            Ready to experience Honk AI?
          </h2>
          <p className="mx-auto max-w-lg text-sm text-zinc-300">
            Start a fresh conversation, brainstorm solutions, write code, or analyze files right in your browser.
          </p>
          <div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition shadow-lg"
            >
              <span>Launch Honk AI</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer with Navigation */}
      <footer className="mt-16 border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 text-xs text-zinc-500">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">Honk AI</span>
            <span>•</span>
            <span>Created by Zyron</span>
          </div>

          {/* Footer Navigation Links */}
          <nav className="flex items-center gap-4" aria-label="Footer Navigation">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="text-zinc-400 hover:text-amber-400 transition"
            >
              Chat
            </a>
            <a
              href="/about"
              className="text-amber-400 font-semibold"
              aria-current="page"
            >
              About
            </a>
            <a
              href="https://honk-ai-harshil.ai.studio/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-amber-400 transition"
            >
              Official Website
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
};
