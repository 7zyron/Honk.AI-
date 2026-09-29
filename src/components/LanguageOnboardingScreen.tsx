import React, { useState } from 'react';
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Search,
  Volume2,
  Check,
  Sparkles,
  Zap,
  Shield,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { COUNTRIES_LIST, INDIA_LANGUAGES, CountryOption, LanguageOption } from '../types';
import { speakWithHonkVoice, stopSpeaking } from '../lib/voice';

interface LanguageOnboardingScreenProps {
  onCompleteOnboarding: (countryCode: string, langCode: string) => void;
  defaultCountry?: string;
  defaultLanguage?: string;
}

type OnboardingStep = 'country' | 'ask_other_lang' | 'indian_languages';

export const LanguageOnboardingScreen: React.FC<LanguageOnboardingScreenProps> = ({
  onCompleteOnboarding,
  defaultCountry = 'IN',
  defaultLanguage = 'en-IN',
}) => {
  const [step, setStep] = useState<OnboardingStep>('country');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(defaultCountry);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(defaultLanguage);
  const [countrySearch, setCountrySearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);

  // Current country object
  const currentCountry =
    COUNTRIES_LIST.find((c) => c.code === selectedCountryCode) || COUNTRIES_LIST[0];

  // Filter countries
  const filteredCountries = COUNTRIES_LIST.filter((country) => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return true;
    return (
      country.name.toLowerCase().includes(q) ||
      country.nativeName.toLowerCase().includes(q) ||
      country.code.toLowerCase().includes(q)
    );
  });

  // Filter Indian languages for India
  const filteredLanguages = INDIA_LANGUAGES.filter((lang) => {
    const q = languageSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q) ||
      lang.sampleQuery.toLowerCase().includes(q)
    );
  });

  // Select country handler
  const handleSelectCountry = (country: CountryOption) => {
    setSelectedCountryCode(country.code);

    if (country.code === 'IN') {
      // User is from India: set English as default, then ask "do you need other language?"
      setSelectedLanguageCode('en-IN');
      setStep('ask_other_lang');
    } else {
      // User is from other country rather than India: let them talk in English directly
      const englishOption =
        country.supportedLanguages.find((l) => l.code.toLowerCase().startsWith('en')) ||
        country.supportedLanguages[0];
      const langCode = englishOption?.code || 'en-US';
      stopSpeaking();
      onCompleteOnboarding(country.code, langCode);
    }
  };

  const handlePreviewVoice = (lang: LanguageOption, e: React.MouseEvent) => {
    e.stopPropagation();
    stopSpeaking();
    setIsPlayingPreview(lang.code);

    const previewPhrase =
      lang.code === 'hi-IN'
        ? 'नमस्ते! मैं होंक एआई हूँ, आपकी क्या सहायता करूँ?'
        : lang.code === 'Hinglish'
        ? 'Hello! Main Honk AI hoon. Aaj aapki kya help kar sakta hoon?'
        : lang.code === 'en-IN'
        ? 'Hello! I am Honk AI, how can I assist you today?'
        : lang.sampleQuery || `Hello from Honk AI in ${lang.name}`;

    speakWithHonkVoice({
      text: previewPhrase,
      language: lang.code,
      voice: lang.piperVoice,
      rate: 1.0,
      onStart: () => setIsPlayingPreview(lang.code),
      onEnd: () => setIsPlayingPreview(null),
      onError: () => setIsPlayingPreview(null),
    });
  };

  const handleConfirmIndianLanguage = () => {
    stopSpeaking();
    onCompleteOnboarding('IN', selectedLanguageCode);
  };

  const selectedLangObj =
    INDIA_LANGUAGES.find((l) => l.code === selectedLanguageCode) || INDIA_LANGUAGES[0];

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 selection:bg-amber-500 selection:text-zinc-950">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-amber-500/15 blur-[120px]" />
        <div className="absolute -bottom-40 right-10 h-[400px] w-[500px] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-4xl pt-4 sm:pt-6 text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Honk AI Voice & Intelligence</span>
        </div>

        {step === 'country' && (
          <>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
              Which country are you from?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Select your country to get customized language support, regional neural voice synthesis, and localized intelligence.
            </p>

            {/* Country Search */}
            <div className="pt-2 max-w-md mx-auto">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                <input
                  id="search-country-input"
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country (India, US, UK, Canada, UAE...)"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </>
        )}

        {step === 'ask_other_lang' && (
          <>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setStep('country')}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Change Country (🇮🇳 India)</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
              Do you need other language?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              <span className="font-semibold text-zinc-200">English</span> is set as your default language. If you need another language, you can choose from all Indian regional languages or continue in English.
            </p>
          </>
        )}

        {step === 'indian_languages' && (
          <>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setStep('ask_other_lang')}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
              All Indian Languages
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Choose your preferred Indian regional language or Hinglish for chat, voice recognition, and Piper neural speech.
            </p>

            {/* Language Search */}
            <div className="pt-2 max-w-md mx-auto">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                <input
                  id="search-language-input"
                  type="text"
                  value={languageSearch}
                  onChange={(e) => setLanguageSearch(e.target.value)}
                  placeholder="Search Indian language (Hindi, Kannada, Tamil, Telugu, Marathi...)"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-4xl my-6 flex-1 overflow-y-auto max-h-[52vh] sm:max-h-[56vh] pr-1">
        {step === 'country' && (
          /* Country List Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCountries.map((country) => {
              const isSelected = selectedCountryCode === country.code;
              return (
                <div
                  key={country.code}
                  id={`country-card-${country.code}`}
                  onClick={() => handleSelectCountry(country)}
                  className={`group relative flex items-center justify-between rounded-2xl border p-4 text-left cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'border-amber-500 bg-zinc-900/90 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{country.flag}</span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-2">
                        {country.name}
                        {country.code === 'IN' && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            Primary
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {country.code === 'IN' ? 'English default + Indian languages' : 'Talk in English'}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                </div>
              );
            })}
          </div>
        )}

        {step === 'ask_other_lang' && (
          /* Question Prompt for Users from India */
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center space-y-6 py-6">
            <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 backdrop-blur-md shadow-2xl text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-3xl">
                🇮🇳
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
                  Do you need other language?
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                  <span className="text-amber-400 font-semibold">English</span> is already set as your default language. If you need another language, you can explore all Indian languages, or continue in English.
                </p>
              </div>

              {/* Action Buttons: Yes and No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* YES: Show all Indian languages */}
                <button
                  id="need-other-lang-yes-btn"
                  type="button"
                  onClick={() => setStep('indian_languages')}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center transition hover:bg-amber-500/20 hover:border-amber-500 hover:scale-[1.02] active:scale-98"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">
                    Yes
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-300">Yes, show languages</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Show all Indian languages (Hindi, Tamil, Telugu, Kannada...)
                    </div>
                  </div>
                </button>

                {/* NO: Talk in English */}
                <button
                  id="need-other-lang-no-btn"
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    onCompleteOnboarding('IN', 'en-IN');
                  }}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5 text-center transition hover:bg-zinc-800 hover:border-zinc-500 hover:scale-[1.02] active:scale-98"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-700 text-zinc-100 font-bold text-sm">
                    No
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-100">No, continue in English</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Keep English as default and start chatting
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'indian_languages' && (
          /* Grid of all Indian Languages */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLanguages.map((lang) => {
              const isSelected = selectedLanguageCode === lang.code;
              const isPlaying = isPlayingPreview === lang.code;

              return (
                <div
                  key={lang.code}
                  id={`lang-card-${lang.code}`}
                  onClick={() => setSelectedLanguageCode(lang.code)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'border-amber-500 bg-zinc-900/90 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-zinc-100">{lang.name}</h3>
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-400 font-medium mt-0.5">{lang.nativeName}</p>
                    </div>

                    {/* Audio Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePreviewVoice(lang, e)}
                      title={`Preview voice in ${lang.name}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
                        isPlaying
                          ? 'border-amber-400 bg-amber-500 text-zinc-950 animate-pulse'
                          : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] text-zinc-400 line-clamp-1 italic">
                    &ldquo;{lang.sampleQuery}&rdquo;
                  </p>

                  <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Piper Voice & STT</span>
                    </span>
                    <span className="font-mono text-zinc-400">{lang.code}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {((step === 'country' && filteredCountries.length === 0) ||
          (step === 'indian_languages' && filteredLanguages.length === 0)) && (
          <div className="py-12 text-center text-zinc-400">
            <Globe className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">No results found.</p>
            <button
              onClick={() => {
                setCountrySearch('');
                setLanguageSearch('');
              }}
              className="mt-2 text-xs text-amber-400 hover:underline"
            >
              Reset search
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>Piper Neural Voice</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>Privacy Guard & Zero URL Spoken</span>
          </div>
        </div>

        {step === 'country' && (
          <button
            id="continue-to-languages-btn"
            type="button"
            onClick={() => handleSelectCountry(currentCountry)}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-zinc-800 px-6 py-3 text-sm font-bold text-zinc-100 hover:bg-zinc-700 transition"
          >
            <span>Proceed with {currentCountry.name} {currentCountry.flag}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 'ask_other_lang' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStep('country')}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onCompleteOnboarding('IN', 'en-IN');
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:from-amber-400 hover:to-amber-300"
            >
              <span>Continue in English</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'indian_languages' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStep('ask_other_lang')}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Back
            </button>
            <button
              id="confirm-indian-language-btn"
              type="button"
              onClick={handleConfirmIndianLanguage}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-3.5 text-sm font-bold text-zinc-950 shadow-xl shadow-amber-500/20 transition hover:from-amber-400 hover:to-amber-300 active:scale-98"
            >
              <span>Continue with {selectedLangObj?.name || 'Selected Language'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
