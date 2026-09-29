import { GoogleGenAI } from '@google/genai';
import { ProviderAdapter, CircuitBreaker, CircuitBreakerState } from './types';

export class GeminiProviderAdapter implements ProviderAdapter {
  public id = 'honk_primary_provider';
  private ai: GoogleGenAI | null = null;
  private breaker: CircuitBreaker;

  constructor() {
    this.breaker = new CircuitBreaker({ failureThreshold: 3, recoveryTimeoutMs: 25000 });
    // Keep connection warm: pre-instantiate client at boot time to prevent first-request cold start
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.warn('[GeminiProviderAdapter] Pre-warming client deferred:', err);
      }
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('Server configuration error: GEMINI_API_KEY environment variable is not configured.');
      }
      this.ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.ai;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  public getCircuitState(): CircuitBreakerState {
    return this.breaker.getState();
  }

  private mapModel(requestedModel?: string): string {
    const m = (requestedModel || '').toLowerCase().trim();
    if (m === 'honk-pro' || m === 'gemini-3.1-pro-preview' || m.includes('pro-preview') || m === 'honk 1.5' || m === 'honk_1_5') {
      return 'gemini-3.1-pro-preview';
    }
    if (m === 'honk-lite' || m === 'gemini-3.1-flash-lite' || m.includes('flash-lite') || m === 'lite') {
      return 'gemini-3.1-flash-lite';
    }
    if (m === 'honk-thinking' || m === 'honk 2.0' || m === 'honk_2_0' || m === 'thinking') {
      return 'gemini-3.8-flash';
    }
    if (m === 'honk-flash' || m === 'honk' || m === 'gemini-3.8-flash' || m.includes('3.8-flash') || m.includes('flash')) {
      return 'gemini-3.8-flash';
    }
    if (m.startsWith('gemini-')) {
      return requestedModel!.trim();
    }
    return 'gemini-3.8-flash';
  }

  private getFallbackModels(primaryModel: string): string[] {
    const defaultChain = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    if (primaryModel === 'gemini-3.8-flash') {
      return ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    }
    if (primaryModel === 'gemini-3.1-flash-lite') {
      return ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    }
    if (primaryModel === 'gemini-3.1-pro-preview') {
      return ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    }
    return defaultChain.filter((m) => m !== primaryModel);
  }

  private isTransientCapacityError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
      lower.includes('high demand') ||
      lower.includes('spikes in demand') ||
      lower.includes('503') ||
      lower.includes('unavailable') ||
      lower.includes('overloaded') ||
      lower.includes('resource_exhausted') ||
      lower.includes('resource has been exhausted') ||
      lower.includes('rate limit') ||
      lower.includes('429') ||
      lower.includes('quota exceeded') ||
      lower.includes('exceeded your current quota') ||
      lower.includes('temporarily unavailable')
    );
  }

  public async generateContent(params: {
    model: string;
    contents: any;
    config?: Record<string, unknown>;
  }): Promise<{ text: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }> {
    const client = this.getClient();
    const primaryModel = this.mapModel(params.model);
    const candidateModels = [primaryModel, ...this.getFallbackModels(primaryModel)];

    let lastError: any = null;

    for (const candidateModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          // Brief jittered pause for transient demand spike
          await new Promise((res) => setTimeout(res, 350 + Math.random() * 200));
        }

        try {
          const adjustedConfig: Record<string, unknown> = { ...(params.config || {}) };
          if (
            candidateModel !== 'gemini-3.8-flash' &&
            candidateModel !== 'gemini-3.1-pro-preview'
          ) {
            delete adjustedConfig.thinkingConfig;
          }

          const response = await client.models.generateContent({
            model: candidateModel,
            contents: params.contents,
            config: adjustedConfig,
          });

          this.breaker.recordSuccess();

          const text = response.text || '';
          const usageMetadata = response.usageMetadata;

          return {
            text,
            usage: usageMetadata
              ? {
                  promptTokens: usageMetadata.promptTokenCount,
                  completionTokens: usageMetadata.candidatesTokenCount,
                  totalTokens: usageMetadata.totalTokenCount,
                }
              : undefined,
          };
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);
          const isTransient = this.isTransientCapacityError(msg);

          if (!isTransient && !msg.includes('400')) {
            this.breaker.recordFailure();
            throw err;
          }

          // If transient capacity or quota error, fail over to the next fallback model in the chain
          if (isTransient) {
            console.warn(
              `[GeminiProviderAdapter] Model ${candidateModel} capacity limited (503/429), failing over to next model...`
            );
            break;
          }
        }
      }
    }

    throw lastError;
  }

  public async generateContentStream(params: {
    model: string;
    contents: any;
    config?: Record<string, unknown>;
  }): Promise<AsyncIterable<{ text?: string }>> {
    const client = this.getClient();
    const primaryModel = this.mapModel(params.model);
    const candidateModels = [primaryModel, ...this.getFallbackModels(primaryModel)];

    let lastError: any = null;

    for (const candidateModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          // Brief jittered pause for transient demand spike
          await new Promise((res) => setTimeout(res, 350 + Math.random() * 200));
        }

        try {
          const adjustedConfig: Record<string, unknown> = { ...(params.config || {}) };
          if (
            candidateModel !== 'gemini-3.8-flash' &&
            candidateModel !== 'gemini-3.1-pro-preview'
          ) {
            delete adjustedConfig.thinkingConfig;
          }

          const stream = await client.models.generateContentStream({
            model: candidateModel,
            contents: params.contents,
            config: adjustedConfig,
          });

          this.breaker.recordSuccess();
          return stream;
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);
          const isTransient = this.isTransientCapacityError(msg);

          if (!isTransient && !msg.includes('400')) {
            this.breaker.recordFailure();
            throw err;
          }

          if (isTransient) {
            console.warn(
              `[GeminiProviderAdapter] Stream model ${candidateModel} capacity limited (503/429), failing over to next model...`
            );
            break;
          }
        }
      }
    }

    throw lastError;
  }

  public async generateImage(params: {
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
    inputImage?: string;
  }): Promise<{ imageUrl: string; mimeType: string; model: string }> {
    const client = this.getClient();

    // Map aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4
    const validAspectRatio =
      params.aspectRatio === '16:9' ||
      params.aspectRatio === '9:16' ||
      params.aspectRatio === '4:3' ||
      params.aspectRatio === '3:4'
        ? params.aspectRatio
        : '1:1';

    // Map resolution: 1K, 2K, 4K (default 1K)
    const validResolution =
      params.resolution === '2K' || params.resolution === '4K'
        ? params.resolution
        : '1K';

    const prompt = (params.prompt || '').trim();
    if (!prompt && !params.inputImage) {
      throw new Error('Image prompt cannot be empty');
    }

    // Determine target Google model based on resolution and task
    // Per Gemini SDK skill: gemini-3.1-flash-lite-image for standard, gemini-3.1-flash-image for 2K/4K
    const targetModel =
      validResolution === '2K' || validResolution === '4K'
        ? 'gemini-3.1-flash-image'
        : 'gemini-3.1-flash-lite-image';

    const timeoutMs = 30000;
    const executeGenerateCall = async (modelId: string) => {
      const parts: any[] = [];
      if (params.inputImage) {
        parts.push({
          inlineData: {
            data: params.inputImage.replace(/^data:image\/\w+;base64,/, ''),
            mimeType: 'image/png',
          },
        });
      }
      parts.push({ text: prompt });

      const config: any = {
        imageConfig: {
          aspectRatio: validAspectRatio,
          ...(modelId === 'gemini-3.1-flash-image' ? { imageSize: validResolution } : {}),
        },
      };

      const callPromise = client.models.generateContent({
        model: modelId,
        contents: { parts },
        config,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Google Gemini image generation request timed out after 30 seconds')),
          timeoutMs
        );
      });

      return (await Promise.race([callPromise, timeoutPromise])) as any;
    };

    try {
      const response = await executeGenerateCall(targetModel);

      let base64Data: string | null = null;
      let mimeType = 'image/png';

      if (response?.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64Data = part.inlineData.data;
            mimeType = part.inlineData.mimeType || 'image/png';
            break;
          }
        }
      }

      if (base64Data) {
        return {
          imageUrl: `data:${mimeType};base64,${base64Data}`,
          mimeType,
          model: targetModel,
        };
      }

      throw new Error('Google Gemini API completed without returning inline image data.');
    } catch (err: any) {
      // If gemini-3.1-flash-image hit a capacity or quota limitation, attempt automatic failover to gemini-3.1-flash-lite-image
      if (targetModel === 'gemini-3.1-flash-image') {
        try {
          console.warn('[GeminiProviderAdapter] Retrying image generation with gemini-3.1-flash-lite-image...');
          const fallbackRes = await executeGenerateCall('gemini-3.1-flash-lite-image');
          if (fallbackRes?.candidates && fallbackRes.candidates[0]?.content?.parts) {
            for (const part of fallbackRes.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                return {
                  imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                  mimeType: part.inlineData.mimeType || 'image/png',
                  model: 'gemini-3.1-flash-lite-image',
                };
              }
            }
          }
        } catch (fallbackErr: any) {
          console.error('[GeminiProviderAdapter] Fallback model also failed:', fallbackErr);
        }
      }

      const errMsg = String(err?.message || err);
      throw new Error(`Google Gemini Image API Error: ${errMsg}`);
    }
  }
}
