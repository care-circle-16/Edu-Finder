
import React, { useState, useEffect } from 'react';
import { StudyConfig, AppStep, ClassLevel, ContentType, SearchResult } from './types';
import { CLASS_SUBJECTS, CONTENT_TYPE_ICONS } from './constants';
import StepLayout from './components/StepLayout';
import { fetchEducationalContent, fetchChapters } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [config, setConfig] = useState<StudyConfig>({
    classLevel: null,
    subject: null,
    contentType: null,
    chapter: null,
    isTeacherMode: false,
  });
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chapters, setChapters] = useState<string[]>([]);
  const [results, setResults] = useState<{summary: string, sampleQuestions: string[], resources: SearchResult[]} | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleStart = () => setStep(AppStep.CLASS_SELECT);

  const selectClass = (level: ClassLevel) => {
    setConfig(prev => ({ ...prev, classLevel: level, subject: null, chapter: null }));
    nextStep();
  };

  const selectSubject = async (subject: string) => {
    setConfig(prev => ({ ...prev, subject }));
    setIsLoading(true);
    nextStep();
    try {
      const list = await fetchChapters(config.classLevel!, subject);
      setChapters(list);
    } catch (err) {
      setChapters(["Core Overview", "Important MCQs", "Exam Preparation"]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectChapter = (chapter: string) => {
    setConfig(prev => ({ ...prev, chapter }));
    nextStep();
  };

  const selectContentType = (type: ContentType) => {
    const updatedConfig = { ...config, contentType: type };
    setConfig(updatedConfig);
    handleSearch(updatedConfig);
  };

  const handleSearch = async (currentConfig: StudyConfig) => {
    setIsLoading(true);
    setStep(AppStep.RESULTS);
    try {
      const data = await fetchEducationalContent(currentConfig);
      setResults(data);
    } catch (err) {
      alert("Search failed. Shuffling again...");
      setStep(AppStep.CONTENT_TYPE_SELECT);
    } finally {
      setIsLoading(false);
    }
  };

  const resetApp = () => {
    setConfig({
      classLevel: null,
      subject: null,
      contentType: null,
      chapter: null,
      isTeacherMode: config.isTeacherMode,
    });
    setResults(null);
    setChapters([]);
    setStep(AppStep.HOME);
  };

  const ThemeToggle = () => (
    <button onClick={toggleTheme} className="p-3 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md shadow-lg transition-transform active:scale-90 border border-white/20">
      {isDarkMode ? '🌙' : '☀️'}
    </button>
  );

  if (step === AppStep.HOME) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 text-white text-center">
        <div className="absolute top-6 right-6">
           <ThemeToggle />
        </div>
        <div className="mb-8 relative">
           <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-30 animate-pulse"></div>
           <div className="relative bg-white/20 p-8 rounded-[2.5rem] backdrop-blur-xl border border-white/30 shadow-2xl">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
           </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-3 tracking-tighter">EduFinder</h1>
        <p className="text-xl md:text-2xl mb-12 text-blue-100 font-medium opacity-90">Instant Exam MCQs & Quick Revision</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button 
            onClick={handleStart}
            className="bg-white text-blue-700 px-8 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            Start Learning
          </button>
          <div className="flex items-center justify-between px-6 py-4 bg-white/10 rounded-[1.5rem] border border-white/20">
             <span className="text-sm font-bold">Teacher Mode</span>
             <button 
              onClick={() => setConfig(c => ({...c, isTeacherMode: !c.isTeacherMode}))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${config.isTeacherMode ? 'bg-green-400' : 'bg-white/20'}`}
             >
               <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${config.isTeacherMode ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {step === AppStep.CLASS_SELECT && (
        <StepLayout title="Grade" subtitle="Select your grade level" onBack={prevStep}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
            {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
              <button 
                key={c}
                onClick={() => selectClass(c as ClassLevel)}
                className="p-8 bg-white dark:bg-gray-700/50 border-2 border-transparent hover:border-blue-500 rounded-3xl text-center shadow-md transition-all group active:scale-95 flex flex-col items-center justify-center"
              >
                <span className="text-3xl md:text-5xl font-black block text-slate-900 dark:text-white group-hover:text-blue-600 mb-2">{c.split(' ')[1]}</span>
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">{c.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.SUBJECT_SELECT && config.classLevel && (
        <StepLayout title="Subject" subtitle={`Latest syllabus for ${config.classLevel}`} onBack={prevStep}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLASS_SUBJECTS[config.classLevel].map(s => (
              <button 
                key={s}
                onClick={() => selectSubject(s)}
                className="w-full p-6 bg-white dark:bg-gray-700 border border-slate-100 dark:border-gray-600 rounded-2xl text-left flex justify-between items-center group shadow-md hover:shadow-lg transition-all"
              >
                <span className="text-lg font-bold text-slate-900 dark:text-white">{s}</span>
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.CHAPTER_SELECT && (
        <StepLayout title="Chapter" subtitle={`Curriculum: ${config.subject}`} onBack={prevStep}>
          {isLoading ? (
            <div className="flex flex-col items-center py-20 animate-pulse">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-3xl mb-4"></div>
              <p className="text-slate-500 font-bold">Identifying Chapters...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapters.map((ch, i) => (
                <button 
                  key={i}
                  onClick={() => selectChapter(ch)}
                  className="w-full p-5 bg-white dark:bg-gray-700 border border-slate-100 dark:border-gray-600 rounded-2xl text-left hover:border-blue-500 shadow-md hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  <div className="flex gap-4 items-center">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl text-sm font-black">{i + 1}</div>
                    <span className="font-bold text-slate-900 dark:text-gray-100 leading-tight">{ch}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </StepLayout>
      )}

      {step === AppStep.CONTENT_TYPE_SELECT && (
        <StepLayout title="Select Goal" subtitle={`Focusing on: ${config.chapter}`} onBack={prevStep}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {(['MCQs', 'Quick Revision'] as ContentType[]).map(t => (
              <button 
                key={t}
                onClick={() => selectContentType(t)}
                className="flex items-center gap-6 p-8 bg-white dark:bg-gray-700 border-2 border-transparent shadow-lg rounded-[2rem] hover:border-blue-500 hover:shadow-xl transition-all text-left group"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  t === 'MCQs' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                } group-hover:bg-blue-600 group-hover:text-white`}>
                  {CONTENT_TYPE_ICONS[t]}
                </div>
                <div>
                  <span className="text-2xl font-black block text-slate-900 dark:text-white">{t}</span>
                  <p className="text-sm font-medium text-slate-500">
                    {t === 'MCQs' ? 'Direct Practice & PDF Links' : 'YouTube revision videos & summary'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.RESULTS && results && (
        <StepLayout title={config.contentType === 'Quick Revision' ? "Quick Revision" : "MCQ Links"} onBack={prevStep} nextLabel="Finish" onNext={resetApp}>
          <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                 {config.isTeacherMode && <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase">Teacher Mode</span>}
              </div>
              <button 
                onClick={() => handleSearch(config)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-colors"
              >
                Find More
              </button>
            </div>

            {config.contentType === 'Quick Revision' && (
              <div className="bg-emerald-600 text-white rounded-[2.5rem] p-6 shadow-2xl border border-white/10">
                <h3 className="font-black text-lg tracking-tight uppercase mb-4">Quick Summary</h3>
                <div className="space-y-4">
                  {results.sampleQuestions.map((q, i) => (
                    <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                      <p className="text-sm font-bold leading-relaxed whitespace-pre-line">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {results.resources.map((res, i) => (
                 <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="block p-6 bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-lg active:scale-95 hover:border-blue-500 transition-all group">
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[10px] ${res.type === 'PDF' ? 'bg-rose-500' : res.type === 'Video' ? 'bg-red-600' : 'bg-blue-500'}`}>
                        {res.type}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.source}</span>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600">{res.title}</h4>
                      </div>
                    </div>
                 </a>
               ))}
            </div>
            
            <button onClick={resetApp} className="w-full py-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">Done</button>
          </div>
        </StepLayout>
      )}

      {isLoading && step === AppStep.RESULTS && (
         <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[100]">
            <div className="w-20 h-20 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-xl font-black text-slate-900 dark:text-white">Analyzing Resources...</p>
         </div>
      )}
    </div>
  );
};

export default App;
