/**
 * Honk AI Agent Architecture - Core Type Definitions
 * Complete contract for Reasoning Engine, Tool Manager, Memory, Verification & Worker Swarm
 */

export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'heavy';

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
  toolParams?: Record<string, unknown>;
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
  complexity: TaskComplexity;
  constraints: string[];
  subtasks: SubTask[];
  estimatedTimeMs?: number;
  requiresConfirmation?: boolean;
  consequentialAction?: {
    actionType: string;
    description: string;
    targetResource: string;
  };
}

export interface ToolParameterSchema {
  type: string;
  description: string;
  properties?: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    required?: boolean;
  }>;
  required?: string[];
}

export interface ToolExecutionContext {
  taskId: string;
  userId: string;
  isHeavyTask: boolean;
  signal?: AbortSignal;
  taskMemory: Map<string, unknown>;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  cached?: boolean;
  requiresPermission?: boolean;
  permissionDetails?: {
    actionId: string;
    actionType: string;
    description: string;
    consequence: string;
  };
}

export interface AgentTool {
  name: string;
  displayName: string;
  description: string;
  category: 'research' | 'code' | 'data' | 'system' | 'planning' | 'verification';
  parameters: ToolParameterSchema;
  isConsequential?: boolean;
  timeoutMs?: number;
  execute: (params: Record<string, unknown>, context: ToolExecutionContext) => Promise<ToolResult>;
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
  confidenceScore: number; // 0 - 100
  checks: VerificationCheck[];
  correctionsAttempted: number;
  correctionsApplied: string[];
  timestamp: number;
}

export type MemoryLayer = 'short_term' | 'long_term' | 'task' | 'project';

export interface MemoryEntry {
  id: string;
  userId: string;
  layer: MemoryLayer;
  type: 'preference' | 'fact' | 'instruction' | 'project';
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
  projectId?: string;
  sourceConvoId?: string;
  confidence: number;
}

export interface MemoryPreferences {
  enabled: boolean;
  allowPersonalization: boolean;
  allowFactExtraction: boolean;
}

export interface WorkerOutput {
  worker: WorkerRole;
  taskTitle: string;
  summary: string;
  outputData: unknown;
  durationMs: number;
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

export type AgentEventType =
  | 'stage_change'
  | 'plan_created'
  | 'subtask_start'
  | 'subtask_update'
  | 'subtask_complete'
  | 'tool_start'
  | 'tool_end'
  | 'worker_active'
  | 'verification_start'
  | 'verification_result'
  | 'correction_applied'
  | 'permission_required'
  | 'delta'
  | 'complete'
  | 'error';

export interface AgentStreamEvent {
  type: AgentEventType;
  taskId: string;
  stage?: AgentStage;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface AgentExecutionRequest {
  taskId?: string;
  userPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  isHeavyTask?: boolean;
  userId?: string;
  projectId?: string;
  userPreferences?: Record<string, unknown>;
  confirmedActions?: string[];
  preferredModel?: string;
}

export interface AgentBenchmarkTask {
  id: string;
  name: string;
  category: 'reasoning' | 'coding' | 'math' | 'research' | 'verification' | 'multi_step' | 'tool_use';
  prompt: string;
  expectedValidator: (resultText: string, metadata: AgentMetrics) => { passed: boolean; reason?: string };
  difficulty: 'simple' | 'medium' | 'complex' | 'heavy';
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
