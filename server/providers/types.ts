// Provider Adapter & Circuit Breaker Architecture

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number; // consecutive failures before opening
  recoveryTimeoutMs: number; // ms to wait in OPEN state before trying HALF_OPEN
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private nextAttempt = 0;

  constructor(private options: CircuitBreakerOptions = { failureThreshold: 5, recoveryTimeoutMs: 5000 }) {}

  public canExecute(): boolean {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'CLOSED';
      this.failureCount = 0;
    }
    return true;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.recoveryTimeoutMs;
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = 0;
  }

  public getState(): CircuitBreakerState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'CLOSED';
    }
    return this.state;
  }
}

export interface ProviderAdapter {
  id: string;
  isConfigured(): boolean;
  getCircuitState(): CircuitBreakerState;
  generateContent(params: {
    model: string;
    contents: unknown;
    config?: Record<string, unknown>;
  }): Promise<{ text: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }>;
  generateContentStream(params: {
    model: string;
    contents: unknown;
    config?: Record<string, unknown>;
  }): Promise<AsyncIterable<{ text?: string }>>;
  generateImage?(params: {
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
    inputImage?: string;
  }): Promise<{ imageUrl: string; mimeType: string; model?: string }>;
}
