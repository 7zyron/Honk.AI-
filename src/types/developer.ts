export type UserRole = 'USER' | 'DEVELOPER' | 'ADMIN';

export type ApprovalMode = 'AUTO-SAFE' | 'REVIEW' | 'MANUAL';

export interface DeveloperSession {
  token: string;
  developerId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}

export interface BenchmarkDelta {
  metric: string;
  before: number | string;
  after: number | string;
  unit: string;
  improved: boolean;
  deltaPercent?: number;
}

export interface SystemVersion {
  versionId: string;
  createdAt: number;
  author: string;
  status: 'ACTIVE_PRODUCTION' | 'STAGED' | 'ROLLED_BACK' | 'ARCHIVED';
  title: string;
  changeSummary: string;
  changes: string[];
  benchmarks: BenchmarkDelta[];
  regressionResults: {
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  config: {
    systemPromptVersion: string;
    temperature: number;
    modelRoutingWeights: Record<string, number>;
    verificationStrictness: 'balanced' | 'strict' | 'relaxed';
    maxWorkerConcurrency: number;
  };
  previousVersionId?: string;
  rolledBackAt?: number;
  deployedAt?: number;
}

export interface DeploymentConfig {
  approvalMode: ApprovalMode;
  activeVersionId: string;
  lastUpdated: number;
  autoDeployThreshold: {
    minPassRate: number;
    maxLatencyRegressionMs: number;
  };
}

export interface SystemWeakness {
  id: string;
  category: 'latency' | 'accuracy' | 'reasoning' | 'tool_selection' | 'prompt_adherence';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  detectedAt: number;
  occurrenceCount: number;
  samplePattern: string;
  suggestedAction: string;
}

export interface ExperimentVariant {
  variantId: string;
  name: string;
  description: string;
  config: {
    systemPromptVersion: string;
    temperature: number;
    modelRoutingWeights: Record<string, number>;
    verificationStrictness: 'balanced' | 'strict' | 'relaxed';
    maxWorkerConcurrency: number;
  };
  metrics?: {
    passRate: number;
    averageLatencyMs: number;
    syntaxErrorRate: number;
    tokenEfficiencyScore: number;
  };
}

export interface Experiment {
  id: string;
  title: string;
  hypothesis: string;
  targetArea: 'latency' | 'reasoning' | 'tool_selection' | 'prompt_adherence' | 'model_routing' | 'self_verification';
  createdAt: number;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'PROMOTED_TO_PRODUCTION';
  baseline: ExperimentVariant;
  candidate: ExperimentVariant;
  benchmarkComparison?: BenchmarkDelta[];
  evaluationResult?: {
    suiteId: string;
    suiteName: string;
    timestamp: number;
    totalTests: number;
    passedCount: number;
    failedCount: number;
    passRatePercent: number;
    averageLatencyMs: number;
    results: {
      testId: string;
      testName: string;
      category: string;
      passed: boolean;
      durationMs: number;
      details: string;
    }[];
  };
  recommendation?: 'RECOMMEND_DEPLOY' | 'FLAG_FOR_REVIEW' | 'REJECT';
  recommendationReason?: string;
  completedAt?: number;
}

export interface SystemHealthTelemetry {
  status: 'OPTIMAL' | 'DEGRADED' | 'MAINTENANCE';
  activeVersion: string;
  approvalMode: string;
  firstTokenLatencyP50Ms: number;
  firstTokenLatencyP99Ms: number;
  successRatePercent: number;
  uptimeSeconds: number;
  totalAgentRuns: number;
  verifiedImprovementsCount: number;
  activeWeaknessesCount: number;
  lastDeploymentTimestamp: number;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  role: string;
  action: string;
  status: 'ALLOWED' | 'DENIED' | 'FLAGGED';
  reason?: string;
}

export interface AnonymousFeedback {
  id: string;
  timestamp: number;
  category: string;
  sanitizedText: string;
  type: 'feature_request' | 'critique' | 'general';
}
