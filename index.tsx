
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- 1. TYPES ---
type ClassLevel = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12';
type ContentType = 'MCQs' | 'Quick Revision';

interface StudyConfig {
  classLevel: ClassLevel | null;
  subject: string | null;
  chapter: string | null;
  contentType: ContentType | null;
  isTeacherMode: boolean;
}

interface SearchResource {
  title: string;
  url: string;
  type: 'PDF' | 'Video' | 'Web';
  source: string;
}

enum AppStep {
  HOME = 0,
  CLASS_SELECT = 1,
  SUBJECT_SELECT = 2,
  CHAPTER_SELECT = 3,
  CONTENT_TYPE_SELECT = 4,
  RESULTS = 5
}

// --- 2. CONSTANTS ---
const CLASS_SUBJECTS: Record<ClassLevel, string[]> = {
  'Class 6': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi'],
  'Class 7': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi'],
  'Class 8': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi'],
  'Class 9': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi', 'Information Technology'],
  'Class 10': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi', 'Information Technology'],
  'Class 11': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Accountancy', 'Economics', 'Business Studies'],
  'Class 12': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Accountancy', 'Economics', 'Business Studies'],
};

// --- 3. UI COMPONENTS ---
const StepLayout: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  isLoading?: boolean;
  onThemeToggle: () => void;
  isDarkMode: boolean;
}> = ({ title, subtitle, children, onBack, isLoading, onThemeToggle, isDarkMode }) => (
  <div className="flex flex-col min-h-screen w-full bg-gray-50 dark:bg-black transition-colors duration-300">
    <div className="px-6 py-10 bg-indigo-600 dark:bg-indigo-950 text-white shadow-xl rounded-b-[2.5rem] mb-6 animate-fade-in relative z-10">
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 bg-white/10 rounded-xl active:scale-90 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-indigo-100 font-medium opacity-80 text-sm">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onThemeToggle} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform hover:bg-white/20">
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>
    </div>
    <div className="flex-1 px-6 pb-20 overflow-y-auto android-scroll max-w-7xl mx-auto w-full">
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-gray-800 dark:text-white text-lg">EduFinder is working...</p>
        </div>
      ) : children}
    </div>
  </div>
);

// --- 4. MAIN APP ---
const App = () => {
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [config, setConfig] = useState<StudyConfig>({ classLevel: null, subject: null, chapter: null, contentType: null, isTeacherMode: false });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chapters, setChapters] = useState<string[]>([]);
  const [results, setResults] = useState<{ content: string[], resources: SearchResource[] } | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const handleFetchChapters = async (grade: ClassLevel, sub: string) => {
    setIsLoading(true);
    setStep(AppStep.CHAPTER_SELECT);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `List official 2024-25 syllabus chapters for ${grade} ${sub}. Return ONLY a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const data = JSON.parse(response.text || "[]");
      setChapters(data);
    } catch (e) {
      setChapters(["Introduction", "Main Topics", "Practice Exercise"]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchContent = async (finalConfig: StudyConfig) => {
    setIsLoading(true);
    setStep(AppStep.RESULTS);
    try {
      const isMCQ = finalConfig.contentType === 'MCQs';
      const persona = finalConfig.isTeacherMode 
        ? "Professional Educator (focus on answer keys, worksheet quality, and pedagogical accuracy)" 
        : "Student (focus on easy learning, exam preparation, and clear explanations)";
      
      const prompt = isMCQ 
        ? `STRICT TASK: Find high-quality MCQ Practice Sets and PDF download links for ${finalConfig.classLevel} ${finalConfig.subject}, Chapter: ${finalConfig.chapter}. 
           Search for official educational websites and PDFs. 
           Persona: ${persona}.
           Do not generate a list of questions in text; focus on finding links for the user.`
        : `Write a quick point-wise revision summary for ${finalConfig.classLevel} ${finalConfig.subject}, Chapter: ${finalConfig.chapter}. 
           Persona: ${persona}.
           Provide 5 key facts. NO long paragraphs.
           Find the best high-quality YouTube revision video links for this topic.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });

      const text = response.text || "";
      
      let contentBlocks: string[] = [];
      if (!isMCQ) {
        contentBlocks = [text];
      }

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const resources: SearchResource[] = chunks.map((c: any) => {
        const uri = c.web?.uri || '#';
        const type: 'PDF' | 'Video' | 'Web' = uri.includes('youtube') ? 'Video' : uri.endsWith('.pdf') ? 'PDF' : 'Web';
        return {
          title: c.web?.title || 'Study Resource',
          url: uri,
          type: type,
          source: new URL(uri !== '#' ? uri : 'https://google.com').hostname.replace('www.', '')
        };
      }).filter((r: SearchResource) => r.url !== '#' && !r.url.includes('google.com/search')).slice(0, 6);

      setResults({ content: contentBlocks, resources });
    } catch (e) {
      alert("Search failed. Try shuffling!");
      setStep(AppStep.CONTENT_TYPE_SELECT);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setStep(AppStep.HOME); setResults(null); setChapters([]); };

  // --- RENDERING STEPS ---
  if (step === AppStep.HOME) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-800 to-blue-600 dark:from-indigo-950 dark:to-slate-900 text-white text-center transition-all">
        <button onClick={toggleTheme} className="absolute top-6 right-6 p-4 bg-white/10 rounded-2xl z-20 active:scale-90 transition-transform hover:bg-white/20">
          {isDarkMode ? '🌙' : '☀️'}
        </button>
        <div className="mb-10 relative">
          <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-30 animate-pulse"></div>
          <div className="relative bg-white/20 p-10 rounded-[3.5rem] backdrop-blur-xl border border-white/30 shadow-2xl">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-2 tracking-tighter">EduFinder</h1>
        <p className="text-xl md:text-2xl mb-12 font-medium text-blue-100 opacity-90">Instant Exam MCQs & Revision</p>
        <div className="w-full space-y-4 max-w-sm">
          <button onClick={() => setStep(AppStep.CLASS_SELECT)} className="w-full bg-white text-indigo-700 py-6 rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all hover:bg-gray-100">Start Learning</button>
          <div className="flex items-center justify-between px-6 py-4 bg-white/10 rounded-[1.5rem] border border-white/20">
            <span className="font-bold text-sm">Teacher Mode</span>
            <button 
              onClick={() => setConfig(prev => ({...prev, isTeacherMode: !prev.isTeacherMode}))} 
              className={`w-12 h-6 rounded-full transition-all relative ${config.isTeacherMode ? 'bg-green-400' : 'bg-white/40'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${config.isTeacherMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StepLayout 
      title={step === AppStep.CLASS_SELECT ? "Grade" : step === AppStep.SUBJECT_SELECT ? "Subject" : step === AppStep.CHAPTER_SELECT ? "Chapter" : step === AppStep.CONTENT_TYPE_SELECT ? "Goal" : "Results"} 
      subtitle={step === AppStep.CLASS_SELECT ? "Select your class level" : step === AppStep.SUBJECT_SELECT ? `Materials for ${config.classLevel}` : step === AppStep.CHAPTER_SELECT ? `Subject: ${config.subject}` : step === AppStep.CONTENT_TYPE_SELECT ? `Topic: ${config.chapter}` : (config.contentType === 'MCQs' ? 'Practice Links' : 'Quick Summary')}
      onBack={step === AppStep.RESULTS ? () => setStep(AppStep.CONTENT_TYPE_SELECT) : (step === AppStep.CLASS_SELECT ? () => setStep(AppStep.HOME) : () => setStep(step - 1))} 
      isLoading={isLoading}
      onThemeToggle={toggleTheme}
      isDarkMode={isDarkMode}
    >
      {step === AppStep.CLASS_SELECT && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
          {Object.keys(CLASS_SUBJECTS).map(c => (
            <button key={c} onClick={() => { setConfig({...config, classLevel: c as ClassLevel}); setStep(AppStep.SUBJECT_SELECT); }} className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-lg active:scale-95 border-2 border-transparent hover:border-indigo-500 transition-all flex flex-col items-center justify-center">
              <span className="text-4xl md:text-6xl font-black block text-gray-900 dark:text-white leading-none mb-2">{c.split(' ')[1]}</span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{c.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {step === AppStep.SUBJECT_SELECT && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.classLevel && CLASS_SUBJECTS[config.classLevel].map(s => (
            <button key={s} onClick={() => { setConfig({...config, subject: s}); handleFetchChapters(config.classLevel!, s); }} className="w-full p-6 bg-white dark:bg-gray-900 rounded-3xl flex justify-between items-center shadow-md active:scale-[0.98] transition-all hover:border-indigo-400 border border-transparent">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{s}</span>
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center">→</div>
            </button>
          ))}
        </div>
      )}

      {step === AppStep.CHAPTER_SELECT && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chapters.map((ch, i) => (
            <button key={i} onClick={() => { setConfig({...config, chapter: ch}); setStep(AppStep.CONTENT_TYPE_SELECT); }} className="w-full p-5 bg-white dark:bg-gray-900 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all border border-transparent hover:border-indigo-400">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black flex-shrink-0">{i+1}</div>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-left leading-tight">{ch}</span>
            </button>
          ))}
        </div>
      )}

      {step === AppStep.CONTENT_TYPE_SELECT && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['MCQs', 'Quick Revision'] as ContentType[]).map(t => (
            <button key={t} onClick={() => { const nc = {...config, contentType: t}; setConfig(nc); handleFetchContent(nc); }} className="w-full flex items-center gap-6 p-8 bg-white dark:bg-gray-900 shadow-xl rounded-[2.5rem] active:scale-[0.98] group transition-all border border-transparent hover:border-indigo-400">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${t === 'MCQs' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} group-hover:bg-indigo-600 group-hover:text-white transition-colors`}>
                {t === 'MCQs' ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> : <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              <div className="text-left">
                <span className="text-2xl font-black text-gray-900 dark:text-white block">{t}</span>
                <p className="text-sm font-medium text-gray-500">{t === 'MCQs' ? 'Find MCQ PDF Links' : 'YouTube Revision & Summary'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === AppStep.RESULTS && (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
          {config.contentType !== 'MCQs' && results?.content && results.content.length > 0 && (
            <div className="bg-emerald-600 text-white rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="font-black text-xl mb-6 uppercase tracking-tight flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                Quick Summary
              </h3>
              <div className="space-y-4">
                {results.content.map((q, i) => (
                  <div key={i} className="bg-white/10 p-5 rounded-2xl border border-white/5 backdrop-blur-md">
                    <p className="text-sm font-bold leading-relaxed whitespace-pre-line">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="px-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {config.contentType === 'MCQs' ? 'Verified MCQ Links & PDFs' : 'Recommended Study Resources'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results?.resources.map((res, i) => (
                <a key={i} href={res.url} target="_blank" className="block p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl active-scale hover:border-indigo-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xs shrink-0 ${res.type === 'PDF' ? 'bg-rose-500' : res.type === 'Video' ? 'bg-red-600' : 'bg-blue-600'}`}>
                      {res.type === 'PDF' ? 'PDF' : res.type === 'Video' ? 'Play' : 'Web'}
                    </div>
                    <div className="flex-1 overflow-hidden text-left">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white truncate">{res.title}</h3>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{res.source}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {(!results?.resources || results.resources.length === 0) && (
              <div className="text-center py-20 text-gray-400 font-medium italic">No links found for this chapter yet. Try shuffling.</div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => handleFetchContent(config)} className="w-full py-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-blue-200">Shuffle / Find More</button>
            <button onClick={reset} className="w-full py-6 bg-gray-900 dark:bg-white dark:text-black text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all hover:opacity-90">Start New Search</button>
          </div>
        </div>
      )}
    </StepLayout>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
