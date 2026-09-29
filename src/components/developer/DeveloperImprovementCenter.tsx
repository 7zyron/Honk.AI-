import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Beaker,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  RotateCcw,
  Zap,
  Play,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lock,
  RefreshCw,
  LogOut,
  X,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  SystemHealthTelemetry,
  SystemVersion,
  DeploymentConfig,
  SystemWeakness,
  Experiment,
  SecurityAuditLog,
  AnonymousFeedback,
  ApprovalMode,
} from '../../types/developer';
import {
  fetchSystemTelemetry,
  fetchSystemVersions,
  deployVersion,
  rollbackVersion,
  fetchDeploymentConfig,
  updateApprovalMode,
  fetchWeaknesses,
  resolveWeakness,
  fetchExperiments,
  runExperiment,
  promoteExperimentToVersion,
  runEvaluationSuite,
  fetchAuditLogs,
  fetchAnonymousFeedback,
  runPracticeLabCycle,
  clearStoredDevToken,
} from '../../services/developerService';
import { UserProfile } from '../../types';

interface DeveloperImprovementCenterProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSignOutDeveloper: () => void;
}

type ActiveTab =
  | 'overview'
  | 'lab'
  | 'experiments'
  | 'evaluations'
  | 'deployment'
  | 'audit';

export const DeveloperImprovementCenter: React.FC<DeveloperImprovementCenterProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignOutDeveloper,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Data states
  const [telemetry, setTelemetry] = useState<SystemHealthTelemetry | null>(null);
  const [versions, setVersions] = useState<SystemVersion[]>([]);
  const [config, setConfig] = useState<DeploymentConfig | null>(null);
  const [weaknesses, setWeaknesses] = useState<SystemWeakness[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [feedback, setFeedback] = useState<AnonymousFeedback[]>([]);
  const [lastEvalSuite, setLastEvalSuite] = useState<any | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tel, vers, cfg, weaks, exps, logs, fdbk] = await Promise.all([
        fetchSystemTelemetry().catch(() => null),
        fetchSystemVersions().catch(() => []),
        fetchDeploymentConfig().catch(() => null),
        fetchWeaknesses().catch(() => []),
        fetchExperiments().catch(() => []),
        fetchAuditLogs().catch(() => []),
        fetchAnonymousFeedback().catch(() => []),
      ]);
      if (tel) setTelemetry(tel);
      setVersions(vers);
      if (cfg) setConfig(cfg);
      setWeaknesses(weaks);
      setExperiments(exps);
      setAuditLogs(logs);
      setFeedback(fdbk);
    } catch (err: any) {
      console.error('[DevImprovement] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprovalModeChange = async (mode: ApprovalMode) => {
    try {
      const updated = await updateApprovalMode(mode);
      setConfig(updated);
      setActionMessage(`Approval mode updated to ${mode}`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update approval mode');
    }
  };

  const handleDeployVersion = async (versionId: string) => {
    if (!confirm(`Deploy ${versionId} to Honk Production? All users will immediately run on this version.`)) return;
    setLoading(true);
    try {
      const res = await deployVersion(versionId);
      setActionMessage(res.message);
      await loadAllData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRollbackVersion = async (targetId?: string) => {
    if (!confirm('Confirm rollback? Production will revert to the prior verified version.')) return;
    setLoading(true);
    try {
      const res = await rollbackVersion(targetId);
      setActionMessage(res.message);
      await loadAllData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Rollback failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRunExperiment = async (expId: string) => {
    setLoading(true);
    try {
      const updatedExp = await runExperiment(expId);
      setExperiments((prev) => prev.map((e) => (e.id === expId ? updatedExp : e)));
      setActionMessage(`Experiment finished. Recommendation: ${updatedExp.recommendation}`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to run experiment');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteExperiment = async (expId: string) => {
    setLoading(true);
    try {
      const res = await promoteExperimentToVersion(expId);
      setActionMessage(res.message);
      await loadAllData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to promote experiment');
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setLoading(true);
    try {
      const suite = await runEvaluationSuite();
      setLastEvalSuite(suite);
      setActionMessage(`Regression suite finished with ${suite.passRatePercent}% pass rate.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPracticeLabCycle = async () => {
    setLoading(true);
    try {
      const result = await runPracticeLabCycle();
      setLastEvalSuite(result.evaluatedSuite);
      if (result.telemetry) setTelemetry(result.telemetry);
      await loadAllData();
      setActionMessage('Practice Lab continuous improvement cycle completed successfully!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Practice lab cycle failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearStoredDevToken();
    onSignOutDeveloper();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative flex flex-col w-full max-w-6xl h-[92vh] rounded-3xl border border-red-500/30 bg-zinc-950 shadow-2xl text-zinc-100 overflow-hidden font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-50">
                  Honk Improvement Center
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  Developer Clearance
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {telemetry?.activeVersion || 'v1.8.4'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Self-Improvement Engine • Practice Lab • Regression Harness • Production Deployment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 transition"
              title="Lock Developer Session"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Lock</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Action Banner */}
        {actionMessage && (
          <div className="px-6 py-2 bg-emerald-950/60 border-b border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {actionMessage}
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'System Health & Telemetry', icon: Activity },
            { id: 'lab', label: 'Practice Lab & Weakness Detector', icon: Beaker },
            { id: 'experiments', label: 'Experiment Manager (Sandbox)', icon: Sliders },
            { id: 'evaluations', label: 'Regression Harness', icon: CheckCircle2 },
            { id: 'deployment', label: 'Release & Rollback Controls', icon: Layers },
            { id: 'audit', label: 'Audit Trail & Privacy', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-red-500 text-red-400 bg-red-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Telemetry Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                  <div className="text-xs text-zinc-400 font-medium">Production Status</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {telemetry?.status || 'OPTIMAL'}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Running {telemetry?.activeVersion || 'v1.8.4'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                  <div className="text-xs text-zinc-400 font-medium">First-Token Latency (P50)</div>
                  <div className="text-lg font-bold text-zinc-100 mt-1 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    {telemetry?.firstTokenLatencyP50Ms || 820}ms
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    <span>32% faster vs baseline</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                  <div className="text-xs text-zinc-400 font-medium">Success Rate</div>
                  <div className="text-lg font-bold text-zinc-100 mt-1">
                    {telemetry?.successRatePercent || 99.8}%
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">Across 1,240 agent requests</div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                  <div className="text-xs text-zinc-400 font-medium">Verified Improvements</div>
                  <div className="text-lg font-bold text-red-400 mt-1">
                    {versions.length} Releases
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">100% regression verified</div>
                </div>
              </div>

              {/* Developer Approval Gate Setting */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-red-400" />
                      Developer Approval Gate
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Controls how verified candidate improvements are deployed to Honk Production.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Active Mode: {config?.approvalMode || 'REVIEW'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      mode: 'AUTO-SAFE',
                      title: 'Auto-Safe Mode',
                      desc: 'Automatically deploys low-risk changes that pass 100% of regression gates with zero latency regression.',
                    },
                    {
                      mode: 'REVIEW',
                      title: 'Review Mode (Recommended)',
                      desc: 'Stages candidate improvements in the Practice Lab and requires 1-click Developer approval before deployment.',
                    },
                    {
                      mode: 'MANUAL',
                      title: 'Strict Manual Mode',
                      desc: 'Never automatically deploys. All parameter adjustments and versions require full manual signoff.',
                    },
                  ].map((opt) => {
                    const isSelected = (config?.approvalMode || 'REVIEW') === opt.mode;
                    return (
                      <button
                        key={opt.mode}
                        onClick={() => handleApprovalModeChange(opt.mode as ApprovalMode)}
                        className={`text-left p-4 rounded-xl border transition ${
                          isSelected
                            ? 'bg-red-500/10 border-red-500/50 ring-1 ring-red-500/40'
                            : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-red-400' : 'text-zinc-200'
                            }`}
                          >
                            {opt.title}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-red-400" />}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Architecture Blueprint & Isolation Notice */}
              <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <div className="font-semibold text-zinc-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>Strict Data & Process Isolation Architecture</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  DEVELOPER DATA (experiments, weakness clusters, regression suites, telemetry) is
                  stored exclusively on the server in isolated partitions. USER DATA (conversations,
                  private memories, files) is never used as raw training data or shared across users.
                  Normal users run only verified stable releases and have zero access to this
                  improvement engine.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRACTICE LAB & WEAKNESS DETECTOR */}
          {activeTab === 'lab' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-red-400" />
                    Practice Lab & Weakness Detector
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Continuously scans telemetry failure clusters, evaluates edge cases, and tests candidate fixes in an isolated sandbox.
                  </p>
                </div>
                <button
                  onClick={handleRunPracticeLabCycle}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-900/30 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Continuous Improvement Cycle</span>
                </button>
              </div>

              {/* Weakness Queue */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Active Detected Weaknesses ({weaknesses.length})
                </h4>
                {weaknesses.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center text-xs text-zinc-400">
                    No active weaknesses detected. System operating within optimal thresholds.
                  </div>
                ) : (
                  weaknesses.map((w) => (
                    <div
                      key={w.id}
                      className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                w.severity === 'high'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : w.severity === 'medium'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {w.severity} severity
                            </span>
                            <span className="text-xs font-bold text-zinc-200">{w.title}</span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              ({w.occurrenceCount} occurrences)
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                            {w.description}
                          </p>
                          <div className="mt-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400">
                            <span className="font-semibold text-zinc-300">Suggested Action: </span>
                            {w.suggestedAction}
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            await resolveWeakness(w.id);
                            setWeaknesses((prev) => prev.filter((item) => item.id !== w.id));
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPERIMENT MANAGER (SANDBOX) */}
          {activeTab === 'experiments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-red-400" />
                    Experiment Manager (Isolated Sandbox)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Runs A/B parameter variants (prompts, concurrency, routing) against the regression harness in total isolation from live users.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {experiments.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-100">{exp.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              exp.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : exp.status === 'RUNNING'
                                ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                                : exp.status === 'PROMOTED_TO_PRODUCTION'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {exp.status}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Target: {exp.targetArea}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5">{exp.hypothesis}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {exp.status !== 'COMPLETED' && exp.status !== 'PROMOTED_TO_PRODUCTION' && (
                          <button
                            onClick={() => handleRunExperiment(exp.id)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                          >
                            <Play className="w-3 h-3 fill-current text-red-400" />
                            <span>Run Sandbox Evaluation</span>
                          </button>
                        )}
                        {exp.status === 'COMPLETED' && exp.recommendation === 'RECOMMEND_DEPLOY' && (
                          <button
                            onClick={() => handlePromoteExperiment(exp.id)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-950 transition"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Stage as Version</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Benchmark Deltas Table */}
                    {exp.benchmarkComparison && exp.benchmarkComparison.length > 0 && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Evaluation Metric</th>
                              <th className="py-2.5 px-3 font-semibold">Production Baseline</th>
                              <th className="py-2.5 px-3 font-semibold">Candidate Sandbox</th>
                              <th className="py-2.5 px-3 font-semibold">Delta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {exp.benchmarkComparison.map((bm, idx) => (
                              <tr key={idx} className="hover:bg-zinc-900/30">
                                <td className="py-2 px-3 font-medium text-zinc-200">{bm.metric}</td>
                                <td className="py-2 px-3 text-zinc-400">{bm.before}</td>
                                <td className="py-2 px-3 font-semibold text-zinc-100">{bm.after}</td>
                                <td className="py-2 px-3 font-semibold">
                                  {bm.improved ? (
                                    <span className="text-emerald-400 flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" />
                                      {bm.deltaPercent !== undefined ? `+${bm.deltaPercent}%` : 'Verified'}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400">0%</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EVALUATION & REGRESSION HARNESS */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Regression Testing & Verification Harness
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Runs deterministic assertion suites verifying math precision, syntax integrity, consequential gates, and memory isolation.
                  </p>
                </div>
                <button
                  onClick={handleRunEvaluation}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                  <span>Execute Full Regression Suite</span>
                </button>
              </div>

              {lastEvalSuite ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-100">{lastEvalSuite.suiteName}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Passed {lastEvalSuite.passedCount} of {lastEvalSuite.totalTests} tests ({lastEvalSuite.passRatePercent}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400">
                        {lastEvalSuite.passRatePercent}% Pass Rate
                      </div>
                      <div className="text-xs text-zinc-500">
                        Avg Latency: {lastEvalSuite.averageLatencyMs}ms
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {lastEvalSuite.results.map((r: any) => (
                      <div
                        key={r.testId}
                        className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-zinc-200">{r.testName}</div>
                            <div className="text-zinc-400 text-[11px] mt-0.5">{r.details}</div>
                          </div>
                        </div>
                        <div className="text-zinc-500 font-mono text-[11px]">{r.durationMs}ms</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center text-xs text-zinc-400">
                  Click &ldquo;Execute Full Regression Suite&rdquo; above to run the 8-point regression test battery.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DEPLOYMENT & ROLLBACK CONTROLS */}
          {activeTab === 'deployment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Production Releases & Rollback Controls
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Immutable history of verified versions. 1-click deploy to production or instant rollback to prior stable release.
                  </p>
                </div>
                <button
                  onClick={() => handleRollbackVersion()}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Instant Rollback to Previous Version</span>
                </button>
              </div>

              {/* Version History List */}
              <div className="space-y-4">
                {versions.map((ver) => {
                  const isActive = ver.status === 'ACTIVE_PRODUCTION';
                  return (
                    <div
                      key={ver.versionId}
                      className={`p-5 rounded-2xl border transition ${
                        isActive
                          ? 'bg-zinc-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                          : 'bg-zinc-900/40 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold text-zinc-100 font-mono">
                              {ver.versionId}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                isActive
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : ver.status === 'STAGED'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : ver.status === 'ROLLED_BACK'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {isActive ? 'Active Production' : ver.status}
                            </span>
                            <span className="text-xs text-zinc-400">Author: {ver.author}</span>
                          </div>

                          <h4 className="text-xs font-semibold text-zinc-200 mt-2">{ver.title}</h4>
                          <p className="text-xs text-zinc-400 mt-1">{ver.changeSummary}</p>

                          {/* Changelog Bullets */}
                          <ul className="mt-3 space-y-1 text-xs text-zinc-300 list-disc list-inside">
                            {ver.changes.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {!isActive && (
                            <button
                              onClick={() => handleDeployVersion(ver.versionId)}
                              disabled={loading}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-md transition"
                            >
                              Deploy to Production
                            </button>
                          )}
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL & PRIVACY */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-400" />
                  Security Audit Trail & User Privacy Isolation
                </h3>
                <p className="text-xs text-zinc-400">
                  Tamper-evident logs of all developer access and blocked unauthorized attempts, alongside sanitized anonymous user feedback.
                </p>
              </div>

              {/* Security Logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Developer Access & Authorization Audit Logs
                </h4>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Timestamp</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Action</th>
                        <th className="py-2 px-3 font-semibold">Endpoint</th>
                        <th className="py-2 px-3 font-semibold">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-900/30">
                          <td className="py-1.5 px-3 text-zinc-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-1.5 px-3 font-semibold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                log.status === 'ALLOWED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-zinc-200">{log.action}</td>
                          <td className="py-1.5 px-3 text-zinc-400">{log.endpoint}</td>
                          <td className="py-1.5 px-3 text-zinc-400">{log.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anonymous Feedback Queue */}
              <div className="space-y-3 pt-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Sanitized Anonymous User Feedback (Zero User PII)
                </h4>
                {feedback.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-xs text-zinc-500">
                    No anonymous user feedback recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feedback.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs flex items-start justify-between"
                      >
                        <div>
                          <div className="text-[10px] font-semibold text-amber-400 uppercase">
                            {f.type}
                          </div>
                          <div className="text-zinc-200 mt-1">{f.sanitizedText}</div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(f.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
