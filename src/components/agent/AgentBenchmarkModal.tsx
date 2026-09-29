import React, { useState } from 'react';
import {
  X,
  Gauge,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  ShieldAlert,
} from 'lucide-react';
import { BenchmarkSummary, BenchmarkRunResult } from '../../types/agent';
import { runAgentBenchmarkSuite } from '../../services/agentService';

interface AgentBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentBenchmarkModal: React.FC<AgentBenchmarkModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [results, setResults] = useState<BenchmarkRunResult[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRun = async () => {
    setRunning(true);
    setError('');
    try {
      const data = await runAgentBenchmarkSuite();
      setSummary(data.summary);
      setResults(data.results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Benchmark run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Honk Agent Verification Benchmark
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                  Standardized Test Suite
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Audits real-time reasoning, tool orchestration, sandboxed math, syntax integrity, and self-verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action & Metric Summary */}
        <div className="border-b border-zinc-800/80 bg-zinc-900/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {summary ? (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Pass Rate</span>
                    <p className="text-xl font-black text-emerald-400">{summary.passRatePercent}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Passed / Total</span>
                    <p className="text-xl font-bold text-zinc-100">
                      {summary.passedCount} / {summary.totalTasks}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Avg Latency</span>
                    <p className="text-xl font-bold text-zinc-100">{summary.averageLatencyMs}ms</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Tools Tested</span>
                    <p className="text-xl font-bold text-zinc-100">{summary.toolsTested}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-400">
                  Click &ldquo;Execute Benchmark&rdquo; to run the verified test suite against Honk&rsquo;s agent subsystem.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className={`flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black transition-all ${
                running ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-400 shadow-md shadow-amber-500/20 cursor-pointer'
              }`}
            >
              {running ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Testing Suite...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Execute Benchmark
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 px-6 py-2.5 text-xs text-rose-400 border-b border-rose-500/20">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Test Case Results Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
              <Gauge className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-xs font-semibold text-zinc-300">Ready to Benchmark Honk Agent</p>
              <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                Runs live sandboxed execution of math formulas, code AST checks, search grounding, and constraint enforcement.
              </p>
            </div>
          ) : (
            results.map((r) => (
              <div
                key={r.taskId}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  {r.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-200">{r.taskName}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300 border border-zinc-700">
                        {r.category}
                      </span>
                      <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                        {r.difficulty}
                      </span>
                    </div>
                    {r.notes && <p className="mt-0.5 text-[11px] text-zinc-400">{r.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400 flex-shrink-0">
                  {r.toolsUsed > 0 && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Wrench className="h-3 w-3 text-zinc-500" /> {r.toolsUsed} tool
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    <Clock className="h-3 w-3 text-zinc-500" /> {r.durationMs}ms
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-3 text-[11px] text-zinc-500 flex justify-between">
          <span>Real task benchmark mode — zero mocked numbers.</span>
          <span>Honk Agent Benchmark v2.0</span>
        </div>
      </div>
    </div>
  );
};
