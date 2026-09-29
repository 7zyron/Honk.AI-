import { ProviderAdapter, CircuitBreakerState } from './types';
import { GeminiProviderAdapter } from './GeminiProviderAdapter';
import { CerebrasProviderAdapter } from './CerebrasProviderAdapter';

export type AIProviderId = 'gemini' | 'cerebras';

export class ProviderManager {
  private static instance: ProviderManager;
  private geminiAdapter: GeminiProviderAdapter;
  private cerebrasAdapter: CerebrasProviderAdapter;

  private constructor() {
    this.geminiAdapter = new GeminiProviderAdapter();
    this.cerebrasAdapter = new CerebrasProviderAdapter();
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  public getGeminiAdapter(): GeminiProviderAdapter {
    return this.geminiAdapter;
  }

  public getActiveProviderName(): AIProviderId {
    const custom = (process.env.AI_PROVIDER || '').toLowerCase().trim();
    if (custom === 'cerebras') return 'cerebras';
    return 'gemini';
  }

  public getAdapters(): ProviderAdapter[] {
    const active = this.getActiveProviderName();

    if (active === 'cerebras') {
      const list = [this.cerebrasAdapter, this.geminiAdapter].filter((a) => a.isConfigured());
      return list.length > 0 ? list : [this.cerebrasAdapter];
    }

    // Default: Gemini native engine with automatic Cerebras failover if configured
    const configured = [this.geminiAdapter, this.cerebrasAdapter].filter((a) => a.isConfigured());
    if (configured.length > 0) {
      return configured;
    }

    return [this.geminiAdapter];
  }

  public getPrimaryAdapter(): ProviderAdapter {
    const adapters = this.getAdapters();
    if (adapters.length > 0) {
      return adapters[0];
    }
    return this.geminiAdapter;
  }

  public getHealthStatus(): {
    configured: boolean;
    circuitState: CircuitBreakerState;
    adapterCount: number;
    activeProvider: AIProviderId;
  } {
    const primary = this.getPrimaryAdapter();
    return {
      configured: primary ? primary.isConfigured() : false,
      circuitState: primary ? primary.getCircuitState() : 'OPEN',
      adapterCount: 2,
      activeProvider: this.getActiveProviderName(),
    };
  }

  /**
   * Controlled execution with exponential backoff, jitter, adapter failover, and circuit protection.
   */
  public async executeWithRetry<T>(
    operation: (adapter: ProviderAdapter) => Promise<T>,
    maxRetries = 1
  ): Promise<T> {
    const adapters = this.getAdapters();
    let lastError: unknown = null;

    for (const adapter of adapters) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          // Backoff with jitter (e.g. 400ms + random 0-200ms)
          const delay = Math.pow(2, attempt) * 400 + Math.floor(Math.random() * 200);
          await new Promise((res) => setTimeout(res, delay));
        }

        try {
          return await operation(adapter);
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);

          // Don't retry on 400 Bad Request, auth, or missing key configuration errors
          if (
            (msg.includes('400') || msg.includes('Bad Request') || msg.includes('401')) &&
            !msg.includes('429')
          ) {
            throw err;
          }
        }
      }
    }

    throw lastError || new Error('All provider retry attempts failed');
  }
}

