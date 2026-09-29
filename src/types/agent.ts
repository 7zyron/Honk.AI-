/**
 * Client-Side Honk AI Agent Architecture Types
 */

export type AgentStage =
  | 'understand'
  | 'plan'
  | 'gather'
  | 'execute'
  | 'observe'
  | 'verify'
  | 'correct'
  | 'complete';

export type WorkerRole =
  | 'planner'
  | 'researcher'
  | 'coder'
  | 'analyst'
  | 'tester'
  | 'reviewer';

export type SubTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked';

export interface SubTask {
  id: string;
  title: string;
  description: string;
  assignedWorker: WorkerRole;
  toolName?: string;
  dependsOn?: string[];
  parallelSafe: boolean;
  status: SubTaskStatus;
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
}

export interface AgentPlan {
  id: string;
  goal: string;
  complexity: 'simple' | 'medium' | 'complex' | 'heavy';
  constraints: string[];
  subtasks: SubTask[];
  requiresConfirmation?: boolean;
  consequentialAction?: {
    actionType: string;
    description: string;
    targetResource: string;
  };
}

export interface VerificationCheck {
  id: string;
  name: string;
  category: 'factual' | 'math' | 'code_syntax' | 'constraints' | 'consistency';
  passed: boolean;
  details: string;
  fixSuggested?: string;
}

export interface VerificationReport {
  overallPassed: boolean;
  confidenceScore: number;
  checks: VerificationCheck[];
  correctionsAttempted: number;
  correctionsApplied: string[];
  timestamp: number;
}

export interface AgentMetrics {
  totalDurationMs: number;
  planDurationMs: number;
  executionDurationMs: number;
  verificationDurationMs: number;
  toolsUsedCount: number;
  parallelOperationsCount: number;
  subtasksCompleted: number;
  subtasksTotal: number;
  verificationPassRate: number;
  modelUsed: string;
}

export interface AgentStreamEvent {
  type: string;
  taskId: string;
  stage?: AgentStage;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  layer: 'short_term' | 'long_term' | 'task' | 'project';
  type: 'preference' | 'fact' | 'instruction' | 'project';
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
  confidence: number;
}

export interface MemoryPreferences {
  enabled: boolean;
  allowPersonalization: boolean;
  allowFactExtraction: boolean;
}

export interface BenchmarkRunResult {
  taskId: string;
  taskName: string;
  category: string;
  difficulty: string;
  passed: boolean;
  durationMs: number;
  toolsUsed: number;
  notes?: string;
}

export interface BenchmarkSummary {
  totalTasks: number;
  passedCount: number;
  passRatePercent: number;
  averageLatencyMs: number;
  toolsTested: number;
  completedAt: number;
}
