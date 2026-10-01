import {
  DeveloperSession,
  SystemHealthTelemetry,
  SystemVersion,
  DeploymentConfig,
  SystemWeakness,
  Experiment,
  SecurityAuditLog,
  AnonymousFeedback,
  ApprovalMode,
} from '../types/developer';
import { buildApiUrl } from '../config/api';

const DEV_TOKEN_KEY = 'honk_dev_auth_token_v1';

export function getStoredDevToken(): string | null {
  try {
    return sessionStorage.getItem(DEV_TOKEN_KEY) || localStorage.getItem(DEV_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredDevToken(token: string, persist = true): void {
  try {
    sessionStorage.setItem(DEV_TOKEN_KEY, token);
    if (persist) {
      localStorage.setItem(DEV_TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export function clearStoredDevToken(): void {
  try {
    sessionStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem(DEV_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredDevToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}`, 'x-dev-token': token } : {}),
  };
}

export async function loginDeveloper(email: string, secretKey?: string): Promise<{ success: boolean; session?: DeveloperSession; error?: string }> {
  try {
    const res = await fetch(buildApiUrl('/api/developer/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, secretKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Authentication rejected' };
    }
    if (data.token) {
      setStoredDevToken(data.token);
    }
    return { success: true, session: data.session };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to authenticate developer' };
  }
}

export async function verifyDeveloperSession(): Promise<DeveloperSession | null> {
  const token = getStoredDevToken();
  if (!token) return null;
  try {
    const res = await fetch(buildApiUrl('/api/developer/auth/verify'), {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearStoredDevToken();
      return null;
    }
    const data = await res.json();
    return data.session || null;
  } catch {
    return null;
  }
}

export async function fetchSystemTelemetry(): Promise<SystemHealthTelemetry> {
  const res = await fetch(buildApiUrl('/api/developer/telemetry'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export async function fetchSystemVersions(): Promise<SystemVersion[]> {
  const res = await fetch(buildApiUrl('/api/developer/versions'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch system versions');
  return res.json();
}

export async function deployVersion(versionId: string): Promise<{ success: boolean; message: string; version?: SystemVersion }> {
  const res = await fetch(buildApiUrl('/api/developer/versions/deploy'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ versionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to deploy version');
  return data;
}

export async function rollbackVersion(targetVersionId?: string): Promise<{ success: boolean; message: string; rolledBackTo?: SystemVersion }> {
  const res = await fetch(buildApiUrl('/api/developer/versions/rollback'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ targetVersionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to rollback version');
  return data;
}

export async function fetchDeploymentConfig(): Promise<DeploymentConfig> {
  const res = await fetch(buildApiUrl('/api/developer/config'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function updateApprovalMode(approvalMode: ApprovalMode): Promise<DeploymentConfig> {
  const res = await fetch(buildApiUrl('/api/developer/config'), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approvalMode }),
  });
  if (!res.ok) throw new Error('Failed to update approval mode');
  return res.json();
}

export async function fetchWeaknesses(): Promise<SystemWeakness[]> {
  const res = await fetch(buildApiUrl('/api/developer/weaknesses'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch weaknesses');
  return res.json();
}

export async function resolveWeakness(id: string): Promise<boolean> {
  const res = await fetch(buildApiUrl('/api/developer/weaknesses/resolve'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const res = await fetch(buildApiUrl('/api/developer/experiments'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch experiments');
  return res.json();
}

export async function createExperiment(params: {
  title: string;
  hypothesis: string;
  targetArea: Experiment['targetArea'];
  candidateConfig: any;
}): Promise<Experiment> {
  const res = await fetch(buildApiUrl('/api/developer/experiments/create'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create experiment');
  return data.experiment;
}

export async function runExperiment(experimentId: string): Promise<Experiment> {
  const res = await fetch(buildApiUrl(`/api/developer/experiments/${experimentId}/run`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to run experiment');
  return data.experiment;
}

export async function promoteExperimentToVersion(experimentId: string, versionTag?: string): Promise<{ success: boolean; message: string; version?: SystemVersion }> {
  const res = await fetch(buildApiUrl(`/api/developer/experiments/${experimentId}/promote`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ versionTag }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to promote experiment');
  return data;
}

export async function runEvaluationSuite(): Promise<any> {
  const res = await fetch(buildApiUrl('/api/developer/evaluations/run'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to run evaluation suite');
  return res.json();
}

export async function fetchAuditLogs(): Promise<SecurityAuditLog[]> {
  const res = await fetch(buildApiUrl('/api/developer/logs'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function fetchAnonymousFeedback(): Promise<AnonymousFeedback[]> {
  const res = await fetch(buildApiUrl('/api/developer/feedback'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch feedback');
  return res.json();
}

export async function runPracticeLabCycle(): Promise<any> {
  const res = await fetch(buildApiUrl('/api/developer/lab/cycle'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to run practice lab cycle');
  return data;
}
