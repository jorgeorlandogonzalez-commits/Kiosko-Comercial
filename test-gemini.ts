import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'kiosko-comercial-firebase-functions',
    }
  }
});
ai.models.generateContent({
  model: 'gemini-3.5-flash',
  contents: 'hola'
}).then(console.log).catch(console.error);
