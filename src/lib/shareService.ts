import { Message, SharedChatSummary, PublicSharedChat } from '../types';

const STORAGE_KEY_PREFIX = 'honk_user_shares_';

function getLocalSharesKey(userId?: string): string {
  if (!userId || userId.startsWith('guest_')) return 'honk_user_shares_guest';
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function getCachedUserShares(userId?: string): SharedChatSummary[] {
  try {
    const key = getLocalSharesKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedUserShares(shares: SharedChatSummary[], userId?: string): void {
  try {
    const key = getLocalSharesKey(userId);
    localStorage.setItem(key, JSON.stringify(shares));
  } catch (err) {
    console.error('Failed to cache user shares in localStorage:', err);
  }
}

/**
 * Creates a public share link for a conversation.
 * Sends request to backend API to store securely.
 */
export async function createSharedChat(
  params: {
    conversationId: string;
    title: string;
    model: string;
    language: string;
    messages: Message[];
  },
  userId?: string
): Promise<{
  success: boolean;
  shareId?: string;
  shareUrl?: string;
  ownerSecret?: string;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['x-user-id'] = userId;
    }

    const response = await fetch('/api/shares', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversationId: params.conversationId,
        title: params.title,
        model: params.model,
        language: params.language,
        messages: params.messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create share link',
      };
    }

    // Cache locally for immediate display in Privacy -> Shared Chats
    const cached = getCachedUserShares(userId);
    const newSummary: SharedChatSummary = {
      shareId: data.shareId,
      conversationId: params.conversationId,
      title: data.title || params.title,
      model: params.model,
      language: params.language,
      createdAt: data.createdAt || Date.now(),
      revoked: false,
      messageCount: data.messageCount || params.messages.length,
      shareUrl: data.shareUrl,
      ownerSecret: data.ownerSecret,
    };

    saveCachedUserShares([newSummary, ...cached.filter((s) => s.shareId !== data.shareId)], userId);

    return {
      success: true,
      shareId: data.shareId,
      shareUrl: data.shareUrl,
      ownerSecret: data.ownerSecret,
    };
  } catch (err) {
    console.error('Error creating shared chat:', err);
    return {
      success: false,
      error: 'Network connection failed while generating share link. Please check your connection and try again.',
    };
  }
}

/**
 * Fetches a shared chat by shareId (public or owner).
 */
export async function fetchSharedChat(
  shareId: string,
  ownerSecret?: string
): Promise<{
  success: boolean;
  data?: PublicSharedChat;
  revoked?: boolean;
  revokedAt?: number | null;
  notFound?: boolean;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {};
    if (ownerSecret) {
      headers['x-share-secret'] = ownerSecret;
    }

    const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}`, {
      method: 'GET',
      headers,
    });

    if (res.status === 410) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        revoked: true,
        revokedAt: body.revokedAt,
        error: 'This shared conversation has been revoked by its author or is no longer available.',
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        notFound: true,
        error: 'Shared conversation not found. The link may be incorrect or removed.',
      };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: body.error || 'Failed to load shared conversation.',
      };
    }

    const data: PublicSharedChat = await res.json();
    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error('Error fetching shared chat:', err);
    return {
      success: false,
      error: 'Network error loading conversation. Please check your internet connection and retry.',
    };
  }
}

/**
 * Fetches the user's shared chats list from backend.
 * Merges with local storage cache to preserve secrets.
 */
export async function fetchUserSharedChats(userId?: string): Promise<SharedChatSummary[]> {
  const cached = getCachedUserShares(userId);

  try {
    const headers: Record<string, string> = {};
    if (userId) {
      headers['x-user-id'] = userId;
    }

    const res = await fetch('/api/user/shares', {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      return cached;
    }

    const json = await res.json();
    if (json.success && Array.isArray(json.shares)) {
      // Merge with cached secrets
      const merged: SharedChatSummary[] = json.shares.map((remote: SharedChatSummary) => {
        const localMatch = cached.find((c) => c.shareId === remote.shareId);
        const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
        const host = typeof window !== 'undefined' ? window.location.host : '';
        const shareUrl = remote.shareUrl || `${protocol}//${host}/share/${remote.shareId}`;

        return {
          ...remote,
          ownerSecret: localMatch?.ownerSecret || remote.ownerSecret,
          shareUrl,
        };
      });

      saveCachedUserShares(merged, userId);
      return merged;
    }
    return cached;
  } catch (err) {
    console.error('Error fetching user shares from backend, using cache:', err);
    return cached;
  }
}

/**
 * Revokes a shared chat.
 */
export async function revokeSharedChat(
  shareId: string,
  ownerSecret?: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['x-user-id'] = userId;
    }

    const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}/revoke`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ownerSecret }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to revoke shared chat link.',
      };
    }

    // Update local cache
    const cached = getCachedUserShares(userId);
    const updated = cached.map((item) => {
      if (item.shareId === shareId) {
        return { ...item, revoked: true, revokedAt: Date.now() };
      }
      return item;
    });
    saveCachedUserShares(updated, userId);

    return { success: true };
  } catch (err) {
    console.error('Error revoking share:', err);
    return {
      success: false,
      error: 'Network failure while revoking link. Please try again.',
    };
  }
}
