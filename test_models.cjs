const { GoogleGenAI } = require("@google/genai");

async function testModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3-flash", "gemini-3.1-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
  
  console.log("=== INICIANDO SONDEO DE MODELOS ===");
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: "hola"
      });
      console.log(`[OK] ${model}: ${response.text.trim().substring(0, 30)}...`);
    } catch (e) {
      console.log(`[FAIL] ${model}: ${e.message}`);
    }
  }
  console.log("=== FIN DEL SONDEO ===");
}

testModels();
