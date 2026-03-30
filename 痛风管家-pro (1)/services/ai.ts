import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// IMPORTANT: This uses the environment variable as requested.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateHealthAdvice = async (
  context: string, 
  topic: 'diet' | 'medication' | 'lifestyle' | 'general'
): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash'; // Optimized for speed/chat

    const systemInstruction = `你是痛风与高尿酸血症管理的专业医疗AI助手。
    你的语气专业、富有同理心且简洁。
    请根据用户数据提供可操作的建议。
    回复请保持简短（100字以内），并适合手机屏幕阅读。`;

    let prompt = "";
    switch (topic) {
      case 'diet':
        prompt = `基于以下患者情况: "${context}", 提供具体的降低尿酸的饮食建议。`;
        break;
      case 'medication':
        prompt = `基于以下患者情况: "${context}", 解释坚持用药的重要性以及常见痛风药物（如别嘌醇或非布司他）的注意事项。`;
        break;
      case 'lifestyle':
        prompt = `基于以下患者情况: "${context}", 建议3个简单的生活方式改变来预防痛风发作。`;
        break;
      default:
        prompt = `回答关于痛风管理的以下问题: "${context}"`;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "连接健康数据库时出现问题，请重试。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "暂时无法生成建议，请检查您的网络连接。";
  }
};