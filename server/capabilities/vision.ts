import { VisionRequestPayload } from '../types';
import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

export async function executeVisionAnalysis(payload: VisionRequestPayload): Promise<{
  analysis: string;
  mode: string;
  extractedText?: string;
  visualElements?: string[];
}> {
  const providerManager = ProviderManager.getInstance();
  const mode = payload.mode || 'general';

  // Parse image data
  let mimeType = 'image/png';
  let base64Data = '';

  if (payload.image.startsWith('data:')) {
    const match = payload.image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid base64 image data URI format');
    }
    mimeType = match[1];
    base64Data = match[2];
  } else {
    // If raw base64 without prefix
    base64Data = payload.image;
  }

  const promptGuidance: Record<string, string> = {
    ocr: 'Perform comprehensive Optical Character Recognition (OCR). Extract all visible text accurately, preserving reading order, columns, tables, and numeric data.',
    diagram: 'Analyze this diagram/chart in detail. Explain the architecture, entities, flow, relationships, metrics, and visual legend.',
    screenshot: 'Analyze this software/UI screenshot. Identify UI components, layout structure, active states, potential usability bugs, and visual hierarchy.',
    reasoning: 'Perform deep visual reasoning on this image. Deduce contextual clues, spatial relationships, problem solving steps, and provide an analytical breakdown.',
    general: 'Provide a rich, precise description of this image, highlighting key subjects, actions, text, and contextual details.',
  };

  const userInstruction = payload.prompt
    ? `${promptGuidance[mode] || promptGuidance.general}\n\nUser Question: ${payload.prompt}`
    : promptGuidance[mode] || promptGuidance.general;

  const result = await providerManager.executeWithRetry(async (adapter) => {
    return await adapter.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: userInstruction },
          ],
        },
      ],
      config: {
        temperature: 0.3,
      },
    });
  });

  const analysisText = sanitizeTextResponse(result.text.trim());

  return {
    analysis: analysisText,
    mode,
  };
}
