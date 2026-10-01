/**
 * Client-Side Honk AI Agent Service
 * Handles SSE streaming connection, memory operations, tool discovery, and benchmark runs.
 */

import {
  AgentStreamEvent,
  MemoryEntry,
  MemoryPreferences,
  BenchmarkSummary,
  BenchmarkRunResult,
} from '../types/agent';
import { buildApiUrl } from '../config/api';

export interface AgentStreamRequest {
  prompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  isHeavyTask: boolean;
  userId: string;
  projectId?: string;
  confirmedActions?: string[];
}

export async function streamAgentExecution(
  request: AgentStreamRequest,
  onEvent: (event: AgentStreamEvent) => void,
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const url = buildApiUrl('/api/agent/stream');
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('Unable to connect to Honk Agent API. Please verify backend server or NEXT_PUBLIC_HONK_API_URL.');
  }

  if (response.status === 404) {
    throw new Error('Honk Agent API endpoint not found (404). Please verify backend deployment or set NEXT_PUBLIC_HONK_API_URL.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Agent execution failed (${response.status}): ${errorText || 'Server error'}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported by browser.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') break;

      try {
        const event: AgentStreamEvent = JSON.parse(dataStr);
        if (event.type === 'delta' && typeof event.data?.text === 'string') {
          onDelta(event.data.text);
        } else {
          onEvent(event);
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }
}

export async function fetchAgentTools(): Promise<Array<{
  name: string;
  displayName: string;
  description: string;
  category: string;
  isConsequential: boolean;
}>> {
  const res = await fetch(buildApiUrl('/api/agent/tools'));
  if (!res.ok) throw new Error('Failed to load agent tools');
  const data = await res.json();
  return data.tools || [];
}

export async function fetchAgentMemories(userId: string): Promise<{
  memories: MemoryEntry[];
  preferences: MemoryPreferences;
}> {
  const res = await fetch(buildApiUrl(`/api/agent/memory?userId=${encodeURIComponent(userId)}`));
  if (!res.ok) throw new Error('Failed to fetch memories');
  return res.json();
}

export async function saveAgentMemory(
  userId: string,
  entry: { key: string; value: string; type: string; layer: string }
): Promise<MemoryEntry> {
  const res = await fetch(buildApiUrl('/api/agent/memory'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, entry }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save memory');
  }
  const data = await res.json();
  return data.memory;
}

export async function updateAgentMemoryPreferences(
  userId: string,
  preferences: Partial<MemoryPreferences>
): Promise<MemoryPreferences> {
  const res = await fetch(buildApiUrl('/api/agent/memory/preferences'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, preferences }),
  });
  if (!res.ok) throw new Error('Failed to update memory preferences');
  const data = await res.json();
  return data.preferences;
}

export async function deleteAgentMemory(userId: string, memoryId: string): Promise<boolean> {
  const res = await fetch(buildApiUrl(`/api/agent/memory/${encodeURIComponent(memoryId)}?userId=${encodeURIComponent(userId)}`), {
    method: 'DELETE',
  });
  return res.ok;
}

export async function clearAllAgentMemories(userId: string): Promise<boolean> {
  const res = await fetch(buildApiUrl(`/api/agent/memory?userId=${encodeURIComponent(userId)}`), {
    method: 'DELETE',
  });
  return res.ok;
}

export async function runAgentBenchmarkSuite(): Promise<{
  summary: BenchmarkSummary;
  results: BenchmarkRunResult[];
}> {
  const res = await fetch(buildApiUrl('/api/agent/benchmark'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Benchmark suite failed');
  return res.json();
}
