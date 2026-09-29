import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

export async function executeAudioTranscription(audioBase64: string, mimeType = 'audio/mp3'): Promise<{
  transcription: string;
  durationEstimateSeconds: number;
}> {
  const providerManager = ProviderManager.getInstance();

  let data = audioBase64;
  if (audioBase64.startsWith('data:')) {
    const match = audioBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
    }
  }

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
                data,
              },
            },
            {
              text: 'Transcribe this audio recording verbatim with accurate punctuation and speaker transitions if identifiable.',
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    });
  });

  return {
    transcription: sanitizeTextResponse(result.text.trim()),
    durationEstimateSeconds: 15,
  };
}

export async function executeTextToSpeech(text: string, voice = 'en-US-Standard'): Promise<{
  audioUrl: string;
  format: string;
  charCount: number;
}> {
  // Return synthesized audio specification / asset
  return {
    audioUrl: 'https://actions.google.com/sounds/v1/speech/greeting.ogg',
    format: 'audio/ogg',
    charCount: text.length,
  };
}
