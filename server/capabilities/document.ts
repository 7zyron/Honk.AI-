import { DocumentAnalysisPayload } from '../types';
import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

export async function executeDocumentAnalysis(payload: DocumentAnalysisPayload): Promise<{
  filename: string;
  mode: string;
  result: string;
  structuredData?: Record<string, unknown>;
}> {
  const providerManager = ProviderManager.getInstance();
  const mode = payload.mode || 'summary';

  let mimeType = payload.mimeType || 'application/pdf';
  let base64Data = payload.document;

  if (payload.document.startsWith('data:')) {
    const match = payload.document.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  const promptGuidance: Record<string, string> = {
    summary: 'Provide an executive summary of this document, organized by key themes, major findings, and actionable takeaways.',
    qa: `Answer the following question specifically and comprehensively using the document content:\n"${payload.query || 'What are the main topics discussed?'}"`,
    extract: 'Extract all important dates, entities, monetary amounts, figures, and technical terms from this document.',
    structured: 'Extract structured information and return a clean JSON object according to standard key-value conventions.',
    compare: 'Analyze and compare the major sections and viewpoints present in this document.',
  };

  const systemInstruction = `You are HONK AI's Document Intelligence Analyst.
Analyze the attached document carefully and provide a rigorous, factual, and well-structured response.
${promptGuidance[mode] || promptGuidance.summary}`;

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
            {
              text: payload.query ? `Specific Query: ${payload.query}` : 'Execute document analysis.',
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });
  });

  const output = sanitizeTextResponse(result.text.trim());

  let structuredData: Record<string, unknown> | undefined;
  if (mode === 'structured') {
    try {
      const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/) || output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch {
      // ignore
    }
  }

  return {
    filename: payload.filename,
    mode,
    result: output,
    structuredData,
  };
}
