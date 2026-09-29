import { ProviderAdapter, CircuitBreaker, CircuitBreakerState } from './types';

export class CerebrasProviderAdapter implements ProviderAdapter {
  public id = 'cerebras_provider';
  private breaker: CircuitBreaker;
  private baseUrl = 'https://api.cerebras.ai/v1';

  constructor() {
    this.breaker = new CircuitBreaker({ failureThreshold: 5, recoveryTimeoutMs: 15000 });
  }

  private getApiKey(): string {
    const key = process.env.CEREBRAS_API_KEY || process.env.HONK_KEY;
    if (!key) {
      throw new Error('Server configuration error: Cerebras API key (CEREBRAS_API_KEY or HONK_KEY) is not configured.');
    }
    return key;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.CEREBRAS_API_KEY || process.env.HONK_KEY);
  }

  public getCircuitState(): CircuitBreakerState {
    return this.breaker.getState();
  }

  private mapModel(requestedModel?: string): string {
    const m = (requestedModel || '').toLowerCase();
    if (m.includes('honk 2.0') || m.includes('honk-thinking') || m.includes('reasoning') || m.includes('pro')) {
      return 'gpt-oss-120b';
    }
    if (m.includes('honk 1.5') || m.includes('document')) {
      return 'gpt-oss-120b';
    }
    if (m.includes('gpt-oss') || m.includes('qwen') || m.includes('llama')) {
      return requestedModel!;
    }
    return 'qwen-3.8-27b';
  }

  private formatMessages(
    contents: any,
    systemInstruction?: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemInstruction) {
      messages.push({ role: 'system', content: String(systemInstruction) });
    }

    if (Array.isArray(contents)) {
      for (const item of contents) {
        const role = item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user';
        let text = '';
        if (Array.isArray(item.parts)) {
          for (const part of item.parts) {
            if (part && typeof part === 'object' && 'text' in part && part.text) {
              text += (text ? '\n' : '') + part.text;
            }
          }
        } else if (typeof item.content === 'string') {
          text = item.content;
        } else if (typeof item.text === 'string') {
          text = item.text;
        }
        if (text) {
          messages.push({ role, content: text });
        }
      }
    }

    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello' });
    }

    return messages;
  }

  public async generateContent(params: {
    model: string;
    contents: any;
    config?: Record<string, unknown>;
  }): Promise<{ text: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }> {
    const apiKey = this.getApiKey();
    const targetModel = this.mapModel(params.model);
    const systemInstruction = params.config?.systemInstruction as string | undefined;
    const messages = this.formatMessages(params.contents, systemInstruction);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: (params.config?.temperature as number) ?? 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let parsedMessage = `Cerebras API error (Status ${response.status}): ${errorBody}`;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.message) {
            parsedMessage = parsed.message;
          } else if (parsed.error?.message) {
            parsedMessage = parsed.error.message;
          }
        } catch {}
        throw new Error(parsedMessage);
      }

      const data = (await response.json()) as any;
      this.breaker.recordSuccess();

      const text = data.choices?.[0]?.message?.content || '';
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      return { text, usage };
    } catch (err: any) {
      // Don't trip circuit breaker on quota/auth/client errors
      const msg = String(err?.message || err);
      if (!msg.includes('Payment required') && !msg.includes('quota') && !msg.includes('401') && !msg.includes('400')) {
        this.breaker.recordFailure();
      }
      throw err;
    }
  }

  public async generateContentStream(params: {
    model: string;
    contents: any;
    config?: Record<string, unknown>;
  }): Promise<AsyncIterable<{ text?: string }>> {
    const apiKey = this.getApiKey();
    const targetModel = this.mapModel(params.model);
    const systemInstruction = params.config?.systemInstruction as string | undefined;
    const messages = this.formatMessages(params.contents, systemInstruction);

    let response: globalThis.Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: (params.config?.temperature as number) ?? 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let parsedMessage = `Cerebras API error (${response.status}): ${errorBody}`;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.message) {
            parsedMessage = parsed.message;
          } else if (parsed.error?.message) {
            parsedMessage = parsed.error.message;
          }
        } catch {}
        throw new Error(parsedMessage);
      }

      this.breaker.recordSuccess();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (!msg.includes('Payment required') && !msg.includes('quota') && !msg.includes('401') && !msg.includes('400')) {
        this.breaker.recordFailure();
      }
      throw err;
    }

    const body = response.body;
    if (!body) {
      throw new Error('No response stream body received from Cerebras API');
    }

    async function* makeStreamGenerator(): AsyncGenerator<{ text?: string }, void, unknown> {
      const reader = body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') return;

            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (deltaContent) {
                  yield { text: deltaContent };
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    return makeStreamGenerator();
  }
}
