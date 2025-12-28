
import { GoogleGenAI, Type } from "@google/genai";
import { StudyConfig, SearchResult } from "../types";

// Correct SDK initialization pattern
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const fetchChapters = async (classLevel: string, subject: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List the exact official chapters for ${classLevel} ${subject} according to the latest 2024-25 syllabus. Return ONLY a JSON array of strings representing chapter names.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return ["Introduction", "Core Concepts", "Standard Practice"]; 
  }
};

interface StudyResponse {
  summary: string;
  sampleQuestions: string[];
  resources: SearchResult[];
}

export const fetchEducationalContent = async (config: StudyConfig): Promise<StudyResponse> => {
  const { classLevel, subject, contentType, chapter, isTeacherMode } = config;
  
  const varietySeed = Math.floor(Math.random() * 10000);
  const persona = isTeacherMode 
    ? "Expert Teacher (Focus on worksheets, detailed answer keys, and professional lesson plans)" 
    : "Student (Focus on simple explanations, easy revision points, and clear notes)";
  
  let prompt = '';
  if (contentType === 'MCQs') {
    prompt = `
      STRICT TASK: Search for high-quality Multiple Choice Questions (MCQ) PDF sets for ${classLevel} ${subject}, Chapter: "${chapter}".
      Seed ID: ${varietySeed}.
      
      Persona: ${persona}.
      Requirement: Provide a brief summary of what this chapter covers for a ${isTeacherMode ? 'teacher' : 'student'}. 
      Then, find the best direct educational links and PDFs for practice.
    `;
  } else {
    prompt = `
      Task: Provide the top 5 essential QUICK REVISION facts for ${classLevel} ${subject}, Chapter: "${chapter}".
      Persona: ${persona}.
      Search for official revision notes and high-quality YouTube tutorial links for this specific topic.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    let facts: string[] = text.split('\n')
      .filter(line => line.trim().length > 25 && !line.includes('http'))
      .slice(0, 5)
      .map(s => s.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim());

    if (facts.length === 0) {
      facts = ["No quick summary available. Please check the resources below."];
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const resources: SearchResult[] = chunks.map((chunk: any) => {
      const url = chunk.web?.uri || '#';
      const title = chunk.web?.title || 'Educational Link';
      const isPDF = url.toLowerCase().endsWith('.pdf') || title.toLowerCase().includes('pdf');
      const isVideo = url.includes('youtube.com') || url.includes('youtu.be') || title.toLowerCase().includes('video');
      
      let type: 'PDF' | 'Video' | 'Web' = 'Web';
      if (isPDF) type = 'PDF';
      else if (isVideo) type = 'Video';

      return {
        title, url, type,
        source: new URL(url !== '#' ? url : 'https://google.com').hostname.replace('www.', ''),
        isDownloadable: isPDF,
        relevanceScore: contentType === 'Quick Revision' && isVideo ? 10 : (isPDF ? 9 : 5)
      };
    })
    .filter((r: SearchResult) => r.url !== '#' && !r.url.includes('google.com/search'))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return { 
      summary: text, 
      sampleQuestions: facts,
      resources 
    };
  } catch (error) {
    console.error("Error fetching content:", error);
    throw error;
  }
};
