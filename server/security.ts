import { Request, Response, NextFunction } from 'express';
import { Capability, UsageRecord } from './types';
import { sanitizeErrorMessage } from './sanitizer';

// In-memory usage logs and limits
const capabilityUsageLogs: UsageRecord[] = [];
const CAPABILITY_DAILY_LIMITS: Record<Capability, number> = {
  [Capability.CHAT]: 100,
  [Capability.REASONING]: 80,
  [Capability.VISION]: 60,
  [Capability.IMAGE]: 1000000,
  [Capability.VIDEO]: 10,
  [Capability.APP_BUILDER]: 20,
  [Capability.DOCUMENT]: 50,
  [Capability.AUDIO]: 50,
  [Capability.TRANSLATION]: 150,
  [Capability.CODE]: 100,
  [Capability.PROMPT_ENHANCEMENT]: 150,
};

const userCapabilityCounts = new Map<string, { count: number; windowStart: number }>();
const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Extracts unified client ID or HONK_KEY token.
 */
export function extractAuthIdentity(req: Request): {
  userId: string;
  hasHonkKey: boolean;
  honkKey?: string;
} {
  const honkKeyHeader = req.headers['x-honk-key'] || req.headers['x-api-key'];
  if (typeof honkKeyHeader === 'string' && honkKeyHeader.trim()) {
    return {
      userId: `honk_user_${honkKeyHeader.trim().slice(-8)}`,
      hasHonkKey: true,
      honkKey: honkKeyHeader.trim(),
    };
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) {
      return {
        userId: `honk_token_${token.slice(-8)}`,
        hasHonkKey: true,
        honkKey: token,
      };
    }
  }

  const customUserId = req.headers['x-user-id'];
  if (typeof customUserId === 'string' && customUserId.trim()) {
    return {
      userId: customUserId.trim(),
      hasHonkKey: false,
    };
  }

  const ip = req.ip || req.socket.remoteAddress || 'guest_client';
  return {
    userId: `ip_${ip}`,
    hasHonkKey: false,
  };
}

/**
 * Enforces rate limiting per capability.
 */
export function checkCapabilityRateLimit(
  userId: string,
  capability: Capability
): { allowed: boolean; remaining: number; limit: number; resetAt: number } {
  const now = Date.now();
  const limitKey = `${userId}:${capability}`;
  let record = userCapabilityCounts.get(limitKey);

  const limit = CAPABILITY_DAILY_LIMITS[capability] || 100;

  if (!record || now - record.windowStart >= WINDOW_DURATION_MS) {
    record = { count: 0, windowStart: now };
    userCapabilityCounts.set(limitKey, record);
  }

  const allowed = record.count < limit;
  const remaining = Math.max(0, limit - record.count);
  const resetAt = record.windowStart + WINDOW_DURATION_MS;

  return { allowed, remaining, limit, resetAt };
}

/**
 * Sets the rate limit count for a user capability.
 */
export function setCapabilityRateLimit(userId: string, capability: Capability, count: number): void {
  const limitKey = `${userId}:${capability}`;
  let record = userCapabilityCounts.get(limitKey);
  if (!record) {
    record = { count: 0, windowStart: Date.now() };
    userCapabilityCounts.set(limitKey, record);
  }
  record.count = count;
}

/**
 * Increment capability usage after successful fulfillment.
 */
export function recordCapabilityUsage(
  userId: string,
  capability: Capability,
  latencyMs: number,
  status: 'success' | 'failure',
  model: string,
  tokenCount?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
) {
  const limitKey = `${userId}:${capability}`;
  const now = Date.now();
  let record = userCapabilityCounts.get(limitKey);

  if (!record || now - record.windowStart >= WINDOW_DURATION_MS) {
    record = { count: 0, windowStart: now };
    userCapabilityCounts.set(limitKey, record);
  }

  if (status === 'success') {
    record.count += 1;
  }

  const entry: UsageRecord = {
    userId,
    capability,
    timestamp: now,
    latencyMs,
    status,
    model,
    tokenCount,
  };

  capabilityUsageLogs.push(entry);

  // Keep last 1000 logs in memory for audit/performance monitoring
  if (capabilityUsageLogs.length > 1000) {
    capabilityUsageLogs.shift();
  }
}

/**
 * Express middleware for capability verification and rate limiting.
 */
export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId } = extractAuthIdentity(req);
    const check = checkCapabilityRateLimit(userId, capability);

    if (!check.allowed) {
      res.status(429).json({
        error: `Daily limit reached for ${capability}. Try again tomorrow.`,
        capability,
        limit: check.limit,
        remaining: 0,
        resetAt: check.resetAt,
      });
      return;
    }

    next();
  };
}

/**
 * Secure error responder that ensures no sensitive server internals or stack traces leak.
 */
export function sendSafeError(res: Response, err: unknown, defaultMessage?: string) {
  const parsed = sanitizeErrorMessage(err);
  if (defaultMessage && parsed.code === 500) {
    parsed.message = defaultMessage;
  }
  res.status(parsed.code).json({
    error: parsed.message,
    status: parsed.code,
  });
}
