
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

export const getAIClient = () => {
  if (!API_KEY) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: API_KEY });
  } catch (e) {
    console.error('Failed to init Gemini client:', e);
    return null;
  }
};

export const getProjectInsights = async (metrics: any) => {
  const ai = getAIClient();
  if (!ai) return "IA Assistant não configurado. Adicione a GEMINI_API_KEY nas variáveis de ambiente.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analise os seguintes KPIs corporativos e forneça 3 sugestões curtas de melhoria em português: ${JSON.stringify(metrics)}`,
      config: {
        systemInstruction: "Você é um consultor sênior de gestão. Seja direto, profissional e focado em resultados.",
        temperature: 0.7
      }
    });
    return response.text || "Sem insights disponíveis no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao processar os insights de IA.";
  }
};

export const generateTaskDescription = async (title: string) => {
  const ai = getAIClient();
  if (!ai) return "IA não configurada.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Crie uma descrição técnica breve (máximo 2 parágrafos) para a tarefa: "${title}"`,
      config: {
        temperature: 0.5
      }
    });
    return response.text || "Sem descrição gerada.";
  } catch (error) {
    return "Erro ao gerar descrição.";
  }
};

export const generateClientAvatar = async (clientName: string) => {
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { text: `A modern, minimalist abstract logo for a company named "${clientName}". Professional colors, high quality, corporate style.` }
        ]
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) {
        return `data:image/png;base64,${(part as any).inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
};
