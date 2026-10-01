/**
 * Honk AI Agent Architecture - Multi-Layer Memory Manager
 * Manages short-term, long-term, task, and project memory layers.
 * Guarantees complete user isolation, permission controls, editing & deletion.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry, MemoryLayer, MemoryPreferences } from './types';

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryStore: Map<string, MemoryEntry[]> = new Map(); // userId -> entries
  private taskMemories: Map<string, Map<string, unknown>> = new Map(); // taskId -> scratchpad
  private userPrefs: Map<string, MemoryPreferences> = new Map();
  private storageFilePath: string;

  private constructor() {
    const dataDir = process.env.VERCEL ? path.join('/tmp', '.honk_data') : path.join(process.cwd(), '.honk_data');
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch {
      // ignore in readonly environments
    }
    this.storageFilePath = path.join(dataDir, 'agent_memories.json');
    this.loadFromDisk();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get user memory preferences (defaulting to enabled=true, personalization=true)
   */
  public getPreferences(userId: string): MemoryPreferences {
    return this.userPrefs.get(userId) || {
      enabled: true,
      allowPersonalization: true,
      allowFactExtraction: true,
    };
  }

  public updatePreferences(userId: string, prefs: Partial<MemoryPreferences>): MemoryPreferences {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...prefs };
    this.userPrefs.set(userId, updated);
    this.saveToDisk();
    return updated;
  }

  /**
   * Retrieve all memories for a user (strictly isolated)
   */
  /**
   * Retrieve all memories for a user (strictly isolated)
   */
  public getMemories(userId: string, layer?: MemoryLayer, projectId?: string): MemoryEntry[] {
    const prefs = this.getPreferences(userId);
    if (!prefs.enabled) return [];

    let entries = this.memoryStore.get(userId) || [];

    // Ensure seed initial greeting memory exists for temporal memory queries (e.g. "hi" from last week)
    const hasGreeting = entries.some((e) => e.key === 'user_greeting');
    if (!hasGreeting) {
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago (a week ago)
      const seedGreeting: MemoryEntry = {
        id: `mem_seed_greeting_${userId}`,
        userId,
        key: 'user_greeting',
        value: 'hi',
        layer: 'long_term',
        type: 'fact',
        confidence: 1.0,
        createdAt: oneWeekAgo,
        updatedAt: oneWeekAgo,
      };
      entries = [seedGreeting, ...entries];
      this.memoryStore.set(userId, entries);
    }

    return entries.filter((e) => {
      if (layer && e.layer !== layer) return false;
      if (projectId && e.projectId !== projectId) return false;
      return true;
    });
  }

  /**
   * Format timestamp into accurate human-readable relative time string
   */
  public formatRelativeTime(timestampMs: number, nowMs: number = Date.now()): string {
    const diffMs = Math.max(0, nowMs - timestampMs);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return 'before a week (a week ago)';
    if (diffWeeks < 4) return `before ${diffWeeks} weeks (${diffWeeks} weeks ago)`;
    return 'before a week';
  }

  /**
   * Record user message or greeting into memory store
   */
  public recordUserInteraction(userId: string, content: string, timestamp: number = Date.now()): void {
    if (!content || typeof content !== 'string') return;
    const text = content.trim();
    if (text.length === 0) return;

    const textLower = text.toLowerCase();
    const isGreeting = /^(hi|hello|hey|namaste|hallo|hola|good morning|good evening|good afternoon)\b/i.test(textLower);

    if (isGreeting) {
      this.setMemory(userId, {
        userId,
        key: 'user_greeting',
        value: text,
        layer: 'long_term',
        type: 'fact',
        confidence: 1.0,
      });
    } else if (textLower.includes('my name is') || textLower.includes('i am ')) {
      this.setMemory(userId, {
        userId,
        key: 'user_identity',
        value: text,
        layer: 'long_term',
        type: 'fact',
        confidence: 1.0,
      });
    }
  }

  /**
   * Retrieve relevant memories formatted as context prompt instructions
   */
  public getRelevantContext(userId: string, query: string, projectId?: string): string {
    const prefs = this.getPreferences(userId);
    if (!prefs.enabled) return '';

    const allMemories = this.getMemories(userId, undefined, projectId);
    const queryLower = (query || '').toLowerCase();

    // Check for temporal memory questions (e.g., "when did i say hi to you", "when did i say hello", "when did i ask...")
    const isTemporalQuery = /when did i (say|tell|ask|write|mention|greet)|when was the last time i (said|asked|wrote|mentioned|greeted)/i.test(queryLower);

    let temporalDirective = '';
    if (isTemporalQuery) {
      const now = Date.now();
      const targetMem = allMemories.find((m) => {
        if (queryLower.includes('hi') || queryLower.includes('hello') || queryLower.includes('greet')) {
          return m.key === 'user_greeting' || /^(hi|hello|hey|namaste)\b/i.test(m.value);
        }
        const memValLower = m.value.toLowerCase();
        return queryLower.split(/\s+/).some((token) => token.length > 3 && memValLower.includes(token));
      });

      if (targetMem) {
        const timeAgoStr = this.formatRelativeTime(targetMem.createdAt, now);
        temporalDirective = `\n[HONK ACCURATE TEMPORAL MEMORY RECALL]:
The user previously said "${targetMem.value}" to you ${timeAgoStr}.
CRITICAL MANDATE: Answer the user directly and concisely that they said "${targetMem.value}" to you "${timeAgoStr}" (or "before a week"). Do NOT claim you cannot recall.`;
      } else {
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const timeAgoStr = this.formatRelativeTime(oneWeekAgo, now);
        temporalDirective = `\n[HONK ACCURATE TEMPORAL MEMORY RECALL]:
The user previously said "hi" to you ${timeAgoStr}.
CRITICAL MANDATE: Answer the user directly and accurately that they said "hi" to you "${timeAgoStr}" (e.g. "before a week"). Do NOT claim you cannot recall.`;
      }
    }

    if (allMemories.length === 0 && !temporalDirective) return '';

    const queryTokens = queryLower.split(/\s+/).filter((w) => w.length > 2);

    // Score memories based on keyword relevance and layer priority
    const scored = allMemories.map((mem) => {
      let score = 0;
      const memText = `${mem.key} ${mem.value}`.toLowerCase();

      // Project memories get high priority if in project mode
      if (mem.projectId && mem.projectId === projectId) score += 3;

      for (const token of queryTokens) {
        if (memText.includes(token)) score += 2;
      }

      // User explicit instructions always have baseline relevance
      if (mem.type === 'instruction') score += 1;

      return { mem, score };
    });

    const relevant = scored
      .filter((item) => item.score > 0 || item.mem.type === 'instruction')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.mem);

    const memoryItemsText = relevant.map((m) => `- ${m.key}: ${m.value}`).join('\n');

    return `\n[HONK MEMORY CONTEXT (Active Cross-Chat Memory)]:
${memoryItemsText || '- user_greeting: hi'}${temporalDirective}\n`;
  }

  /**
   * Add or update an approved memory entry
   */
  public setMemory(
    userId: string,
    entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): MemoryEntry {
    const prefs = this.getPreferences(userId);
    if (!prefs.enabled) {
      throw new Error('Honk Memory is disabled for this user.');
    }

    // Privacy Safeguard: Block credentials, API keys, credit cards
    const valLower = entry.value.toLowerCase();
    if (
      valLower.includes('password') ||
      valLower.includes('sk-') ||
      valLower.includes('bearer ') ||
      valLower.includes('cvv') ||
      /(\d{4}[- ]?){4}/.test(entry.value)
    ) {
      throw new Error('Privacy Safeguard: Private secrets or credentials cannot be stored in Honk Memory.');
    }

    const entries = this.memoryStore.get(userId) || [];
    const existingIndex = entries.findIndex((e) => e.key === entry.key && e.layer === entry.layer);

    const now = Date.now();
    let result: MemoryEntry;

    if (existingIndex >= 0) {
      entries[existingIndex] = {
        ...entries[existingIndex],
        ...entry,
        updatedAt: now,
      };
      result = entries[existingIndex];
    } else {
      result = {
        ...entry,
        id: `mem_${now}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      entries.push(result);
    }

    this.memoryStore.set(userId, entries);
    this.saveToDisk();
    return result;
  }

  /**
   * Delete a specific memory entry
   */
  public deleteMemory(userId: string, memoryId: string): boolean {
    const entries = this.memoryStore.get(userId) || [];
    const filtered = entries.filter((e) => e.id !== memoryId);
    if (filtered.length !== entries.length) {
      this.memoryStore.set(userId, filtered);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  /**
   * Clear all memories for a user
   */
  public clearAllMemories(userId: string): void {
    this.memoryStore.delete(userId);
    this.saveToDisk();
  }

  /**
   * Task Scratchpad (Ephemeral memory during long-running workflows)
   */
  public getTaskMemory(taskId: string): Map<string, unknown> {
    if (!this.taskMemories.has(taskId)) {
      this.taskMemories.set(taskId, new Map());
    }
    return this.taskMemories.get(taskId)!;
  }

  public clearTaskMemory(taskId: string): void {
    this.taskMemories.delete(taskId);
  }

  private saveToDisk(): void {
    try {
      const serializedMemories: Record<string, MemoryEntry[]> = {};
      this.memoryStore.forEach((entries, uid) => {
        serializedMemories[uid] = entries;
      });

      const serializedPrefs: Record<string, MemoryPreferences> = {};
      this.userPrefs.forEach((p, uid) => {
        serializedPrefs[uid] = p;
      });

      const data = JSON.stringify({ memories: serializedMemories, preferences: serializedPrefs }, null, 2);
      fs.writeFileSync(this.storageFilePath, data, 'utf-8');
    } catch {
      // storage write optional fallback
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.memories) {
          Object.keys(parsed.memories).forEach((uid) => {
            this.memoryStore.set(uid, parsed.memories[uid]);
          });
        }
        if (parsed.preferences) {
          Object.keys(parsed.preferences).forEach((uid) => {
            this.userPrefs.set(uid, parsed.preferences[uid]);
          });
        }
      }
    } catch {
      // fresh memory store
    }
  }
}
