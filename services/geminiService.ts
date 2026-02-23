
import { GoogleGenAI, Type } from "@google/genai";

export const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getProjectInsights = async (metrics: any) => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `A modern, minimalist abstract logo for a company named "${clientName}". Professional colors, high quality, corporate style.` }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
};
