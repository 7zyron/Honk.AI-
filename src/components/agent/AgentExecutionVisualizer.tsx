import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Code2,
  Search,
  BarChart3,
  FileCheck2,
  Workflow,
  Sparkles,
} from 'lucide-react';
import {
  AgentStage,
  AgentPlan,
  VerificationReport,
  AgentMetrics,
} from '../../types/agent';

interface AgentExecutionVisualizerProps {
  currentStage?: AgentStage;
  plan?: AgentPlan | null;
  verificationReport?: VerificationReport | null;
  metrics?: AgentMetrics | null;
  isExecuting?: boolean;
  onAuthorizeAction?: (actionType: string) => void;
  permissionRequest?: {
    actionType: string;
    description: string;
    targetResource: string;
  } | null;
}

const STAGES: Array<{ key: AgentStage; label: string }> = [
  { key: 'understand', label: 'Analyzing' },
  { key: 'plan', label: 'Planning' },
  { key: 'gather', label: 'Gathering' },
  { key: 'execute', label: 'Executing' },
  { key: 'verify', label: 'Verifying' },
  { key: 'complete', label: 'Finalizing' },
];

export const AgentExecutionVisualizer: React.FC<AgentExecutionVisualizerProps> = ({
  currentStage,
  plan,
  verificationReport,
  metrics,
  isExecuting,
  onAuthorizeAction,
  permissionRequest,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!plan && !isExecuting && !metrics) return null;

  const currentStageIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="my-3 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 text-xs text-zinc-300 shadow-md backdrop-blur-sm transition-all">
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Cpu className="h-3 w-3" />
          </div>
          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
            Honk Agent Orchestrator
            {isExecuting && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300 font-medium animate-pulse border border-amber-500/30">
                Running
              </span>
            )}
            {!isExecuting && metrics && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300 font-medium border border-emerald-500/30">
                Verified
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {metrics && (
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(metrics.totalDurationMs / 1000).toFixed(1)}s
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title={isExpanded ? 'Collapse trace' : 'Expand trace'}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Stage Stepper Pipeline */}
      <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 pb-1">
        {STAGES.map((s, idx) => {
          const isDone = !isExecuting || (currentStageIndex > idx);
          const isCurrent = isExecuting && currentStage === s.key;
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isCurrent
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400 animate-pulse ring-2 ring-amber-500/20'
                      : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className={`mt-1 text-[10px] font-medium tracking-tight ${
                    isCurrent ? 'text-amber-300 font-bold' : isDone ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-full -mt-3.5 transition-colors ${
                    isDone ? 'bg-emerald-500/40' : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Collapsible Details */}
      {isExpanded && (
        <div className="mt-2.5 space-y-2 border-t border-zinc-800/80 pt-2">
          {/* Subtasks from Plan */}
          {plan && plan.subtasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Workflow className="h-3 w-3 text-zinc-400" />
                Execution Plan ({plan.subtasks.length} Subtasks)
              </span>
              <div className="space-y-1">
                {plan.subtasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md bg-zinc-900/80 px-2 py-1.5 border border-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      ) : task.status === 'running' ? (
                        <Cpu className="h-3.5 w-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-[11px] font-medium text-zinc-200">{task.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <span className="flex items-center gap-1 text-purple-300">
                            {task.assignedWorker === 'researcher' && <Search className="h-2.5 w-2.5" />}
                            {task.assignedWorker === 'coder' && <Code2 className="h-2.5 w-2.5" />}
                            {task.assignedWorker === 'analyst' && <BarChart3 className="h-2.5 w-2.5" />}
                            {task.assignedWorker === 'tester' && <FileCheck2 className="h-2.5 w-2.5" />}
                            Worker: {task.assignedWorker.toUpperCase()}
                          </span>
                          {task.parallelSafe && (
                            <span className="rounded bg-sky-500/10 px-1 text-[9px] text-sky-400 border border-sky-500/20">
                              Parallel Safe
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {task.executionTimeMs !== undefined && (
                      <span className="text-[10px] text-zinc-400">
                        {(task.executionTimeMs / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permission Prompt for Consequential Actions */}
          {permissionRequest && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-2.5 text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Authorization Required: Consequential Action</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-200/90">{permissionRequest.description}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onAuthorizeAction?.(permissionRequest.actionType)}
                  className="rounded bg-amber-500 px-2.5 py-1 text-xs font-semibold text-black hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Authorize Execution
                </button>
              </div>
            </div>
          )}

          {/* Verification Results */}
          {verificationReport && (
            <div className="rounded-md bg-zinc-900/60 p-2 border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Self-Verification Checklist
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {verificationReport.confidenceScore}% Confidence
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {verificationReport.checks.map((chk) => (
                  <div key={chk.id} className="flex items-center gap-1.5 text-[10px]">
                    <span className={chk.passed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {chk.passed ? '✓' : '⚠'}
                    </span>
                    <span className="text-zinc-300">{chk.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics summary */}
          {metrics && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">
                <Sparkles className="h-2.5 w-2.5 text-amber-400" /> Model: {metrics.modelUsed}
              </span>
              <span className="rounded bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">
                Tools Used: {metrics.toolsUsedCount}
              </span>
              <span className="rounded bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">
                Parallel Ops: {metrics.parallelOperationsCount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
