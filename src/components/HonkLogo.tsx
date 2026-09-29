import React, { useState } from 'react';

export interface HonkLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  glow?: boolean;
  alt?: string;
  priority?: boolean;
  showText?: boolean;
  subtext?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: 'h-6 w-6 rounded-lg',
  sm: 'h-8 w-8 rounded-xl',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-16 w-16 rounded-2xl',
  xl: 'h-24 w-24 rounded-3xl',
  custom: '',
};

export const HonkLogo: React.FC<HonkLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
  alt = 'Honk AI Official Logo',
  showText = false,
  subtext,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const isCustom = size === 'custom' || (className.includes('h-') && className.includes('w-'));
  const sizeClasses = isCustom ? '' : SIZE_MAP[size] || SIZE_MAP.md;

  const logoNode = (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-zinc-950 shadow-md ${sizeClasses} ${
        glow
          ? 'ring-2 ring-amber-500/50 shadow-[0_0_24px_rgba(245,158,11,0.35)]'
          : 'border border-amber-500/20'
      } ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''} ${className}`}
      title={alt}
    >
      {!imageError ? (
        <img
          src="/honk_logo.jpg"
          alt={alt}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover select-none"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
        />
      ) : (
        /* Resilient vector fallback if the image file fails to load */
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white font-black select-none">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3/4 w-3/4 text-white drop-shadow-sm"
          >
            <path d="M12 2C8.5 2 6 4.5 6 7.5c0 2 1 3.8 2.5 4.8-.3 1.2-.5 2.7-.5 4.7 0 2.8 1.8 5 4 5s4-2.2 4-5c0-2-.2-3.5-.5-4.7C17 11.3 18 9.5 18 7.5 18 4.5 15.5 2 12 2zm0 3c1.5 0 2.5 1 2.5 2.5 0 1.2-.8 2.2-2 2.4-.2.1-.5.1-.5.1s-.3 0-.5-.1c-1.2-.2-2-1.2-2-2.4C9.5 6 10.5 5 12 5z" />
          </svg>
        </div>
      )}
    </div>
  );

  if (!showText) {
    return logoNode;
  }

  return (
    <div className="inline-flex items-center gap-2 select-none">
      {logoNode}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm tracking-tight text-zinc-100">
            Honk <span className="text-amber-400">AI</span>
          </span>
          <span className="rounded px-1.5 py-0.2 text-[9px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-300">
            Official
          </span>
        </div>
        {subtext && (
          <span className="text-[10px] text-zinc-400 font-medium leading-none">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};

export default HonkLogo;
