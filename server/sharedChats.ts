import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { sanitizeTextResponse } from './sanitizer';
import { extractAuthIdentity } from './security';

export interface SharedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url?: string;
  }>;
}

export interface SharedChatRecord {
  shareId: string;
  conversationId: string;
  ownerId: string;
  ownerSecret: string;
  title: string;
  model: string;
  language: string;
  createdAt: number;
  revoked: boolean;
  revokedAt: number | null;
  messages: SharedChatMessage[];
}

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'shared_chats.json');

// In-memory cache backed by persistent file
const sharedChatsMap = new Map<string, SharedChatRecord>();

function loadDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed: SharedChatRecord[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.shareId) {
              sharedChatsMap.set(item.shareId, item);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[HONK SHARED CHATS] Failed to initialize database file:', err);
  }
}

function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const allRecords = Array.from(sharedChatsMap.values());
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(allRecords, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[HONK SHARED CHATS] Failed to write database file:', err);
  }
}

// Initialize on module load
loadDatabase();

/**
 * Generate a cryptographically secure, random URL-safe share ID.
 * 24 hex characters, completely non-sequential and unpredictable.
 */
export function generateSecureShareId(): string {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Generate a secret owner token for revocation authorization.
 */
export function generateOwnerSecret(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Sanitize conversation messages for public sharing:
 * - Strips sensitive credentials, system prompts, private tokens
 * - Keeps strictly displayable messages (user and assistant)
 */
function sanitizeConversationForSharing(rawMessages: any[]): SharedChatMessage[] {
  if (!Array.isArray(rawMessages)) return [];

  const sanitized: SharedChatMessage[] = [];

  for (const msg of rawMessages) {
    if (!msg || typeof msg !== 'object') continue;
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const rawContent = typeof msg.content === 'string' ? msg.content : '';

    // Strip API keys, auth tokens, system secrets
    const safeContent = sanitizeTextResponse(rawContent);

    // Filter attachments to only safe non-sensitive URLs or base64 previews
    let safeAttachments: Array<{ id: string; name: string; type: string; url?: string }> | undefined = undefined;
    if (Array.isArray(msg.attachments)) {
      safeAttachments = msg.attachments.map((att: any, idx: number) => ({
        id: String(att?.id || `att_${idx}`),
        name: String(att?.name || 'attachment').replace(/[\r\n]/g, ''),
        type: String(att?.type || 'file'),
        url: typeof att?.url === 'string' && att.url.startsWith('data:image/') ? att.url : undefined,
      }));
    }

    sanitized.push({
      id: String(msg.id || `msg_${sanitized.length + 1}`),
      role,
      content: safeContent,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
      model: typeof msg.model === 'string' ? msg.model : undefined,
      attachments: safeAttachments && safeAttachments.length > 0 ? safeAttachments : undefined,
    });
  }

  return sanitized;
}

/**
 * Handler: POST /api/shares
 * Creates a new shared conversation link
 */
export async function handleCreateShare(req: Request, res: Response): Promise<void> {
  try {
    const auth = extractAuthIdentity(req);
    const { conversationId, title, model, language, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Cannot share an empty conversation' });
      return;
    }

    const sanitizedMessages = sanitizeConversationForSharing(messages);
    if (sanitizedMessages.length === 0) {
      res.status(400).json({ error: 'No valid messages found to share' });
      return;
    }

    const shareId = generateSecureShareId();
    const ownerSecret = generateOwnerSecret();
    const safeTitle = typeof title === 'string' && title.trim()
      ? title.trim().slice(0, 150)
      : 'Honk AI Conversation';
    const safeModel = typeof model === 'string' ? model.slice(0, 50) : 'honk-flash';
    const safeLanguage = typeof language === 'string' ? language.slice(0, 20) : 'en-IN';

    const record: SharedChatRecord = {
      shareId,
      conversationId: typeof conversationId === 'string' ? conversationId : `convo_${Date.now()}`,
      ownerId: auth.userId,
      ownerSecret,
      title: safeTitle,
      model: safeModel,
      language: safeLanguage,
      createdAt: Date.now(),
      revoked: false,
      revokedAt: null,
      messages: sanitizedMessages,
    };

    sharedChatsMap.set(shareId, record);
    saveDatabase();

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const shareUrl = `${protocol}://${host}/share/${shareId}`;

    res.status(201).json({
      success: true,
      shareId,
      shareUrl,
      ownerSecret,
      createdAt: record.createdAt,
      messageCount: record.messages.length,
      title: record.title,
    });
  } catch (err) {
    console.error('[HONK SHARED CHATS] Error creating share:', err);
    res.status(500).json({ error: 'Failed to create share link. Please try again.' });
  }
}

/**
 * Handler: GET /api/shares/:shareId
 * Public read-only endpoint for visitors (no authentication required)
 */
export async function handleGetShare(req: Request, res: Response): Promise<void> {
  try {
    const { shareId } = req.params;

    // Direct search engine crawler avoidance
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');

    if (!shareId || !/^[a-f0-9]{20,32}$/i.test(shareId)) {
      res.status(404).json({ error: 'Invalid or malformed share ID' });
      return;
    }

    const record = sharedChatsMap.get(shareId.toLowerCase());
    if (!record) {
      res.status(404).json({ error: 'Shared conversation not found' });
      return;
    }

    if (record.revoked) {
      res.status(410).json({
        error: 'This shared conversation has been revoked by its author',
        revoked: true,
        revokedAt: record.revokedAt,
      });
      return;
    }

    // Identify if the viewer is the owner
    const auth = extractAuthIdentity(req);
    const clientSecret = req.headers['x-share-secret'] as string | undefined;
    const isOwner = auth.userId === record.ownerId || (clientSecret && clientSecret === record.ownerSecret);

    // NEVER return ownerId, ownerSecret, system prompts, or internal tokens to public
    res.json({
      shareId: record.shareId,
      conversationId: record.conversationId,
      title: record.title,
      model: record.model,
      language: record.language,
      createdAt: record.createdAt,
      messages: record.messages,
      isOwner: Boolean(isOwner),
    });
  } catch (err) {
    console.error('[HONK SHARED CHATS] Error fetching share:', err);
    res.status(500).json({ error: 'Failed to retrieve shared conversation.' });
  }
}

/**
 * Handler: GET /api/user/shares
 * Returns all shared links created by the current user
 */
export async function handleGetUserShares(req: Request, res: Response): Promise<void> {
  try {
    const auth = extractAuthIdentity(req);
    const userShares: Array<{
      shareId: string;
      conversationId: string;
      title: string;
      model: string;
      language: string;
      createdAt: number;
      revoked: boolean;
      revokedAt: number | null;
      messageCount: number;
    }> = [];

    for (const record of sharedChatsMap.values()) {
      if (record.ownerId === auth.userId) {
        userShares.push({
          shareId: record.shareId,
          conversationId: record.conversationId,
          title: record.title,
          model: record.model,
          language: record.language,
          createdAt: record.createdAt,
          revoked: record.revoked,
          revokedAt: record.revokedAt,
          messageCount: record.messages.length,
        });
      }
    }

    // Sort newest first
    userShares.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      shares: userShares,
    });
  } catch (err) {
    console.error('[HONK SHARED CHATS] Error fetching user shares:', err);
    res.status(500).json({ error: 'Failed to fetch your shared chats.' });
  }
}

/**
 * Handler: POST /api/shares/:shareId/revoke
 * Immediately invalidates the public share link
 */
export async function handleRevokeShare(req: Request, res: Response): Promise<void> {
  try {
    const { shareId } = req.params;
    const auth = extractAuthIdentity(req);
    const { ownerSecret } = req.body || {};

    if (!shareId) {
      res.status(400).json({ error: 'Share ID is required' });
      return;
    }

    const record = sharedChatsMap.get(shareId.toLowerCase());
    if (!record) {
      res.status(404).json({ error: 'Shared conversation not found' });
      return;
    }

    // Authorize: Must match owner user ID or provide matching ownerSecret
    const isAuthorized =
      record.ownerId === auth.userId ||
      (ownerSecret && ownerSecret === record.ownerSecret);

    if (!isAuthorized) {
      res.status(403).json({ error: 'You are not authorized to revoke this shared conversation' });
      return;
    }

    record.revoked = true;
    record.revokedAt = Date.now();
    saveDatabase();

    res.json({
      success: true,
      revoked: true,
      shareId: record.shareId,
      revokedAt: record.revokedAt,
      message: 'Share link has been revoked immediately. It is no longer accessible to visitors.',
    });
  } catch (err) {
    console.error('[HONK SHARED CHATS] Error revoking share:', err);
    res.status(500).json({ error: 'Failed to revoke shared chat.' });
  }
}
