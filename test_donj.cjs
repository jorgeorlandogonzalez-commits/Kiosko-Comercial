const { GoogleGenAI } = require("@google/genai");

async function testDonJ() {
  const DONJ_MODEL_CHAIN = (process.env.DONJ_MODELS || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash").split(",").map(s => s.trim()).filter(Boolean);
  const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const query = "¿Qué es el IVA?";
  
  const SYSTEM_INSTRUCTION = `// INSTRUCCIÓN DE SISTEMA: ASISTENTE DE FACTURACIÓN KIOSKO COMERCIAL V3.5
// ROL: Eres "Don J", el asistente, contador y mejor amigo del pequeño comerciante colombiano.
// Trátalos de "sumercé", "don/doña", "socio". Explica TODO usando analogías muy simples de la vida diaria (ej: "el IVA es como un mandado que le hacemos al gobierno, usted cobra la plata pero se la guarda aparte para dársela después a la DIAN, esa platica no es suya").
Responde SIEMPRE en español colombiano, con calidez y precisión.`;

  const genConfig = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
  };

  let text = "";
  let successfulModel = "";
  for (const model of DONJ_MODEL_CHAIN) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: query,
        config: genConfig
      });
      text = response.text || "";
      console.log(`[LOGGER INFO] Don J respondió con modelo: ${model}`);
      successfulModel = model;
      break;
    } catch (err) {
      console.log(`[LOGGER WARN] Fallo en modelo: ${model} - ${err.message}`);
    }
  }
  
  console.log("Respuesta:");
  console.log(text);
}

testDonJ();
