
import { GoogleGenAI, Type } from "@google/genai";
import { StudyConfig, MCQQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

/**
 * Helper to safely parse JSON from model responses, 
 * stripping markdown code blocks if present.
 */
const safeJsonParse = (text: string) => {
  try {
    const cleaned = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Raw text:", text);
    return null;
  }
};

export const fetchChapters = async (classLevel: string, subject: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List exactly 15 main chapters for ${classLevel} ${subject} (Latest 2024-25 Syllabus). Return ONLY a JSON array of strings. No extra text.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const chapters = safeJsonParse(response.text || "[]");
    return Array.isArray(chapters) && chapters.length > 0 ? chapters : ["Chapter 1", "Chapter 2", "Chapter 3"];
  } catch (error) {
    console.error("Chapter error:", error);
    return ["Introduction", "Core Principles", "Advanced Topics", "Practice Set"];
  }
};

interface StudyResponse {
  summary: string;
  questions: MCQQuestion[];
  revisionPoints: string[];
}

export const generateEducationalContent = async (config: StudyConfig): Promise<StudyResponse> => {
  const { classLevel, subject, contentType, chapter } = config;
  const isMCQ = contentType === 'MCQs';
  
  // Prompt optimized for speed and clarity
  const prompt = isMCQ 
    ? `Create 20 unique MCQs for ${classLevel} ${subject}, Chapter: ${chapter}. 
       Format: Array of objects with 'question', 'options' (4 strings), 'correctIndex' (0-3), and 'explanation'. 
       Target difficulty: Competitive exam level.`
    : `Generate 10 crucial revision bullet points for ${classLevel} ${subject}, Chapter: ${chapter}. Return as a JSON array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: isMCQ ? {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctIndex", "explanation"]
          }
        } : {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const parsedData = safeJsonParse(response.text || "[]");

    return {
      summary: `Detailed content for ${chapter}`,
      questions: isMCQ ? (Array.isArray(parsedData) ? parsedData : []) : [],
      revisionPoints: !isMCQ ? (Array.isArray(parsedData) ? parsedData : []) : []
    };
  } catch (error) {
    console.error("Content generation error:", error);
    throw error;
  }
};
