
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

  if (step === AppStep.HOME) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 text-white text-center">
        <div className="absolute top-6 right-6">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg transition-transform active:scale-90">
            {isDarkMode ? '🌙' : '☀️'}
          </button>
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

  if (step === AppStep.CLASS_SELECT) {
    const classes: ClassLevel[] = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
    return (
      <StepLayout title="Grade" subtitle="Select your grade level" onBack={prevStep}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
          {classes.map(c => (
            <button 
              key={c}
              onClick={() => selectClass(c)}
              className="p-8 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-blue-500 rounded-3xl text-center transition-all group active:scale-95 flex flex-col items-center justify-center"
            >
              <span className="text-3xl md:text-5xl font-black block dark:text-white group-hover:text-blue-600 mb-2">{c.split(' ')[1]}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{c.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </StepLayout>
    );
  }

  if (step === AppStep.SUBJECT_SELECT && config.classLevel) {
    const subjects = CLASS_SUBJECTS[config.classLevel];
    return (
      <StepLayout title="Subject" subtitle={`Latest syllabus for ${config.classLevel}`} onBack={prevStep}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <button 
              key={s}
              onClick={() => selectSubject(s)}
              className="w-full p-5 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl text-left flex justify-between items-center group shadow-sm hover:shadow-md transition-all"
            >
              <span className="text-lg font-bold dark:text-white">{s}</span>
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))}
        </div>
      </StepLayout>
    );
  }

  if (step === AppStep.CHAPTER_SELECT) {
    return (
      <StepLayout title="Chapter" subtitle={`Curriculum: ${config.subject}`} onBack={prevStep}>
        {isLoading ? (
          <div className="flex flex-col items-center py-20 animate-pulse">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-3xl mb-4"></div>
            <p className="text-gray-500 font-bold">Identifying Chapters...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.map((ch, i) => (
              <button 
                key={i}
                onClick={() => selectChapter(ch)}
                className="w-full p-5 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl text-left hover:border-blue-500 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <div className="flex gap-4 items-center">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl text-sm font-black">{i + 1}</div>
                  <span className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{ch}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </StepLayout>
    );
  }

  if (step === AppStep.CONTENT_TYPE_SELECT) {
    const types: ContentType[] = ['MCQs', 'Quick Revision'];
    return (
      <StepLayout title="Select Goal" subtitle={`Focusing on: ${config.chapter}`} onBack={prevStep}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {types.map(t => (
            <button 
              key={t}
              onClick={() => selectContentType(t)}
              className="flex items-center gap-6 p-8 bg-white dark:bg-gray-700 border-2 border-transparent shadow-sm rounded-[2rem] hover:border-blue-500 hover:shadow-xl transition-all text-left group"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                t === 'MCQs' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              } group-hover:bg-blue-600 group-hover:text-white`}>
                {CONTENT_TYPE_ICONS[t]}
              </div>
              <div>
                <span className="text-2xl font-black block dark:text-white">{t}</span>
                <p className="text-sm font-medium text-gray-500">
                  {t === 'MCQs' ? 'Direct Practice & PDF Links' : 'YouTube revision videos & summary'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </StepLayout>
    );
  }

  if (step === AppStep.RESULTS) {
    const bestMatch = results?.resources[0];
    const otherMatches = results?.resources.slice(1) || [];
    const isRevision = config.contentType === 'Quick Revision';

    return (
      <StepLayout title={isRevision ? "Quick Revision" : "MCQ Links"} onBack={prevStep} nextLabel="Finish" onNext={resetApp}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 mb-8 relative">
              <div className="absolute inset-0 border-8 border-blue-600/10 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">Analyzing Content...</h2>
            <p className="text-sm font-medium text-gray-500 mt-2 px-10">Fetching fresh data for {config.chapter}</p>
          </div>
        ) : results ? (
          <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* VARIETY TOGGLE */}
            <div className="flex justify-end">
              <button 
                onClick={() => handleSearch(config)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Find More
              </button>
            </div>

            {/* DIRECT VIEW - Only for Revision, Hide for MCQs as requested */}
            {isRevision && results.sampleQuestions.length > 0 && (
              <div className="bg-emerald-600 text-white rounded-[2.5rem] p-6 shadow-2xl border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  <h3 className="font-black text-lg tracking-tight uppercase">Quick Summary</h3>
                </div>
                <div className="space-y-4">
                  {results.sampleQuestions.map((q, i) => (
                    <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                      <p className="text-sm font-bold leading-relaxed whitespace-pre-line">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Section */}
            {bestMatch && (
              <div className="relative group max-w-3xl mx-auto w-full">
                <div className={`absolute -inset-1 bg-gradient-to-r rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 ${
                  isRevision ? 'from-emerald-600 to-teal-600' : 'from-blue-600 to-indigo-600'
                }`}></div>
                <div className="relative p-6 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                   <div className={`absolute top-0 right-0 px-4 py-2 text-white text-[10px] font-black uppercase rounded-bl-2xl ${
                     isRevision ? 'bg-emerald-600' : 'bg-blue-600'
                   }`}>Top Match: {bestMatch.type}</div>
                   
                   <div className="flex items-center gap-4 mb-6 mt-2">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                         bestMatch.type === 'PDF' ? 'bg-rose-500' : bestMatch.type === 'Video' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}>
                         {bestMatch.type === 'PDF' ? 'PDF' : bestMatch.type === 'Video' ? (
                           <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.333-5.89a1.5 1.5 0 000-2.538L6.3 2.841z"/></svg>
                         ) : 'Web'}
                      </div>
                      <div className="flex-1">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{bestMatch.source}</span>
                         <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{bestMatch.title}</h3>
                      </div>
                   </div>
                   
                   <div className="flex gap-3">
                      <a href={bestMatch.url} target="_blank" className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl text-center font-black hover:bg-gray-200 transition-all">Preview</a>
                      <a href={bestMatch.url} target="_blank" className={`flex-1 py-4 text-white rounded-2xl text-center font-black shadow-lg transition-all ${
                        isRevision ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                      }`}>
                        {bestMatch.type === 'Video' ? 'Play Video' : bestMatch.isDownloadable ? 'Download PDF' : 'Visit Site'}
                      </a>
                   </div>
                </div>
              </div>
            )}

            {/* Other Resources */}
            <div className="space-y-4">
               <h3 className="px-4 text-xs font-black text-gray-400 uppercase tracking-widest">More Educational Resources</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {otherMatches.length > 0 ? otherMatches.map((res, i) => (
                   <div key={i} className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800/50 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 group hover:border-blue-400 transition-all">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                         res.type === 'PDF' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : res.type === 'Video' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                      }`}>
                         {res.type === 'PDF' ? 'PDF' : res.type === 'Video' ? 'VOD' : 'WEB'}
                      </div>
                      <div className="flex-1 overflow-hidden">
                         <h4 className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600">{res.title}</h4>
                         <span className="text-[10px] font-bold text-gray-400 uppercase">{res.source}</span>
                      </div>
                      <a href={res.url} target="_blank" className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-400 hover:text-blue-600 transition-colors">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                   </div>
                 )) : (
                   <div className="text-center py-10 opacity-40 italic text-sm col-span-full">Searching for more resources...</div>
                 )}
               </div>
            </div>
            
            <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-700 max-w-4xl mx-auto w-full">
               <p className="text-sm text-gray-500 leading-relaxed font-bold italic text-center">
                  "EduFinder scans official databases in real-time. Use the 'Find More' button if you need different practice sets or more revision sources!"
               </p>
            </div>
          </div>
        ) : null}
      </StepLayout>
    );
  }

  return null;
};

export default App;
