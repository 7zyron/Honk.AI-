import React from 'react';
import { WallpaperConfig } from '../types';

interface ChatWallpaperProps {
  wallpaper?: WallpaperConfig;
  className?: string;
}

export const ChatWallpaper: React.FC<ChatWallpaperProps> = ({
  wallpaper,
  className = '',
}) => {
  if (!wallpaper || wallpaper.type === 'default' || !wallpaper.value) {
    return null;
  }

  const { type, value, opacity = 0.5, blur = 0, brightness = 100 } = wallpaper;

  const filterStyle = `blur(${blur}px) brightness(${brightness}%)`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Solid Color Wallpaper */}
      {type === 'solid' && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: value,
            opacity: Math.max(0.05, Math.min(1, opacity)),
            filter: filterStyle,
          }}
        />
      )}

      {/* 2. Gradient Wallpaper */}
      {type === 'gradient' && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: value,
            opacity: Math.max(0.05, Math.min(1, opacity)),
            filter: filterStyle,
          }}
        />
      )}

      {/* 3. Preset or Custom Image Wallpaper */}
      {(type === 'preset' || type === 'custom') && value && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-300 scale-105"
          style={{
            backgroundImage: `url("${value}")`,
            opacity: Math.max(0.05, Math.min(1, opacity)),
            filter: filterStyle,
          }}
        />
      )}

      {/* 4. Contrast Scrim / Readability Protection Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-page)]/70 via-[var(--bg-page)]/40 to-[var(--bg-page)]/80 pointer-events-none" />
    </div>
  );
};

export default ChatWallpaper;
