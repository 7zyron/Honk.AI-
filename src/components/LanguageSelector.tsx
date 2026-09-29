import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { INDIAN_LANGUAGES, COUNTRIES_LIST } from '../types';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (langCode: string) => void;
  selectedCountry?: string;
  isOpenControlled?: boolean;
  onToggleControlled?: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  selectedCountry = 'IN',
  isOpenControlled,
  onToggleControlled,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isIndia = !selectedCountry || selectedCountry === 'IN';
  const countryObj = COUNTRIES_LIST.find((c) => c.code === selectedCountry) || COUNTRIES_LIST[0];

  const currentLang =
    INDIAN_LANGUAGES.find((l) => l.code === selectedLanguage) || INDIAN_LANGUAGES[0];

  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleControlled) {
      onToggleControlled();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpenControlled !== undefined) {
          if (isOpen && onToggleControlled) onToggleControlled();
        } else {
          setInternalIsOpen(false);
        }
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, isOpenControlled, onToggleControlled]);

  return (
    <div className="relative inline-block text-left shrink-0 z-40" ref={containerRef}>
      <button
        id="indian-language-selector-btn"
        type="button"
        onClick={toggleOpen}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-750 bg-zinc-900 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-100 shadow-xs transition hover:border-amber-500/50 hover:bg-zinc-800/80 cursor-pointer ${
          isOpen ? 'border-amber-500/80 ring-1 ring-amber-500/50' : ''
        }`}
        title={isIndia ? 'Select Regional Indian Language / Hinglish' : `Country: ${countryObj.name}`}
      >
        <span className="text-sm shrink-0">{isIndia ? '🇮🇳' : countryObj.flag}</span>
        <span className="max-w-[75px] sm:max-w-[110px] truncate font-semibold">
          {isIndia ? currentLang.name : 'English'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-zinc-700/90 bg-zinc-900/98 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {isIndia ? (
            <>
              <div className="px-2.5 py-1.5 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 flex items-center justify-between mb-1">
                <span className="text-zinc-200">Indian Languages & Hinglish</span>
                <Sparkles className="h-3 w-3 text-amber-400" />
              </div>

              <div className="py-1 space-y-1">
                {INDIAN_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === selectedLanguage;
                  return (
                    <button
                      key={lang.code}
                      id={`lang-option-${lang.code}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLanguage(lang.code);
                        if (onToggleControlled) onToggleControlled();
                        else setInternalIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col text-left min-w-0 pr-2">
                        <span className="font-semibold text-zinc-100 truncate">{lang.name}</span>
                        <span className="text-[10px] text-zinc-400 truncate">{lang.nativeName}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-3 text-xs text-zinc-200 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <span>{countryObj.flag}</span>
                <span>Language: English</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Honk AI communicates directly in English for users in {countryObj.name}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
