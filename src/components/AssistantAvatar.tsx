import React, { useState } from 'react';
import { HonkLogo } from './HonkLogo';
import { AssistantPersona } from '../types';
import { PRESET_AVATARS } from '../lib/personalization';

interface AssistantAvatarProps {
  persona?: AssistantPersona;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
  alt?: string;
}

const SIZE_MAP = {
  xs: 'h-6 w-6 text-xs rounded-lg',
  sm: 'h-8 w-8 text-sm rounded-xl',
  md: 'h-10 w-10 text-base rounded-xl',
  lg: 'h-16 w-16 text-2xl rounded-2xl',
  xl: 'h-24 w-24 text-4xl rounded-3xl',
};

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({
  persona,
  size = 'md',
  className = '',
  glow = false,
  alt,
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const assistantName = persona?.name || 'Honk';
  const avatarAlt = alt || `${assistantName} Avatar`;

  // Default Honk Avatar (or if custom failed to load)
  if (!persona || persona.avatarType === 'default' || !persona.avatarType) {
    return (
      <HonkLogo
        size={size}
        className={className}
        glow={glow}
        alt={avatarAlt}
      />
    );
  }

  // Custom Image Uploaded by User
  if (persona.avatarType === 'custom' && persona.avatarValue && !imageError) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-zinc-950 shadow-md ${sizeClass} ${
          glow
            ? 'ring-2 ring-[var(--honk-accent)] shadow-[0_0_24px_rgba(168,85,247,0.35)]'
            : 'border border-[var(--border-app)]'
        } ${className}`}
      >
        <img
          src={persona.avatarValue}
          alt={avatarAlt}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover select-none"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  // Preset Avatar (Emoji/Icon Badge)
  const preset = PRESET_AVATARS.find((p) => p.id === persona.avatarValue) || PRESET_AVATARS[0];

  if (preset.id === 'honk') {
    return (
      <HonkLogo
        size={size}
        className={className}
        glow={glow}
        alt={avatarAlt}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none bg-gradient-to-br ${preset.bgGradient} text-white shadow-md transition-all ${sizeClass} ${
        glow
          ? 'ring-2 ring-[var(--honk-accent)] shadow-[0_0_24px_rgba(168,85,247,0.4)]'
          : 'border border-white/20'
      } ${className}`}
      title={preset.name}
    >
      <span className="leading-none drop-shadow-sm">{preset.emoji}</span>
    </div>
  );
};

export default AssistantAvatar;
