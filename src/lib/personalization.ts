import { WallpaperConfig, AssistantPersona } from '../types';

export const DEFAULT_WALLPAPER: WallpaperConfig = {
  type: 'default',
  value: '',
  opacity: 0.45,
  blur: 0,
  brightness: 100,
};

export const DEFAULT_PERSONA: AssistantPersona = {
  name: 'Honk',
  avatarType: 'default',
  avatarValue: '',
};

export interface PresetWallpaperItem {
  id: string;
  name: string;
  category: 'space' | 'minimal' | 'abstract' | 'nature' | 'cyber';
  url: string;
  thumbnail: string;
}

export const PRESET_WALLPAPERS: PresetWallpaperItem[] = [
  {
    id: 'cyber_grid',
    name: 'Cyber Horizon',
    category: 'cyber',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'deep_nebula',
    name: 'Cosmic Nebula',
    category: 'space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'dark_geometry',
    name: 'Obsidian Mesh',
    category: 'minimal',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'aurora_borealis',
    name: 'Emerald Aurora',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'abstract_fluid',
    name: 'Liquid Twilight',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'starfield_night',
    name: 'Midnight Stars',
    category: 'space',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'mountain_mist',
    name: 'Mist Peak',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&auto=format&fit=crop&q=60',
  },
  {
    id: 'tokyo_sunset',
    name: 'Neon Sunset',
    category: 'cyber',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=60',
  },
];

export interface PresetGradientItem {
  id: string;
  name: string;
  gradient: string;
  preview: string;
}

export const PRESET_GRADIENTS: PresetGradientItem[] = [
  {
    id: 'deep_cosmic',
    name: 'Deep Cosmic',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #09090b 100%)',
    preview: 'from-indigo-950 via-indigo-900 to-zinc-950',
  },
  {
    id: 'cyber_sunset',
    name: 'Cyber Sunset',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #831843 35%, #1e1b4b 100%)',
    preview: 'from-rose-950 via-pink-900 to-indigo-950',
  },
  {
    id: 'aurora_dusk',
    name: 'Aurora Dusk',
    gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 35%, #0f172a 100%)',
    preview: 'from-emerald-950 via-teal-900 to-slate-950',
  },
  {
    id: 'twilight_violet',
    name: 'Twilight Violet',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 40%, #09090b 100%)',
    preview: 'from-purple-950 via-purple-900 to-zinc-950',
  },
  {
    id: 'oceanic_abyss',
    name: 'Oceanic Abyss',
    gradient: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 40%, #020617 100%)',
    preview: 'from-sky-950 via-cyan-900 to-slate-950',
  },
  {
    id: 'tokyo_neon',
    name: 'Tokyo Neon',
    gradient: 'linear-gradient(135deg, #18181b 0%, #581c87 50%, #0369a1 100%)',
    preview: 'from-zinc-900 via-purple-900 to-sky-700',
  },
  {
    id: 'amber_glow',
    name: 'Warm Amber',
    gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 40%, #09090b 100%)',
    preview: 'from-amber-950 via-amber-900 to-zinc-950',
  },
  {
    id: 'minimal_slate',
    name: 'Minimal Slate',
    gradient: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
    preview: 'from-zinc-900 to-zinc-950',
  },
];

export interface PresetSolidItem {
  id: string;
  name: string;
  hex: string;
}

export const PRESET_SOLIDS: PresetSolidItem[] = [
  { id: 'obsidian', name: 'Obsidian', hex: '#09090b' },
  { id: 'midnight', name: 'Midnight', hex: '#0b0f19' },
  { id: 'charcoal', name: 'Charcoal', hex: '#1e293b' },
  { id: 'deep_indigo', name: 'Deep Indigo', hex: '#1e1b4b' },
  { id: 'forest_dark', name: 'Dark Forest', hex: '#064e3b' },
  { id: 'plum_berry', name: 'Royal Plum', hex: '#3b0764' },
  { id: 'dark_crimson', name: 'Crimson', hex: '#4c0519' },
  { id: 'warm_mocha', name: 'Warm Mocha', hex: '#292524' },
];

export interface PresetAvatarItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  bgGradient: string;
}

export const PRESET_AVATARS: PresetAvatarItem[] = [
  { id: 'honk', name: 'Honk Goose (Default)', emoji: '🪿', description: 'Original Honk Goose icon', bgGradient: 'from-purple-500 to-indigo-600' },
  { id: 'cyber_bot', name: 'Cyber Bot', emoji: '🤖', description: 'Futuristic AI android', bgGradient: 'from-cyan-500 to-blue-600' },
  { id: 'cosmic_orb', name: 'Cosmic Orb', emoji: '🔮', description: 'Mystic intelligence', bgGradient: 'from-purple-600 to-pink-600' },
  { id: 'quantum_core', name: 'Quantum Core', emoji: '⚛️', description: 'Computational speed', bgGradient: 'from-teal-400 to-emerald-600' },
  { id: 'sparkle_sage', name: 'Sparkle Sage', emoji: '✨', description: 'Creative inspiration', bgGradient: 'from-amber-400 to-orange-500' },
  { id: 'lotus_zen', name: 'Lotus Zen', emoji: '🪷', description: 'Mindful calm assistant', bgGradient: 'from-rose-400 to-pink-600' },
  { id: 'neon_falcon', name: 'Neon Falcon', emoji: '🦅', description: 'Sharp focus & vision', bgGradient: 'from-sky-400 to-blue-600' },
  { id: 'pixel_duck', name: 'Pixel Duck', emoji: '🦆', description: 'Friendly waterfowl', bgGradient: 'from-emerald-400 to-teal-600' },
  { id: 'neural_mind', name: 'Neural Mind', emoji: '🧠', description: 'Deep reasoning engine', bgGradient: 'from-indigo-500 to-purple-600' },
  { id: 'astro_pioneer', name: 'Astro Pioneer', emoji: '🚀', description: 'Exploration & STEM', bgGradient: 'from-orange-500 to-red-600' },
  { id: 'guardian_shield', name: 'Guardian Shield', emoji: '🛡️', description: 'Security & integrity', bgGradient: 'from-blue-600 to-indigo-700' },
  { id: 'flame_dragon', name: 'Flame Dragon', emoji: '🐉', description: 'Unstoppable power', bgGradient: 'from-red-500 to-amber-600' },
];

export const SUGGESTED_NAMES = ['Honk', 'Nova', 'Atlas', 'Jarvis', 'Luna', 'Echo', 'Kira', 'Sage', 'Aura', 'Orion'];
