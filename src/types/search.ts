export interface SearchSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  favicon?: string;
  score?: number; // 0 - 100 relevance
  verified?: boolean;
}

export type PredictionType =
  | 'instant_completion'
  | 'memory'
  | 'trending'
  | 'deep_search'
  | 'quick_action';

export interface SearchPrediction {
  id: string;
  text: string;
  highlightedText?: string;
  type: PredictionType;
  subtitle?: string;
  iconName?: string;
  score: number;
  memoryId?: string;
  originalQuery?: string;
  matchedFrom?: 'memory' | 'history' | 'web' | 'intent';
  timestamp?: number;
}

export interface SearchResult {
  id: string;
  query: string;
  directAnswer: string;
  keyTakeaways: string[];
  deepAnswer?: string;
  sources: SearchSource[];
  relatedSearches: string[];
  groundingQueries?: string[];
  suggestedFollowUps?: string[];
  responseTimeMs: number;
  searchedAt: number;
  fromMemory?: boolean;
  memoryId?: string;
  cached?: boolean;
  pipelineSteps?: Array<{
    name: string;
    durationMs: number;
    status: 'done' | 'active' | 'pending';
  }>;
}

export interface HonkMemoryItem {
  id: string;
  userId: string;
  query: string;
  summary: string;
  keyFacts: string[];
  sources: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
  timestamp: number;
  lastVisitedAt: number;
  visitCount: number;
  tags: string[];
  userNotes?: string;
  isPinned?: boolean;
}

export interface SearchMemorySettings {
  enabled: boolean;
  syncWithCloud: boolean;
  autoExtractNotes: boolean;
  retentionDays: number;
}

export interface SearchFilterOptions {
  category?: 'all' | 'tech' | 'news' | 'finance' | 'general';
  timeframe?: 'all' | 'day' | 'week' | 'month' | 'year';
  useMemory?: boolean;
  deepSearch?: boolean;
}
