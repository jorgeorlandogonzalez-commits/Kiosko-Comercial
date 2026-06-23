
/**
 * Servicio de Cliente para el Asistente AI (Don J) - Kiosko Comercial Enterprise
 * 
 * Llama de forma segura al endpoint del servidor proxy (/api/gemini/assistant)
 * para realizar consultas a la IA sin exponer claves criptográficas en el frontend.
 */

export const askGeminiAssistant = async (query: string, contextData: string): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, contextData }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "Lo siento, socio. ¿Podrías repetirme eso? Mi calculadora se bloqueó un momento.";
  } catch (error) {
    console.error("Error al invocar el Asistente Don J:", error);
    return "Lo siento, socio. Hubo un pequeño fallo de conexión. Inténtalo de nuevo en unos minutos o verifica con soporte.";
  }
};
