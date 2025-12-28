
import React, { useState, useEffect } from 'react';
import { StudyConfig, AppStep, ClassLevel, ContentType, MCQQuestion } from './types';
import { CLASS_SUBJECTS, CONTENT_TYPE_ICONS } from './constants';
import StepLayout from './components/StepLayout';
import { generateEducationalContent, fetchChapters } from './services/geminiService';

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
  const [mcqData, setMcqData] = useState<MCQQuestion[]>([]);
  const [revisionData, setRevisionData] = useState<string[]>([]);
  
  // Quiz State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [isScoreView, setIsScoreView] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const selectClass = (level: ClassLevel) => {
    setConfig(prev => ({ ...prev, classLevel: level, subject: null }));
    setStep(AppStep.SUBJECT_SELECT);
  };

  const selectSubject = async (subject: string) => {
    setConfig(prev => ({ ...prev, subject, chapter: null, contentType: null }));
    setIsLoading(true);
    try {
      const list = await fetchChapters(config.classLevel!, subject);
      setChapters(list);
      setStep(AppStep.CHAPTER_SELECT);
    } catch (err) {
      setChapters(["Chapter 1: Introduction", "Chapter 2: Essential Concepts", "Chapter 3: Final Review"]);
      setStep(AppStep.CHAPTER_SELECT);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchContent = async (targetType: ContentType) => {
    const updatedConfig = { ...config, contentType: targetType };
    setConfig(updatedConfig);
    setIsLoading(true);
    try {
      const data = await generateEducationalContent(updatedConfig);
      
      if (targetType === 'MCQs') {
        if (!data.questions || data.questions.length === 0) {
          throw new Error("No questions were generated.");
        }
        setMcqData(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(null));
      } else {
        setRevisionData(data.revisionPoints);
      }
      
      setCurrentIdx(0);
      setIsScoreView(false);
      setStep(AppStep.RESULTS);
    } catch (err) {
      console.error("Generation error:", err);
      alert("AI was unable to generate content for this topic. Please try again or pick a different chapter.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (optIdx: number) => {
    if (userAnswers[currentIdx] !== null) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = optIdx;
    setUserAnswers(newAnswers);
  };

  const resetApp = () => {
    setStep(AppStep.HOME);
    setMcqData([]);
    setRevisionData([]);
    setUserAnswers([]);
    setCurrentIdx(0);
    setIsScoreView(false);
    setConfig({
      classLevel: null,
      subject: null,
      contentType: null,
      chapter: null,
      isTeacherMode: config.isTeacherMode,
    });
  };

  const calculateScore = () => userAnswers.filter((ans, i) => ans === mcqData[i]?.correctIndex).length;

  const getLoadingText = () => {
    if (step === AppStep.SUBJECT_SELECT) return "Analyzing Chapters...";
    if (step === AppStep.CONTENT_TYPE_SELECT || config.contentType) {
        return config.contentType === 'MCQs' ? "Generating 20 MCQs..." : "Preparing Revision Guide...";
    }
    return "Cooking for you...";
  };

  // --- SUB-VIEWS ---

  const StudentQuiz = () => {
    const q = mcqData[currentIdx];
    if (!q) return (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">No MCQs Available</h3>
          <p className="text-slate-500 mb-8">Bro, we couldn't load questions for this chapter. Go back and try again.</p>
          <button onClick={() => setStep(AppStep.CHAPTER_SELECT)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black">Back to Chapters</button>
        </div>
    );

    const answered = userAnswers[currentIdx] !== null;

    if (isScoreView) {
      const score = calculateScore();
      return (
        <div className="text-center py-10 animate-fade-in max-w-lg mx-auto">
          <div className="w-32 h-32 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 text-4xl font-black border-8 border-indigo-200 shadow-2xl">
            {mcqData.length > 0 ? Math.round((score / mcqData.length) * 100) : 0}%
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Quiz Finished!</h2>
          <p className="text-xl font-bold text-slate-500 mb-10">You got {score} out of {mcqData.length} correct.</p>
          <div className="space-y-4">
            <button onClick={() => { setIsScoreView(false); setCurrentIdx(0); setUserAnswers(new Array(mcqData.length).fill(null)); }} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg active-scale shadow-lg">Retry Quiz</button>
            <button onClick={resetApp} className="w-full py-5 bg-slate-200 dark:bg-gray-800 text-slate-900 dark:text-white rounded-[1.5rem] font-black text-lg active-scale">New Topic</button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto animate-fade-in pb-12">
        <div className="mb-6 flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
          <span>Question {currentIdx + 1} of {mcqData.length}</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-black">Score: {calculateScore()}</span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-gray-800 rounded-full mb-10 overflow-hidden shadow-inner">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentIdx + 1) / mcqData.length) * 100}%` }} />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 leading-tight">{q.question}</h2>

        <div className="space-y-4 mb-10">
          {q.options.map((opt, i) => {
            const isSelected = userAnswers[currentIdx] === i;
            const isCorrect = i === q.correctIndex;
            let btnClass = "w-full p-6 text-left rounded-[1.5rem] border-2 font-bold text-lg transition-all flex items-center justify-between ";
            
            if (!answered) btnClass += "bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-700 text-slate-900 dark:text-white hover:border-indigo-400 shadow-sm";
            else if (isSelected && isCorrect) btnClass += "bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-lg";
            else if (isSelected && !isCorrect) btnClass += "bg-rose-500 border-rose-500 text-white shadow-rose-200 shadow-lg";
            else if (isCorrect) btnClass += "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 opacity-60";
            else btnClass += "bg-slate-100 dark:bg-gray-800 border-transparent text-slate-400 dark:text-gray-600 opacity-30";

            return (
              <button key={i} onClick={() => handleAnswerSelect(i)} disabled={answered} className={btnClass}>
                <span>{opt}</span>
                {answered && isCorrect && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                {answered && isSelected && !isCorrect && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="animate-fade-in">
            <div className="p-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] mb-8 border border-indigo-100 dark:border-indigo-800 shadow-sm">
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Detailed Answer</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{q.explanation}</p>
            </div>
            <button 
              onClick={() => { if (currentIdx < mcqData.length - 1) setCurrentIdx(currentIdx + 1); else setIsScoreView(true); }}
              className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-xl shadow-xl active-scale"
            >
              {currentIdx < mcqData.length - 1 ? 'Next Question' : 'View Results'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const TeacherView = () => (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="bg-emerald-600 text-white px-8 py-6 rounded-[2rem] shadow-xl border border-emerald-500/30 flex items-center gap-6">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2 2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
        </div>
        <div>
          <h3 className="font-black text-xl">Teacher Worksheet Tool</h3>
          <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Master Answer Key: {config.chapter}</p>
        </div>
      </div>

      <div className="space-y-6">
        {mcqData.map((q, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-lg border border-slate-100 dark:border-gray-700">
            <div className="flex gap-4 mb-6">
              <span className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black flex-shrink-0 text-sm shadow-md">{i+1}</span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight pt-1">{q.question}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 ml-14">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`p-4 rounded-2xl border font-bold text-sm ${oi === q.correctIndex ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-400'}`}>
                  {String.fromCharCode(65 + oi)}. {opt}
                </div>
              ))}
            </div>
            <div className="ml-14 p-6 bg-slate-50 dark:bg-gray-900 rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 shadow-inner">
               <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Correct Logic</span>
               <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{q.explanation}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={resetApp} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-xl shadow-2xl active-scale">New Session</button>
    </div>
  );

  // --- NAVIGATION ---
  
  const handleBack = () => {
    if (step === AppStep.HOME) return;
    if (step === AppStep.RESULTS) setStep(AppStep.CONTENT_TYPE_SELECT);
    else if (step === AppStep.CHAPTER_SELECT) setStep(AppStep.SUBJECT_SELECT);
    else setStep(step - 1);
  };

  if (step === AppStep.HOME) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-800 to-blue-700 dark:from-indigo-950 dark:to-black text-white text-center">
        <button onClick={toggleTheme} className="absolute top-6 right-6 p-4 bg-white/10 rounded-2xl border border-white/20 active-scale shadow-lg">
          {isDarkMode ? '🌙' : '☀️'}
        </button>
        <div className="mb-10 p-12 bg-white/10 rounded-[4rem] backdrop-blur-2xl border border-white/20 shadow-2xl relative">
          <div className="absolute inset-0 bg-blue-400 blur-[80px] opacity-20 animate-pulse"></div>
          <svg className="w-24 h-24 text-white relative" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <h1 className="text-7xl md:text-9xl font-black mb-4 tracking-tighter">EduFinder</h1>
        <p className="text-xl md:text-2xl mb-12 font-medium opacity-80 tracking-tight">Auto-Gen 20 MCQs Instantly</p>
        <div className="w-full max-w-sm space-y-4">
          <button onClick={() => setStep(AppStep.CLASS_SELECT)} className="w-full bg-white text-indigo-700 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl active-scale">Start Learning</button>
          <div className="flex items-center justify-between px-8 py-5 bg-white/10 rounded-[2.5rem] border border-white/20 backdrop-blur-lg">
            <div className="text-left">
              <span className="block font-black text-sm">Teacher Mode</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Worksheet Creation</span>
            </div>
            <button onClick={() => setConfig(c => ({...c, isTeacherMode: !c.isTeacherMode}))} className={`w-14 h-8 rounded-full transition-all relative ${config.isTeacherMode ? 'bg-emerald-400' : 'bg-white/30'}`}>
              <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${config.isTeacherMode ? 'left-8' : 'left-1.5'}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-6 z-[60]">
        <button onClick={toggleTheme} className="p-3 bg-white/10 dark:bg-white/5 rounded-2xl backdrop-blur-md border border-white/20 active-scale shadow-sm">
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>

      {step === AppStep.CLASS_SELECT && (
        <StepLayout title="Grade" subtitle="Choose your educational level" onBack={handleBack}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
              <button key={c} onClick={() => selectClass(c as ClassLevel)} className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border-2 border-transparent hover:border-indigo-500 active-scale transition-all flex flex-col items-center group">
                <span className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-1 leading-none group-hover:text-indigo-600 transition-colors">{c.split(' ')[1]}</span>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Standard</span>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.SUBJECT_SELECT && (
        <StepLayout title="Subject" subtitle={`Level: ${config.classLevel}`} onBack={handleBack}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASS_SUBJECTS[config.classLevel as ClassLevel]?.map(s => (
              <button key={s} onClick={() => selectSubject(s)} className="p-8 bg-white dark:bg-gray-800 rounded-[2rem] flex justify-between items-center shadow-lg active-scale border border-slate-100 dark:border-gray-700 group">
                <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{s}</span>
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.CHAPTER_SELECT && (
        <StepLayout title="Chapter" subtitle={`Subject: ${config.subject}`} onBack={handleBack}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => { setConfig(p => ({...p, chapter: ch})); setStep(AppStep.CONTENT_TYPE_SELECT); }} className="p-6 bg-white dark:bg-gray-800 rounded-[1.5rem] flex items-center gap-5 shadow-md border border-slate-100 dark:border-gray-700 active-scale hover:border-indigo-500 transition-all text-left group">
                <span className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black flex-shrink-0 shadow-lg text-sm">{i+1}</span>
                <span className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600">{ch}</span>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.CONTENT_TYPE_SELECT && (
        <StepLayout title="Select Goal" subtitle={config.chapter || ""} onBack={handleBack}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {(['MCQs', 'Quick Revision'] as ContentType[]).map(t => (
              <button key={t} onClick={() => handleFetchContent(t)} className="p-12 bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-2xl border-2 border-transparent hover:border-indigo-500 group transition-all text-left active-scale">
                <div className={`w-24 h-24 rounded-[2rem] mb-10 flex items-center justify-center transition-all ${t === 'MCQs' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'} group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white shadow-lg`}>
                  {CONTENT_TYPE_ICONS[t]}
                </div>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">{t}</h3>
                <p className="text-base font-bold text-slate-400 leading-tight">{t === 'MCQs' ? '20-question comprehensive challenge' : 'Key facts and revision highlights'}</p>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.RESULTS && (
        <StepLayout title={config.contentType === 'MCQs' ? 'Quiz Zone' : 'Revision Hub'} onBack={handleBack}>
           {config.contentType === 'MCQs' ? (
             config.isTeacherMode ? <TeacherView /> : <StudentQuiz />
           ) : (
             <div className="max-w-4xl mx-auto space-y-6 pb-12">
               <div className="bg-indigo-700 text-white p-10 rounded-[3rem] shadow-2xl border border-white/10">
                 <h2 className="text-3xl font-black mb-10 flex items-center gap-3">
                   <div className="p-2 bg-white/20 rounded-xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                   Chapter Highlights
                 </h2>
                 <div className="space-y-4">
                    {revisionData.map((point, i) => (
                      <div key={i} className="flex gap-5 p-6 bg-white/10 rounded-[1.5rem] border border-white/5 backdrop-blur-md">
                        <span className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center font-black flex-shrink-0 text-sm">{i+1}</span>
                        <p className="font-bold leading-relaxed text-lg">{point}</p>
                      </div>
                    ))}
                 </div>
               </div>
               <button onClick={resetApp} className="w-full py-7 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-2xl active-scale shadow-2xl">Return Home</button>
             </div>
           )}
        </StepLayout>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-24 h-24 border-[10px] border-indigo-600 border-t-transparent rounded-full animate-spin mb-10 shadow-2xl"></div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">{getLoadingText()}</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">Bro is hard at work...</p>
        </div>
      )}
    </div>
  );
};

export default App;
