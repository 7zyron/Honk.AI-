import { ImageGenerationPayload } from '../types';
import { ProviderManager } from '../providers/ProviderManager';

export interface ImageGenerationResult {
  id: string;
  status: 'completed' | 'failed';
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
  mode: 'generate' | 'edit';
  createdAt: number;
}

/**
 * Maps standard aspect ratios to optimal pixel dimensions for AI diffusion models.
 */
function getDimensionsForAspectRatio(ratio: string, resolution: string): { width: number; height: number } {
  const isHighRes = resolution === '2K' || resolution === '4K';
  const scale = isHighRes ? 1.35 : 1.0;

  switch (ratio) {
    case '16:9':
      return { width: Math.round(1280 * scale), height: Math.round(720 * scale) };
    case '9:16':
      return { width: Math.round(720 * scale), height: Math.round(1280 * scale) };
    case '4:3':
      return { width: Math.round(1024 * scale), height: Math.round(768 * scale) };
    case '3:4':
      return { width: Math.round(768 * scale), height: Math.round(1024 * scale) };
    case '1:1':
    default:
      return { width: Math.round(1024 * scale), height: Math.round(1024 * scale) };
  }
}

/**
 * Generates an image using documented free-tier image APIs (Pixazo Free Tier / Google Gemini Image API).
 * Never uses Pollinations or fake placeholder images.
 */
export async function executeImageGeneration(
  payload: ImageGenerationPayload
): Promise<ImageGenerationResult> {
  const prompt = (payload.prompt || '').trim();
  if (!prompt && !payload.inputImage) {
    throw new Error('Image prompt cannot be empty');
  }

  const aspectRatio = payload.aspectRatio || '1:1';
  const resolution = payload.resolution || '1K';
  const mode = payload.mode || (payload.inputImage ? 'edit' : 'generate');
  const { width, height } = getDimensionsForAspectRatio(aspectRatio, resolution);

  const pixazoKey = process.env.PIXAZO_API_KEY || process.env.FREE_IMAGE_API_KEY;

  // Option 1: Pixazo Free Tier API (if PIXAZO_API_KEY is configured)
  if (pixazoKey) {
    try {
      const pixazoRes = await fetch('https://gateway.pixazo.ai/sd3-5/v1/r-sd-3-5-large', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': pixazoKey,
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          num_images: 1,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (pixazoRes.status === 429 || pixazoRes.status === 403 || pixazoRes.status === 401) {
        const errText = await pixazoRes.text().catch(() => '');
        throw new Error(`Pixazo Free Tier API limit reached (${pixazoRes.status}): ${errText || 'Quota exceeded'}`);
      }

      if (pixazoRes.ok) {
        const data: any = await pixazoRes.json();
        const imageUrl = data.image_url || data.url || data.media_url || (Array.isArray(data.images) ? data.images[0] : null);
        if (imageUrl) {
          return {
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            status: 'completed',
            imageUrl,
            prompt,
            aspectRatio,
            resolution,
            model: 'Pixazo Free API (SD 3.5)',
            mode,
            createdAt: Date.now(),
          };
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Pixazo Free Tier API limit reached')) {
        throw err;
      }
      console.warn('[ImageCapability] Pixazo API failed, trying primary configured adapter:', err?.message || err);
    }
  }

  // Option 2: Primary configured Google Gemini Image API
  const providerManager = ProviderManager.getInstance();
  const geminiAdapter = providerManager.getGeminiAdapter();

  try {
    const geminiResult = await geminiAdapter.generateImage({
      prompt,
      aspectRatio,
      resolution,
      inputImage: payload.inputImage,
    });

    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'completed',
      imageUrl: geminiResult.imageUrl,
      prompt,
      aspectRatio,
      resolution,
      model: geminiResult.model || 'gemini-3.1-flash-lite-image',
      mode,
      createdAt: Date.now(),
    };
  } catch (err: any) {
    const errMsg = String(err?.message || err);
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('ResourceExhausted')) {
      throw new Error('Rate limit reached. Please wait a moment before sending another request.');
    }
    throw new Error(`Image generation failed: ${errMsg}`);
  }
}
