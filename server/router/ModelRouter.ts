import { Capability, PublicHonkModel } from '../types';
import { ThinkingLevel } from '@google/genai';

export interface ResolvedModelPlan {
  primaryModel: string;
  fallbackModels: string[];
  config: Record<string, unknown>;
  displayName: string;
}

export class ModelRouter {
  /**
   * Resolves the exact underlying model and configuration
   * based on capability, requested model ID, and task requirements.
   */
  public static resolveRoute(
    capability: Capability,
    requestedModel?: string,
    options: {
      temperature?: number;
      systemInstruction?: string;
      enableWebSearch?: boolean;
    } = {}
  ): ResolvedModelPlan {
    const temp = Math.min(Math.max(options.temperature ?? 0.7, 0), 1);
    const baseConfig: Record<string, unknown> = {
      temperature: temp,
    };

    if (options.systemInstruction) {
      baseConfig.systemInstruction = options.systemInstruction;
    }

    if (options.enableWebSearch) {
      baseConfig.tools = [{ googleSearch: {} }];
    }

    const modelNormalized = (requestedModel || '').toLowerCase().trim();

    // 1. CAPABILITY: IMAGE
    if (capability === Capability.IMAGE) {
      return {
        primaryModel: 'imagen-3.0-generate-002',
        fallbackModels: ['gemini-3.1-flash-image'],
        config: baseConfig,
        displayName: 'Honk Image Studio',
      };
    }

    // 2. CAPABILITY: VIDEO
    if (capability === Capability.VIDEO) {
      return {
        primaryModel: 'veo-2.0-generate-001',
        fallbackModels: [],
        config: baseConfig,
        displayName: 'Honk Motion Engine',
      };
    }

    // 3. CAPABILITY: AUDIO
    if (capability === Capability.AUDIO) {
      return {
        primaryModel: 'gemini-3.8-flash',
        fallbackModels: ['gemini-3.1-flash-lite'],
        config: baseConfig,
        displayName: 'Honk Audio Intelligence',
      };
    }

    // 4. CAPABILITY: APP_BUILDER / CODE
    if (capability === Capability.APP_BUILDER || capability === Capability.CODE) {
      return {
        primaryModel: 'gemini-3.8-flash',
        fallbackModels: ['gemini-3.1-flash-lite'],
        config: {
          ...baseConfig,
          temperature: 0.2, // lower temperature for precision in code generation
        },
        displayName: 'Honk App Architect',
      };
    }

    // 5. HONK PRO REASONING (gemini-3.1-pro-preview)
    if (
      modelNormalized === 'honk-pro' ||
      modelNormalized === 'gemini-3.1-pro-preview' ||
      modelNormalized === 'honk 1.5' ||
      modelNormalized === 'honk_1_5' ||
      modelNormalized.includes('pro-preview')
    ) {
      return {
        primaryModel: 'gemini-3.1-pro-preview',
        fallbackModels: ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        config: baseConfig,
        displayName: 'Honk Pro Reasoning',
      };
    }

    // 6. HONK THINKING (gemini-3.8-flash with high thinking budget)
    if (
      modelNormalized === 'honk-thinking' ||
      modelNormalized === 'honk 2.0' ||
      modelNormalized === 'honk_2_0' ||
      modelNormalized === 'thinking'
    ) {
      return {
        primaryModel: 'gemini-3.8-flash',
        fallbackModels: ['gemini-2.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'],
        config: {
          ...baseConfig,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
        displayName: 'Honk Thinking',
      };
    }

    // 7. HONK LITE (gemini-3.1-flash-lite)
    if (
      modelNormalized === 'honk-lite' ||
      modelNormalized === 'gemini-3.1-flash-lite' ||
      modelNormalized.includes('flash-lite') ||
      modelNormalized === 'lite'
    ) {
      return {
        primaryModel: 'gemini-3.1-flash-lite',
        fallbackModels: ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'],
        config: baseConfig,
        displayName: 'Honk Lite',
      };
    }

    // 8. DIRECT GEMINI MODEL (e.g. gemini-3.8-flash)
    if (modelNormalized.startsWith('gemini-')) {
      const directModel = requestedModel!.trim();
      return {
        primaryModel: directModel,
        fallbackModels: ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'].filter(
          (m) => m !== directModel
        ),
        config: baseConfig,
        displayName: directModel,
      };
    }

    // 9. DEFAULT: HONK FAST (gemini-3.8-flash for ultra-fast streaming with gemini-2.5-flash fallback)
    return {
      primaryModel: 'gemini-3.8-flash',
      fallbackModels: ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
      config: baseConfig,
      displayName: 'Honk Fast',
    };
  }
}
