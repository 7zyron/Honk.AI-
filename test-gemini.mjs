import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'FAKE_KEY_FOR_TESTING' });
try {
  await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
} catch (e) {
  console.log(e.message);
  console.log(e.status);
}
