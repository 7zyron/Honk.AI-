import fs from 'fs';
import path from 'path';

export type ApprovalMode = 'AUTO-SAFE' | 'REVIEW' | 'MANUAL';

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
    minPassRate: number; // e.g. 100
    maxLatencyRegressionMs: number; // e.g. 50ms
  };
}

const DEV_DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.honk_data', 'developer') : path.join(process.cwd(), '.honk_data', 'developer');
const VERSIONS_FILE = path.join(DEV_DATA_DIR, 'versions.json');
const CONFIG_FILE = path.join(DEV_DATA_DIR, 'deployment_config.json');

const INITIAL_PRODUCTION_VERSION: SystemVersion = {
  versionId: 'v1.8.4',
  createdAt: 1790160000000,
  author: 'Zyron',
  status: 'ACTIVE_PRODUCTION',
  title: 'Honk Production Baseline with Agent Swarm Core',
  changeSummary: 'Production release featuring multi-stage agent swarm orchestration and sandboxed verification.',
  changes: [
    'Integrated 6-worker swarm orchestration (Planner, Researcher, Coder, Analyst, Tester, Reviewer)',
    'Activated sandboxed JS VM code execution and deterministic math verification',
    'Enabled self-verification guardrails against numerical and syntax hallucination',
    'Enhanced context memory optimizer for persistent four-tier storage',
  ],
  benchmarks: [
    {
      metric: 'First-Token Latency',
      before: '1.8s',
      after: '1.2s',
      unit: 'seconds',
      improved: true,
      deltaPercent: 33.3,
    },
    {
      metric: 'Benchmark Pass Rate',
      before: '88%',
      after: '100%',
      unit: '%',
      improved: true,
      deltaPercent: 13.6,
    },
    {
      metric: 'Self-Verification Accuracy',
      before: '84%',
      after: '99.4%',
      unit: '%',
      improved: true,
      deltaPercent: 18.3,
    },
  ],
  regressionResults: {
    totalTests: 500,
    passed: 500,
    failed: 0,
    passRate: 100,
  },
  config: {
    systemPromptVersion: 'v1.8.4-agent-optimized',
    temperature: 0.7,
    modelRoutingWeights: {
      'honk-flash': 0.7,
      'honk-pro': 0.3,
    },
    verificationStrictness: 'strict',
    maxWorkerConcurrency: 4,
  },
  deployedAt: 1790160000000,
};

const DEFAULT_CONFIG: DeploymentConfig = {
  approvalMode: 'REVIEW',
  activeVersionId: 'v1.8.4',
  lastUpdated: Date.now(),
  autoDeployThreshold: {
    minPassRate: 100,
    maxLatencyRegressionMs: 50,
  },
};

export class VersionManager {
  private static instance: VersionManager;
  private versions: Map<string, SystemVersion> = new Map();
  private config: DeploymentConfig = DEFAULT_CONFIG;

  private constructor() {
    this.ensureDirs();
    this.loadData();
  }

  public static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  private ensureDirs(): void {
    try {
      if (!fs.existsSync(DEV_DATA_DIR)) {
        fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
      }
    } catch {}
  }

  private loadData(): void {
    try {
      this.ensureDirs();
      if (fs.existsSync(VERSIONS_FILE)) {
        const data = fs.readFileSync(VERSIONS_FILE, 'utf-8');
        const list: SystemVersion[] = JSON.parse(data);
        list.forEach((v) => this.versions.set(v.versionId, v));
      } else {
        this.versions.set(INITIAL_PRODUCTION_VERSION.versionId, INITIAL_PRODUCTION_VERSION);
        this.saveVersions();
      }

      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
      } else {
        this.saveConfig();
      }
    } catch (err) {
      console.error('[VersionManager] Load error:', err);
      this.versions.set(INITIAL_PRODUCTION_VERSION.versionId, INITIAL_PRODUCTION_VERSION);
    }
  }

  private saveVersions(): void {
    try {
      this.ensureDirs();
      const list = Array.from(this.versions.values()).sort((a, b) => b.createdAt - a.createdAt);
      fs.writeFileSync(VERSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[VersionManager] Save versions error:', err);
    }
  }

  private saveConfig(): void {
    try {
      this.ensureDirs();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[VersionManager] Save config error:', err);
    }
  }

  public getAllVersions(): SystemVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getActiveVersion(): SystemVersion {
    const active = this.versions.get(this.config.activeVersionId);
    return active || INITIAL_PRODUCTION_VERSION;
  }

  public getConfig(): DeploymentConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<DeploymentConfig>): DeploymentConfig {
    this.config = {
      ...this.config,
      ...updates,
      lastUpdated: Date.now(),
    };
    this.saveConfig();
    return this.config;
  }

  public createVersion(version: Omit<SystemVersion, 'status' | 'createdAt'>): SystemVersion {
    const active = this.getActiveVersion();
    const newVersion: SystemVersion = {
      ...version,
      createdAt: Date.now(),
      status: 'STAGED',
      previousVersionId: active.versionId,
    };
    this.versions.set(newVersion.versionId, newVersion);
    this.saveVersions();
    return newVersion;
  }

  /**
   * Deploys a staged or verified version directly to Production
   */
  public deployVersion(versionId: string): { success: boolean; version?: SystemVersion; message: string } {
    const target = this.versions.get(versionId);
    if (!target) {
      return { success: false, message: `Version ${versionId} not found.` };
    }

    // Archive current production version
    const currentActive = this.getActiveVersion();
    if (currentActive.versionId !== versionId) {
      currentActive.status = 'ARCHIVED';
      this.versions.set(currentActive.versionId, currentActive);
    }

    target.status = 'ACTIVE_PRODUCTION';
    target.deployedAt = Date.now();
    this.versions.set(target.versionId, target);

    this.config.activeVersionId = target.versionId;
    this.config.lastUpdated = Date.now();

    this.saveVersions();
    this.saveConfig();

    return {
      success: true,
      version: target,
      message: `Successfully deployed ${target.versionId} to Production! All users now run on verified ${target.versionId}.`,
    };
  }

  /**
   * Instantly rolls back to a prior verified version
   */
  public rollbackVersion(targetVersionId?: string): { success: boolean; rolledBackTo?: SystemVersion; message: string } {
    const current = this.getActiveVersion();
    const targetId = targetVersionId || current.previousVersionId;

    if (!targetId) {
      return { success: false, message: 'No prior rollback version recorded.' };
    }

    const target = this.versions.get(targetId);
    if (!target) {
      return { success: false, message: `Rollback target version ${targetId} not found.` };
    }

    current.status = 'ROLLED_BACK';
    current.rolledBackAt = Date.now();
    this.versions.set(current.versionId, current);

    target.status = 'ACTIVE_PRODUCTION';
    target.deployedAt = Date.now();
    this.versions.set(target.versionId, target);

    this.config.activeVersionId = target.versionId;
    this.config.lastUpdated = Date.now();

    this.saveVersions();
    this.saveConfig();

    return {
      success: true,
      rolledBackTo: target,
      message: `Successfully rolled back from ${current.versionId} to verified version ${target.versionId}.`,
    };
  }
}
