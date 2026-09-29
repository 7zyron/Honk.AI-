import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

export interface PhotoKheechoAnalyzeRequest {
  image: string; // Base64 data URI
  question?: string;
  language?: string; // 'auto', 'English', 'Hindi', 'Kannada', etc.
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface PhotoKheechoResult {
  category:
    | 'homework_math'
    | 'homework_science'
    | 'document_text'
    | 'handwritten_note'
    | 'screenshot_error'
    | 'screenshot_code'
    | 'chart_table'
    | 'receipt_bill'
    | 'diagram_architecture'
    | 'real_world_object'
    | 'plant_animal'
    | 'general_scene'
    | 'other';
  categoryName: string;
  categoryIcon: string;
  confidence: 'high' | 'medium' | 'low';
  clarityWarning: string | null;
  summary: string;
  answer: string;
  explanation: string;
  nextStep: string;
  extractedText?: string;
  suggestedQuestions: string[];
  detectedLanguage: string;
  fullMarkdown: string;
}

const SYSTEM_INSTRUCTION = `You are "HONK: Photo Kheecho, Kaam Khatam" (Tagline: "Take a photo. Honk understands. Work done.").
Your purpose is to turn any photo, screenshot, scanned document, handwritten note, academic problem, error message, chart, or real-world scene into an immediate, actionable, and accurate AI solution.

CORE PRINCIPLES:
1. "Don't tell HONK what the photo is. Just show HONK the photo." Infer what the photo is and what task the user needs done.
2. ACCURACY & ZERO HALLUCINATION: Never invent information that is not visible. If something is blurry, cut off, too dark, or ambiguous, explicitly mention it in clarityWarning or explanation.
3. CONCISE & ACTIONABLE: Provide direct results first, followed by clear reasoning and a practical next step.
4. CATEGORY HANDLING:
   - HOMEWORK / MATH / SCIENCE: Read equations accurately using LaTeX notation (e.g. $x^2 + y^2 = r^2$). Solve step-by-step. State the final answer prominently.
   - TEXT & DOCUMENTS & FORMS: Perform high-fidelity OCR, preserving structure, headings, and data. If summarization is useful, provide it.
   - SCREENSHOTS / ERRORS / CODE: Identify the exact error message, explain root cause simply, provide safe copy-paste fixes or debugging steps.
   - CHARTS & TABLES: Extract visible numbers, trends, key insights, and explain relationships clearly.
   - REAL-WORLD OBJECTS / PLANTS / ANIMALS / PRODUCTS: Identify accurately with common and scientific names if applicable. State characteristics. If uncertain, state confidence honestly.
5. MULTILINGUAL SUPPORT:
   - Default to clear, natural English, unless the user prompt is in Hindi, Kannada, or another language, or the image explicitly requires Hindi/Kannada response.
   - When requested in Hindi or Kannada, answer fluently in that language (using Devanagari for Hindi, Kannada script for Kannada).

OUTPUT FORMAT:
You must respond with valid JSON matching this exact structure:
{
  "category": "homework_math" | "homework_science" | "document_text" | "handwritten_note" | "screenshot_error" | "screenshot_code" | "chart_table" | "receipt_bill" | "diagram_architecture" | "real_world_object" | "plant_animal" | "general_scene" | "other",
  "categoryName": "A user-friendly title (e.g. 'Mathematics & Calculus', 'Software Error & Bug', 'Document OCR & Summary', 'Plant Identification')",
  "categoryIcon": "A single appropriate emoji (e.g. '📐', '🐞', '📄', '📊', '🌿', '⚡', '🧾')",
  "confidence": "high" | "medium" | "low",
  "clarityWarning": null or "Short warning if image is blurry, cropped, or partially unreadable",
  "summary": "One punchy sentence describing what HONK sees and solved.",
  "answer": "The direct result or core solution (LaTeX for math, direct answer, fix, or identification).",
  "explanation": "Clear step-by-step reasoning, context, or breakdown.",
  "nextStep": "Useful practical follow-up action or verification.",
  "extractedText": "Raw visible text extracted verbatim if the image has text/code/numbers, or null if none.",
  "suggestedQuestions": ["3-4 smart, highly relevant follow-up questions the user might ask about this specific image"],
  "detectedLanguage": "English" | "Hindi" | "Kannada" | "other"
}`;

export async function analyzePhotoKheecho(
  payload: PhotoKheechoAnalyzeRequest
): Promise<PhotoKheechoResult> {
  const providerManager = ProviderManager.getInstance();

  // Validate image
  if (!payload.image) {
    throw new Error('Image data is required');
  }

  let mimeType = 'image/jpeg';
  let base64Data = '';

  if (payload.image.startsWith('data:')) {
    const match = payload.image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid base64 image data URI');
    }
    mimeType = match[1];
    base64Data = match[2];
  } else {
    base64Data = payload.image;
  }

  // Build prompt
  const userPrompt = payload.question?.trim() || '';
  const langPref = payload.language && payload.language !== 'auto'
    ? `\nPreferred Response Language: ${payload.language}. Respond naturally in ${payload.language}.`
    : '';

  const instructionText = `${SYSTEM_INSTRUCTION}

${userPrompt ? `USER SPECIFIC QUESTION / TASK: "${userPrompt}"` : 'TASK: Automatically inspect the image, identify what it is, infer the most useful task, and provide the complete solution.'}${langPref}

IMPORTANT: Respond ONLY with a valid JSON object matching the schema specified above. No preamble, no markdown backticks around the json if possible, just the raw JSON or \`\`\`json {...} \`\`\`.`;

  const contents: any[] = [];

  // Add conversation history if available
  if (payload.history && payload.history.length > 0) {
    for (const msg of payload.history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Add current image and prompt
  contents.push({
    role: 'user',
    parts: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      { text: instructionText },
    ],
  });

  const rawResponse = await providerManager.executeWithRetry(async (adapter) => {
    return await adapter.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        temperature: 0.2,
      },
    });
  });

  const responseText = (rawResponse.text || '').trim();

  // Parse JSON from output
  let parsed: any = null;
  try {
    // Remove markdown code fences if present
    let cleaned = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    } else {
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = responseText.substring(firstBrace, lastBrace + 1);
      }
    }
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.warn('[PhotoKheecho] Direct JSON parse failed, crafting fallback structure:', parseErr);
    // Graceful fallback if model outputted raw text
    parsed = {
      category: 'general_scene',
      categoryName: 'Visual Analysis',
      categoryIcon: '📸',
      confidence: 'medium',
      clarityWarning: null,
      summary: 'Analysis completed successfully.',
      answer: sanitizeTextResponse(responseText),
      explanation: 'Detailed visual inspection conducted.',
      nextStep: 'You can ask any follow-up question below.',
      suggestedQuestions: [
        'Explain this in simpler terms',
        'Can you extract all the text?',
        'What should I do next?',
      ],
      detectedLanguage: 'English',
    };
  }

  // Ensure all required fields exist
  const result: PhotoKheechoResult = {
    category: parsed.category || 'general_scene',
    categoryName: parsed.categoryName || 'Visual Analysis',
    categoryIcon: parsed.categoryIcon || '📸',
    confidence: parsed.confidence || 'high',
    clarityWarning: parsed.clarityWarning || null,
    summary: sanitizeTextResponse(parsed.summary || ''),
    answer: sanitizeTextResponse(parsed.answer || ''),
    explanation: sanitizeTextResponse(parsed.explanation || ''),
    nextStep: sanitizeTextResponse(parsed.nextStep || ''),
    extractedText: parsed.extractedText ? sanitizeTextResponse(parsed.extractedText) : undefined,
    suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.map((q: any) => String(q))
      : ['Explain this further', 'Translate to Hindi', 'What are next steps?'],
    detectedLanguage: parsed.detectedLanguage || 'English',
    fullMarkdown: '',
  };

  // Build unified markdown representation
  result.fullMarkdown = `### ANSWER\n${result.answer}\n\n### EXPLANATION\n${result.explanation}\n\n### NEXT STEP\n${result.nextStep}`;

  return result;
}

export async function followUpPhotoKheecho(payload: {
  image: string;
  question: string;
  language?: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{
  reply: string;
  suggestedQuestions: string[];
}> {
  const providerManager = ProviderManager.getInstance();

  if (!payload.image) {
    throw new Error('Image reference is required for follow-up');
  }

  let mimeType = 'image/jpeg';
  let base64Data = '';

  if (payload.image.startsWith('data:')) {
    const match = payload.image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid base64 image data URI');
    }
    mimeType = match[1];
    base64Data = match[2];
  } else {
    base64Data = payload.image;
  }

  const langPref = payload.language && payload.language !== 'auto'
    ? ` Preferred Language: ${payload.language}. Answer in ${payload.language}.`
    : '';

  const followUpInstruction = `You are HONK AI assisting the user in a follow-up conversation about the uploaded photo.
The user is asking a follow-up question regarding the SAME image they uploaded earlier.
Be concise, clear, direct, and helpful. Use LaTeX for math ($...$) if relevant.
Do NOT re-explain everything from scratch unless requested. Focus specifically on the user's question.${langPref}

At the very end of your response, provide 3 suggested follow-up questions formatted as:
---SUGGESTIONS---
- Suggestion 1
- Suggestion 2
- Suggestion 3`;

  const contents: any[] = [];

  // Add the initial image part in the context
  contents.push({
    role: 'user',
    parts: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: 'This is the image we are discussing.',
      },
    ],
  });

  // Replay conversation history
  if (payload.history && payload.history.length > 0) {
    for (const msg of payload.history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Append new question
  contents.push({
    role: 'user',
    parts: [{ text: `${payload.question}\n\n${followUpInstruction}` }],
  });

  const rawResponse = await providerManager.executeWithRetry(async (adapter) => {
    return await adapter.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        temperature: 0.3,
      },
    });
  });

  const fullText = (rawResponse.text || '').trim();

  // Extract suggestions if present
  let reply = fullText;
  let suggestedQuestions: string[] = [
    'Can you explain that more simply?',
    'What should I do next?',
    'Translate this to Hindi',
  ];

  if (fullText.includes('---SUGGESTIONS---')) {
    const parts = fullText.split('---SUGGESTIONS---');
    reply = parts[0].trim();
    const suggestionsRaw = parts[1].trim();
    const parsedLines = suggestionsRaw
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter((l) => l.length > 0);
    if (parsedLines.length > 0) {
      suggestedQuestions = parsedLines.slice(0, 4);
    }
  }

  return {
    reply: sanitizeTextResponse(reply),
    suggestedQuestions,
  };
}
