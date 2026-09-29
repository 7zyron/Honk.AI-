export interface AccentColorOption {
  id: string;
  name: string;
  hex: string;
  hoverHex: string;
  description: string;
}

export const PRESET_ACCENT_COLORS: AccentColorOption[] = [
  { id: 'purple', name: 'Purple', hex: '#9333ea', hoverHex: '#7e22ce', description: 'Honk Purple (Default)' },
  { id: 'blue', name: 'Blue', hex: '#2563eb', hoverHex: '#1d4ed8', description: 'Electric Blue' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4', hoverHex: '#0891b2', description: 'Cyber Cyan' },
  { id: 'green', name: 'Green', hex: '#16a34a', hoverHex: '#15803d', description: 'Emerald Green' },
  { id: 'pink', name: 'Pink', hex: '#ec4899', hoverHex: '#db2777', description: 'Vibrant Pink' },
  { id: 'red', name: 'Red', hex: '#dc2626', hoverHex: '#b91c1c', description: 'Crimson Red' },
  { id: 'orange', name: 'Orange', hex: '#ea580c', hoverHex: '#c2410c', description: 'Solar Orange' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308', hoverHex: '#ca8a04', description: 'Amber Gold' },
];

export const DEFAULT_ACCENT_COLOR = '#9333ea'; // Purple

/**
 * Calculates contrasting foreground color (white or dark zinc) based on background luminance.
 */
export function getContrastForeground(hex: string): '#ffffff' | '#09090b' {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Standard WCAG relative luminance approximation
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 165 ? '#09090b' : '#ffffff';
}

/**
 * Converts hex to rgba string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Lightens or darkens a hex color by a given factor.
 */
export function adjustColor(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  let g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  let b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  r = Math.max(0, Math.min(255, Math.round(r + amount)));
  g = Math.max(0, Math.min(255, Math.round(g + amount)));
  b = Math.max(0, Math.min(255, Math.round(b + amount)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Resolves the active visual mode ('dark' | 'light') based on user choice and system preference.
 */
export function resolveEffectiveTheme(theme: 'dark' | 'light' | 'system'): 'dark' | 'light' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return theme;
}

/**
 * Applies theme classes and CSS custom variables dynamically to the document.
 */
export function applyThemeAndAccent(theme: 'dark' | 'light' | 'system', accentColor: string = DEFAULT_ACCENT_COLOR): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';

  const effectiveTheme = resolveEffectiveTheme(theme);
  const root = document.documentElement;

  // 1. Theme class handling
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // 2. Accent color variables
  const cleanHex = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;
  const foreground = getContrastForeground(cleanHex);
  const hoverHex = adjustColor(cleanHex, effectiveTheme === 'dark' ? 25 : -25);
  const subtleBg = hexToRgba(cleanHex, effectiveTheme === 'dark' ? 0.15 : 0.12);
  const borderBg = hexToRgba(cleanHex, effectiveTheme === 'dark' ? 0.35 : 0.3);
  const ringBg = hexToRgba(cleanHex, 0.45);
  const textTint = effectiveTheme === 'dark' ? adjustColor(cleanHex, 50) : adjustColor(cleanHex, -35);

  root.style.setProperty('--honk-accent', cleanHex);
  root.style.setProperty('--honk-accent-hover', hoverHex);
  root.style.setProperty('--honk-accent-foreground', foreground);
  root.style.setProperty('--honk-accent-subtle', subtleBg);
  root.style.setProperty('--honk-accent-border', borderBg);
  root.style.setProperty('--honk-accent-ring', ringBg);
  root.style.setProperty('--honk-accent-text', textTint);
  root.style.setProperty('--honk-accent-gradient-from', cleanHex);
  root.style.setProperty('--honk-accent-gradient-to', adjustColor(cleanHex, -40));

  return effectiveTheme;
}
