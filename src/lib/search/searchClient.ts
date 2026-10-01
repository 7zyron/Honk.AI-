import {
  SearchResult,
  SearchPrediction,
  HonkMemoryItem,
  SearchFilterOptions,
} from '../../types/search';
import { buildApiUrl } from '../../config/api';

// ============================================================================
// 1. Client-Side LRU Prediction & Result Cache
// ============================================================================

class ClientCache<T> {
  private store: Map<string, { value: T; expiresAt: number }> = new Map();
  private maxItems: number;

  constructor(maxItems = 100) {
    this.maxItems = maxItems;
  }

  public get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public set(key: string, value: T, ttlMs = 15 * 60 * 1000): void {
    if (this.store.size >= this.maxItems) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  public clear(): void {
    this.store.clear();
  }
}

const predictionCache = new ClientCache<SearchPrediction[]>(200);
const searchResultCache = new ClientCache<SearchResult>(50);

// ============================================================================
// 2. Signature "HONK" Audio Haptic Synthesizer (Web Audio API)
// ============================================================================

export function playHonkSoundEffect(volume = 0.15): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Dual-tone harmonic horn frequencies (F4 + A4 approx 349Hz and 440Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(370, now);
    osc1.frequency.exponentialRampToValueAtTime(390, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(360, now + 0.22);

    osc2.frequency.setValueAtTime(465, now);
    osc2.frequency.exponentialRampToValueAtTime(490, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(455, now + 0.22);

    // Envelope
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);

    // Haptic vibration if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 20, 50]);
    }
  } catch {
    // Audio contexts may be blocked or restricted; fail gracefully
  }
}

// ============================================================================
// 3. Search Service
// ============================================================================

export interface SearchRequestOptions extends SearchFilterOptions {
  signal?: AbortSignal;
}

export const searchService = {
  async executeSearch(
    query: string,
    options?: SearchRequestOptions
  ): Promise<SearchResult> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error('Please enter a search query');
    }

    const cacheKey = `${cleanQuery.toLowerCase()}_${options?.deepSearch ? 'deep' : 'std'}`;
    const cached = searchResultCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const res = await fetch(buildApiUrl('/api/search'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: cleanQuery, options }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Search failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.result) {
      throw new Error('Invalid search result returned by server');
    }

    searchResultCache.set(cacheKey, data.result);
    return data.result;
  },

  clearCache() {
    searchResultCache.clear();
  },
};

// ============================================================================
// 4. Predictive Autocompletion Service ("Before You Think")
// ============================================================================

export const predictionService = {
  async fetchPredictions(
    query: string,
    signal?: AbortSignal
  ): Promise<SearchPrediction[]> {
    const cleanQuery = query.trim().toLowerCase();
    const cacheKey = `pred_${cleanQuery}`;

    const cached = predictionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const res = await fetch(buildApiUrl(`/api/search/predict?q=${encodeURIComponent(cleanQuery)}`), {
        signal,
      });

      if (!res.ok) return [];

      const data = await res.json();
      const predictions: SearchPrediction[] = data.predictions || [];

      predictionCache.set(cacheKey, predictions, 5 * 60 * 1000);
      return predictions;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return [];
      }
      console.warn('[HonkSearch] Prediction fetch error:', err);
      return [];
    }
  },
};

// ============================================================================
// 5. Memory Service ("Internet That Remembers YOU")
// ============================================================================

export const memoryService = {
  async getMemories(searchQuery?: string): Promise<{ isEnabled: boolean; memories: HonkMemoryItem[] }> {
    try {
      const url = searchQuery
        ? buildApiUrl(`/api/search/memory?q=${encodeURIComponent(searchQuery)}`)
        : buildApiUrl('/api/search/memory');

      const res = await fetch(url);
      if (!res.ok) return { isEnabled: true, memories: [] };

      const data = await res.json();
      return {
        isEnabled: data.isEnabled ?? true,
        memories: data.memories || [],
      };
    } catch {
      return { isEnabled: true, memories: [] };
    }
  },

  async toggleMemory(enabled: boolean): Promise<boolean> {
    const res = await fetch(buildApiUrl('/api/search/memory/toggle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.ok;
  },

  async deleteMemory(memoryId: string): Promise<boolean> {
    const res = await fetch(buildApiUrl(`/api/search/memory/${memoryId}`), {
      method: 'DELETE',
    });
    return res.ok;
  },

  async clearMemory(): Promise<boolean> {
    const res = await fetch(buildApiUrl('/api/search/memory/clear'), {
      method: 'POST',
    });
    return res.ok;
  },

  async updateNotes(memoryId: string, notes: string): Promise<HonkMemoryItem | null> {
    const res = await fetch(buildApiUrl(`/api/search/memory/${memoryId}/notes`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.memory || null;
  },
};
