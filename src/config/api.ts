/**
 * Honk AI Central API Endpoint & Base URL Resolution Module
 * Supports configurable external production backend via NEXT_PUBLIC_HONK_API_URL / VITE_HONK_API_URL,
 * or relative endpoints for full-stack deployments and Vercel serverless handlers.
 */

export function getApiBaseUrl(): string {
  // Check runtime window.__ENV__ if present
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    const wEnv = (window as any).__ENV__;
    if (wEnv.NEXT_PUBLIC_HONK_API_URL) return wEnv.NEXT_PUBLIC_HONK_API_URL.replace(/\/+$/, '');
    if (wEnv.VITE_HONK_API_URL) return wEnv.VITE_HONK_API_URL.replace(/\/+$/, '');
  }

  // Check import.meta.env for Vite build-time environment variables
  try {
    const metaEnv = (import.meta as any).env || {};
    const url =
      metaEnv.NEXT_PUBLIC_HONK_API_URL ||
      metaEnv.VITE_HONK_API_URL ||
      metaEnv.VITE_API_URL ||
      metaEnv.APP_URL;

    if (url && typeof url === 'string' && url.trim() && !url.includes('undefined') && url !== 'https://honkai-seven.vercel.app') {
      return url.trim().replace(/\/+$/, '');
    }
  } catch {}

  // Check process.env if available
  if (typeof process !== 'undefined' && process.env) {
    const procUrl =
      process.env.NEXT_PUBLIC_HONK_API_URL ||
      process.env.VITE_HONK_API_URL ||
      process.env.VITE_API_URL ||
      process.env.APP_URL;

    if (procUrl && typeof procUrl === 'string' && procUrl.trim() && !procUrl.includes('undefined') && procUrl !== 'https://honkai-seven.vercel.app') {
      return procUrl.trim().replace(/\/+$/, '');
    }
  }

  // Default to relative path (served by Express or Vercel serverless function rewrites)
  return '';
}

export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
}

export const HONK_API_URL = getApiBaseUrl();
export const API_URL = getApiBaseUrl();

export default {
  getApiBaseUrl,
  buildApiUrl,
  HONK_API_URL,
  API_URL,
};
