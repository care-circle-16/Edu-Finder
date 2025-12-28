
import { GoogleGenAI, Type } from "@google/genai";
import { StudyConfig, SearchResult } from "../types";

// Correct SDK initialization pattern as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  const persona = isTeacherMode ? "teacher materials (lesson plans, keys)" : "student materials (simple notes)";
  
  let prompt = '';
  if (contentType === 'MCQs') {
    prompt = `
      STRICT TASK: Generate exactly 4 high-quality Multiple Choice Questions (MCQs) for ${classLevel} ${subject}, Chapter: "${chapter}".
      Seed ID: ${varietySeed}.

      REQUIREMENTS:
      1. Provide ONLY the MCQs. NO introductory or closing text.
      2. Each MCQ must have 4 clear options (A, B, C, D).
      3. The Correct Answer must be provided at the end of each question.
      4. DO NOT provide descriptive or statement questions without options.
      5. Separate each question block with '###'.

      Format:
      [Question Text]
      A) [Option]
      B) [Option]
      C) [Option]
      D) [Option]
      Answer: [Option]
      
      Persona: ${persona}.
      Search for direct deep links (PDFs) from trusted sites like NCERT, BYJUS, LearnCBSE.
    `;
  } else {
    prompt = `
      Task: Find the best QUICK REVISION facts for ${classLevel} ${subject}, Chapter: "${chapter}".
      1. Provide exactly 5 bullet points of crucial facts.
      2. Provide high-quality YouTube video tutorial links for "${chapter}" revision.
      3. Focus on trusted educational YouTube channels.
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
    
    let sampleQuestions: string[] = [];
    if (contentType === 'MCQs') {
      // Split by delimiter if used, otherwise look for A) patterns
      if (text.includes('###')) {
        sampleQuestions = text.split('###').map(b => b.trim()).filter(b => b.length > 20);
      } else {
        const blocks = text.split(/\n\s*\n/);
        sampleQuestions = blocks
          .filter(b => (b.includes('A)') || b.includes('A.')) && b.toLowerCase().includes('answer'))
          .slice(0, 4)
          .map(b => b.trim());
      }
    } else {
      sampleQuestions = text.split('\n')
        .filter(line => line.trim().length > 30 && !line.includes('http'))
        .slice(0, 4)
        .map(s => s.trim());
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const resources: SearchResult[] = chunks.map((chunk: any) => {
      const url = chunk.web?.uri || '#';
      const title = chunk.web?.title || 'Educational Resource';
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
      sampleQuestions: sampleQuestions.length > 0 ? sampleQuestions : ["Searching for direct MCQs... please check the resource links below."],
      resources 
    };
  } catch (error) {
    console.error("Error fetching content:", error);
    throw error;
  }
};
