import { PromptEnhancementPayload } from '../types';
import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

export async function executePromptEnhancement(payload: PromptEnhancementPayload): Promise<{
  originalPrompt: string;
  enhancedPrompt: string;
  domain: string;
  structure: string[];
}> {
  const providerManager = ProviderManager.getInstance();
  const domain = payload.domain || 'general';

  const systemPrompt = `You are HONK AI's Prompt Enhancement Architect.
Your role is to expand concise user instructions into high-clarity, well-structured, production-ready prompts.

Crucial Directives:
- DO NOT alter the user's intended goal, requirements, or core meaning.
- Enrich with context, output specifications, edge case considerations, and structured formatting constraints.
- Format the output with clear markdown headings (e.g. ## Role & Objective, ## Context, ## Specific Instructions, ## Output Format).
- Return ONLY the enhanced prompt.`;

  const result = await providerManager.executeWithRetry(async (adapter) => {
    return await adapter.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Domain: ${domain}\nOriginal Prompt: "${payload.prompt}"\n\nEnhance this prompt following the directives.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });
  });

  const enhanced = sanitizeTextResponse(result.text.trim());
  const structure = (enhanced.match(/##\s+([^\n]+)/g) || []).map((h) => h.replace('##', '').trim());

  return {
    originalPrompt: payload.prompt,
    enhancedPrompt: enhanced,
    domain,
    structure,
  };
}
