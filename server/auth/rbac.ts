import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

export type UserRole = 'USER' | 'DEVELOPER' | 'ADMIN';

export interface DeveloperSession {
  token: string;
  developerId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
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

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.honk_data') : path.join(process.cwd(), '.honk_data');
const DEV_DATA_DIR = path.join(DATA_DIR, 'developer');
const AUDIT_LOG_FILE = path.join(DEV_DATA_DIR, 'audit_logs.json');
const DEV_SESSIONS_FILE = path.join(DEV_DATA_DIR, 'developer_sessions.json');
const DEV_CONFIG_FILE = path.join(DEV_DATA_DIR, 'developer_config.json');

// Ensure isolated developer directories exist
function ensureDeveloperDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DEV_DATA_DIR)) {
      fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[RBAC] Could not create developer data directories:', err);
  }
}

// Master developer identity constants
const PRIMARY_DEVELOPER_EMAIL = '7.zyron@gmail.com';
const PRIMARY_DEVELOPER_NAME = 'Zyron';
const PRIMARY_DEVELOPER_ID = 'usr_zyron_developer';

// Server-side secret key for token signing (generated or read from env)
const SERVER_SIGNING_KEY = process.env.HONK_DEVELOPER_SECRET || 'honk_master_secret_zyron_dev_engine_2026';

export class RBACManager {
  private static instance: RBACManager;
  private sessions: Map<string, DeveloperSession> = new Map();
  private auditLogs: SecurityAuditLog[] = [];

  private constructor() {
    ensureDeveloperDirs();
    this.loadSessions();
    this.loadAuditLogs();
  }

  public static getInstance(): RBACManager {
    if (!RBACManager.instance) {
      RBACManager.instance = new RBACManager();
    }
    return RBACManager.instance;
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(DEV_SESSIONS_FILE)) {
        const data = fs.readFileSync(DEV_SESSIONS_FILE, 'utf-8');
        const list: DeveloperSession[] = JSON.parse(data);
        const now = Date.now();
        list.forEach((s) => {
          if (s.expiresAt > now) {
            this.sessions.set(s.token, s);
          }
        });
      }
    } catch (err) {
      console.error('[RBAC] Error loading developer sessions:', err);
    }
  }

  private saveSessions(): void {
    try {
      ensureDeveloperDirs();
      const list = Array.from(this.sessions.values());
      fs.writeFileSync(DEV_SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[RBAC] Error saving developer sessions:', err);
    }
  }

  private loadAuditLogs(): void {
    try {
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        const data = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
        this.auditLogs = JSON.parse(data);
      }
    } catch (err) {
      this.auditLogs = [];
    }
  }

  public recordAuditLog(entry: Omit<SecurityAuditLog, 'id'>): void {
    const log: SecurityAuditLog = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...entry,
    };
    this.auditLogs.unshift(log);
    // Keep last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }
    try {
      ensureDeveloperDirs();
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(this.auditLogs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[RBAC] Failed to write audit log:', err);
    }
  }

  public getAuditLogs(limit = 100): SecurityAuditLog[] {
    return this.auditLogs.slice(0, limit);
  }

  /**
   * Generates a signed developer token for an authenticated developer
   */
  public createDeveloperSession(email: string, name = PRIMARY_DEVELOPER_NAME): DeveloperSession | null {
    // Check if authorized developer email
    const cleanEmail = (email || '').trim().toLowerCase();
    const isPrimaryDeveloper = cleanEmail === PRIMARY_DEVELOPER_EMAIL || cleanEmail.includes('zyron');

    if (!isPrimaryDeveloper) {
      this.recordAuditLog({
        timestamp: Date.now(),
        endpoint: '/api/developer/auth/login',
        method: 'POST',
        ip: '127.0.0.1',
        userAgent: 'InternalAuth',
        userEmail: email,
        role: 'USER',
        action: 'DEVELOPER_LOGIN_ATTEMPT',
        status: 'DENIED',
        reason: 'Email is not recognized as a verified developer identity',
      });
      return null;
    }

    const tokenPayload = `${PRIMARY_DEVELOPER_ID}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    const signature = crypto
      .createHmac('sha256', SERVER_SIGNING_KEY)
      .update(tokenPayload)
      .digest('hex');
    const token = `honk_dev_${Buffer.from(tokenPayload).toString('base64url')}.${signature}`;

    const session: DeveloperSession = {
      token,
      developerId: PRIMARY_DEVELOPER_ID,
      email: PRIMARY_DEVELOPER_EMAIL,
      name,
      role: 'DEVELOPER',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    this.sessions.set(token, session);
    this.saveSessions();

    this.recordAuditLog({
      timestamp: Date.now(),
      endpoint: '/api/developer/auth/login',
      method: 'POST',
      ip: '127.0.0.1',
      userAgent: 'InternalAuth',
      userId: PRIMARY_DEVELOPER_ID,
      userEmail: PRIMARY_DEVELOPER_EMAIL,
      role: 'DEVELOPER',
      action: 'DEVELOPER_SESSION_CREATED',
      status: 'ALLOWED',
      reason: 'Cryptographic session issued for developer Zyron',
    });

    return session;
  }

  /**
   * Validates a developer token strictly on the server
   */
  public validateDeveloperToken(token: string | undefined): DeveloperSession | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const rawPayload = parts[0].startsWith('honk_dev_') ? parts[0].substring('honk_dev_'.length) : parts[0];
    const signature = parts[1];

    let decodedPayload = '';
    try {
      decodedPayload = Buffer.from(rawPayload, 'base64url').toString('utf-8');
    } catch {
      return null;
    }

    const expectedSig = crypto
      .createHmac('sha256', SERVER_SIGNING_KEY)
      .update(decodedPayload)
      .digest('hex');

    if (signature.length !== expectedSig.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      this.saveSessions();
      return null;
    }

    return session;
  }

  /**
   * Revokes a developer session
   */
  public revokeDeveloperSession(token: string): boolean {
    const existed = this.sessions.delete(token);
    if (existed) {
      this.saveSessions();
    }
    return existed;
  }
}

/**
 * Express Middleware: Strictly verifies authenticated developer identity on backend
 */
export function requireDeveloperAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const devTokenHeader = req.headers['x-dev-token'] as string | undefined;

  let token: string | undefined;
  if (devTokenHeader) {
    token = devTokenHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  const rbac = RBACManager.getInstance();
  const session = rbac.validateDeveloperToken(token);

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  if (!session || (session.role !== 'DEVELOPER' && session.role !== 'ADMIN')) {
    rbac.recordAuditLog({
      timestamp: Date.now(),
      endpoint: req.originalUrl || req.url,
      method: req.method,
      ip: clientIp,
      userAgent,
      userId: (req.headers['x-user-id'] as string) || undefined,
      role: 'USER',
      action: 'UNAUTHORIZED_DEVELOPER_ACCESS_ATTEMPT',
      status: 'DENIED',
      reason: 'Missing or invalid developer authorization credentials',
    });

    res.status(403).json({
      error: 'Access Denied: Developer clearance required.',
      code: 'ERR_FORBIDDEN_DEVELOPER_ONLY',
      notice: 'This incident has been securely logged to internal engineering telemetry.',
    });
    return;
  }

  // Attach verified developer session to request
  (req as any).developerSession = session;

  rbac.recordAuditLog({
    timestamp: Date.now(),
    endpoint: req.originalUrl || req.url,
    method: req.method,
    ip: clientIp,
    userAgent,
    userId: session.developerId,
    userEmail: session.email,
    role: session.role,
    action: `DEVELOPER_API_ACCESS: ${req.method} ${req.originalUrl || req.url}`,
    status: 'ALLOWED',
  });

  next();
}
