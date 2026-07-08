
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
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const errData = isJson ? await response.json().catch(() => ({})) : {};
      throw new Error(errData.error || `Error del servidor: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // El servidor devolvió algo que no es JSON (probablemente una página HTML de "Iniciando contenedor")
      // Esto pasa a veces en el entorno de desarrollo cuando el contenedor se reinicia.
      throw new Error("El servidor se está reiniciando. Por favor, intenta de nuevo en unos segundos.");
    }

    const data = await response.json();
    return data.text || "Lo siento, socio. ¿Podrías repetirme eso? Mi calculadora se bloqueó un momento.";
  } catch (error: any) {
    console.error("Error al invocar el Asistente Don J:", error);
    // Si el error tiene un mensaje específico (como el límite de tasa o error de API key), mostrarlo
    if (error.message && error.message !== "Failed to fetch") {
      return `Ups, un problemita: ${error.message}`;
    }
    return "Lo siento, socio. Hubo un pequeño fallo de conexión. Inténtalo de nuevo en unos minutos o verifica con soporte.";
  }
};
