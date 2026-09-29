import { LatencyTimings } from '../types';

/**
 * Calculates human-readable latency diagnosis and logs timings in development mode.
 */
export function computeAndLogTimings(timings: LatencyTimings, isDev: boolean = true): LatencyTimings {
  const t0 = timings.t0_sendClicked;
  const t1 = timings.t1_requestCreated;
  const t2 = timings.t2_backendReceived;
  const t3 = timings.t3_aiRequestStarted;
  const t4 = timings.t4_firstAiToken;
  const t5 = timings.t5_firstChunkReceived;
  const t6 = timings.t6_firstTokenRendered || t5;
  const t7 = timings.t7_streamCompleted || t6;

  const clientRequestPrepMs = Math.max(0, Math.round(t1 - t0));
  const frontendToBackendMs = t2 ? Math.max(0, Math.round(t2 - t1)) : undefined;
  const backendToAiMs = t2 && t3 ? Math.max(0, Math.round(t3 - t2)) : undefined;
  const aiGenerationMs = t3 && t4 ? Math.max(0, Math.round(t4 - t3)) : undefined;
  const backendToFrontendMs = t4 && t5 ? Math.max(0, Math.round(t5 - t4)) : undefined;
  const domRenderMs = Math.max(0, Math.round(t6 - t5));
  const ttftMs = Math.max(0, Math.round(t5 - t0));
  const firstRenderMs = Math.max(0, Math.round(t6 - t0));
  const totalDurationMs = Math.max(0, Math.round(t7 - t0));

  // Determine primary latency bottleneck
  let bottleneck = 'Normal Provider Latency';
  if (aiGenerationMs && aiGenerationMs > 1500) {
    bottleneck = 'AI Provider Generation (LLM TTFT)';
  } else if (frontendToBackendMs && frontendToBackendMs > 300) {
    bottleneck = 'Network Latency (Frontend → Backend)';
  } else if (domRenderMs > 80) {
    bottleneck = 'Browser DOM Rendering';
  } else if (backendToFrontendMs && backendToFrontendMs > 300) {
    bottleneck = 'Network Streaming Latency (Backend → Frontend)';
  } else if (ttftMs < 1000) {
    bottleneck = 'P0 Target Achieved (<1.0s Ultra-Fast)';
  } else if (ttftMs < 2000) {
    bottleneck = 'P1 Target Achieved (<2.0s Fast)';
  }

  const result: LatencyTimings = {
    ...timings,
    clientRequestPrepMs,
    frontendToBackendMs,
    backendToAiMs,
    aiGenerationMs,
    backendToFrontendMs,
    domRenderMs,
    ttftMs,
    firstRenderMs,
    totalDurationMs,
    bottleneck,
  };

  if (isDev) {
    console.log(
      `%c[HONK PERFORMANCE LATENCY AUDIT] ⚡
1. Send button → request created: ${clientRequestPrepMs}ms
2. Frontend → backend: ${frontendToBackendMs !== undefined ? `${frontendToBackendMs}ms` : 'N/A'}
3. Backend → AI provider: ${backendToAiMs !== undefined ? `${backendToAiMs}ms` : 'N/A'}
4. First AI token generated: ${aiGenerationMs !== undefined ? `${aiGenerationMs}ms` : 'N/A'}
5. Backend → frontend: ${backendToFrontendMs !== undefined ? `${backendToFrontendMs}ms` : 'N/A'}
6. First token rendered: ${domRenderMs}ms
───────────────────────────────────
⚡ Time to First Token (TTFT): ${ttftMs}ms
🎨 First Visible Render: ${firstRenderMs}ms
🏁 Total Response Time: ${totalDurationMs}ms
📍 Primary Path: ${bottleneck}`,
      'color: #f59e0b; font-weight: bold; background: #18181b; padding: 6px 10px; border-radius: 6px;'
    );
  }

  return result;
}

export interface BenchmarkPromptResult {
  prompt: string;
  success: boolean;
  error?: string;
  responsePreview: string;
  requestLatencyMs: number; // frontend -> backend
  ttftMs: number; // Send to first token
  firstRenderMs: number; // Send to first visible text
  totalResponseTimeMs: number; // Total stream duration
  outputTokens: number;
  tokensPerSec: number;
  timings?: LatencyTimings;
}

export const BENCHMARK_PROMPTS = [
  'Hello',
  'What is 2+2?',
  'Explain AI in one sentence.',
];
