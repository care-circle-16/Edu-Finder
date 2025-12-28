
import React, { useState, useEffect, useRef } from 'react';
import { StudyConfig, AppStep, ClassLevel, ContentType, MCQQuestion, ChapterPerformance } from './types';
import { CLASS_SUBJECTS, CONTENT_TYPE_ICONS } from './constants';
import StepLayout from './components/StepLayout';
import { generateEducationalContent, fetchChapters } from './services/geminiService';
import { saveQuizPerformance, getPracticeSuggestions, getGlobalPerformance } from './services/performanceService';

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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [chapters, setChapters] = useState<string[]>([]);
  const [mcqData, setMcqData] = useState<MCQQuestion[]>([]);
  const [revisionData, setRevisionData] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<ChapterPerformance[]>([]);
  const [globalStats, setGlobalStats] = useState({ avg: 0, totalQuizzes: 0 });
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  // Quiz State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [isScoreView, setIsScoreView] = useState(false);

  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
    refreshStats();
  }, []);

  const refreshStats = () => {
    setSuggestions(getPracticeSuggestions());
    setGlobalStats(getGlobalPerformance());
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(5);
      progressIntervalRef.current = window.setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 92) return prev;
          const increment = prev < 40 ? 5 : prev < 70 ? 2 : 0.5;
          return Math.min(prev + increment, 92);
        });
      }, 200);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isLoading]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleResetStats = () => {
    if (confirm("Are you sure you want to clear all your learning progress?")) {
      localStorage.removeItem('edufinder_user_performance');
      refreshStats();
      setShowStatsModal(false);
    }
  };

  const selectClass = (level: ClassLevel) => {
    setConfig(prev => ({ ...prev, classLevel: level, subject: null }));
    setStep(AppStep.SUBJECT_SELECT); // Fixed: Now advances to Subject Select
  };

  const selectSubject = async (subject: string) => {
    setConfig(prev => ({ ...prev, subject, chapter: null, contentType: null }));
    setIsLoading(true);
    try {
      const list = await fetchChapters(config.classLevel!, subject);
      setChapters(list);
      setLoadingProgress(100);
      setTimeout(() => {
        setStep(AppStep.CHAPTER_SELECT);
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setChapters(["Chapter 1: Introduction", "Chapter 2: Essential Concepts", "Chapter 3: Final Review"]);
      setStep(AppStep.CHAPTER_SELECT);
      setIsLoading(false);
    }
  };

  const handleFetchContent = async (targetType: ContentType, overrideChapter?: string) => {
    const updatedConfig = { ...config, contentType: targetType, chapter: overrideChapter || config.chapter };
    setConfig(updatedConfig);
    setIsLoading(true);
    try {
      const data = await generateEducationalContent(updatedConfig);
      if (targetType === 'MCQs') {
        setMcqData(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(null));
      } else {
        setRevisionData(data.revisionPoints);
      }
      setLoadingProgress(100);
      setTimeout(() => {
        setCurrentIdx(0);
        setIsScoreView(false);
        setStep(AppStep.RESULTS);
        setIsLoading(false);
      }, 600);
    } catch (err) {
      alert("AI was unable to generate content.");
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (optIdx: number) => {
    if (userAnswers[currentIdx] !== null) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = optIdx;
    setUserAnswers(newAnswers);
  };

  const calculateScore = () => userAnswers.filter((ans, i) => ans === mcqData[i]?.correctIndex).length;

  const finishQuiz = () => {
    const score = calculateScore();
    const total = mcqData.length;
    if (config.classLevel && config.subject && config.chapter && !config.isTeacherMode) {
      saveQuizPerformance(config.classLevel, config.subject, config.chapter, score, total);
      refreshStats();
    }
    setIsScoreView(true);
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

  const handleQuickPractice = (suggested: ChapterPerformance) => {
    setConfig({
      classLevel: suggested.classLevel,
      subject: suggested.subject,
      chapter: suggested.chapter,
      contentType: 'MCQs',
      isTeacherMode: false
    });
    handleFetchContent('MCQs', suggested.chapter);
  };

  const handleBack = () => {
    if (step === AppStep.HOME) return;
    if (step === AppStep.RESULTS) setStep(AppStep.CONTENT_TYPE_SELECT);
    else if (step === AppStep.CHAPTER_SELECT) setStep(AppStep.SUBJECT_SELECT);
    else if (step === AppStep.SUBJECT_SELECT) setStep(AppStep.CLASS_SELECT);
    else setStep(AppStep.HOME);
  };

  const StudentQuiz = () => {
    const q = mcqData[currentIdx];
    if (!q) return <div className="p-12 text-center">Error</div>;
    const answered = userAnswers[currentIdx] !== null;

    if (isScoreView) {
      const score = calculateScore();
      const pct = Math.round((score / mcqData.length) * 100);
      return (
        <div className="text-center py-10 animate-fade-in max-w-lg mx-auto">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl font-black border-8 shadow-2xl ${pct >= 70 ? 'bg-emerald-600 border-emerald-200' : 'bg-rose-600 border-rose-200'} text-white`}>{pct}%</div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">{pct >= 70 ? 'Mastery Achieved!' : 'Room for Growth'}</h2>
          <p className="text-slate-500 font-bold mb-8">You answered {score} of {mcqData.length} correctly.</p>
          <button onClick={resetApp} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg active-scale shadow-lg">Back to Dashboard</button>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto animate-fade-in pb-12">
        <div className="mb-6 flex justify-between items-center text-xs font-black uppercase text-slate-400">
          <span>Question {currentIdx + 1} of {mcqData.length}</span>
          <span className="text-indigo-600">Score: {calculateScore()}</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-gray-800 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentIdx + 1) / mcqData.length) * 100}%` }} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 leading-tight">{q.question}</h2>
        <div className="space-y-4 mb-10">
          {q.options.map((opt, i) => {
            const isSelected = userAnswers[currentIdx] === i;
            const isCorrect = i === q.correctIndex;
            let btnClass = "w-full p-6 text-left rounded-[1.5rem] border-2 font-bold text-lg transition-all ";
            if (!answered) btnClass += "bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-700 text-slate-900 dark:text-white hover:border-indigo-400 active-scale";
            else if (isSelected && isCorrect) btnClass += "bg-emerald-500 border-emerald-500 text-white shadow-lg";
            else if (isSelected && !isCorrect) btnClass += "bg-rose-500 border-rose-500 text-white shadow-lg";
            else if (isCorrect) btnClass += "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700";
            else btnClass += "bg-slate-100 dark:bg-gray-800 border-transparent opacity-30";
            return <button key={i} onClick={() => handleAnswerSelect(i)} disabled={answered} className={btnClass}>{opt}</button>;
          })}
        </div>
        {answered && (
          <div className="animate-fade-in">
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-8 border border-indigo-100 dark:border-indigo-800">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{q.explanation}</p>
            </div>
            <button onClick={() => { if (currentIdx < mcqData.length - 1) setCurrentIdx(currentIdx + 1); else finishQuiz(); }} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-xl shadow-xl active-scale">
              {currentIdx < mcqData.length - 1 ? 'Next Question' : 'View Results'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const TeacherView = () => (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg mb-8 flex items-center gap-4">
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2 2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
        <div>
          <h3 className="font-black text-xl">Worksheet Master Key</h3>
          <p className="text-sm opacity-80 uppercase tracking-widest">{config.chapter}</p>
        </div>
      </div>
      {mcqData.map((q, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-sm">
          <h4 className="font-black mb-4">{i+1}. {q.question}</h4>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className={`p-3 rounded-xl border text-xs font-bold ${oi === q.correctIndex ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                {String.fromCharCode(65 + oi)}. {opt}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={resetApp} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-3xl font-black active-scale shadow-xl">New Session</button>
    </div>
  );

  if (step === AppStep.HOME) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-800 to-blue-700 dark:from-indigo-950 dark:to-black text-white text-center">
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
           <button onClick={() => setShowStatsModal(true)} className="p-4 bg-white/10 rounded-2xl border border-white/20 active-scale shadow-lg backdrop-blur-md">
             📊
           </button>
           <button onClick={toggleTheme} className="p-4 bg-white/10 rounded-2xl border border-white/20 active-scale shadow-lg backdrop-blur-md">
             {isDarkMode ? '🌙' : '☀️'}
           </button>
        </div>

        <div className="mb-8 p-10 bg-white/10 rounded-[3rem] backdrop-blur-2xl border border-white/20 shadow-2xl relative">
          <div className="absolute inset-0 bg-blue-400 blur-[60px] opacity-20 animate-pulse"></div>
          <svg className="w-16 h-16 text-white relative" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-2 tracking-tighter">EduFinder</h1>
        <p className="text-lg md:text-xl mb-10 font-medium opacity-80 tracking-tight">Your Smart Educational Copilot</p>

        {globalStats.totalQuizzes > 0 && (
          <div className="mb-10 px-6 py-3 bg-white/10 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-4 cursor-pointer active-scale" onClick={() => setShowStatsModal(true)}>
             <div className="flex flex-col text-left"><span className="text-[10px] font-black opacity-60 uppercase">Mastery</span><span className="font-black text-lg">{Math.round(globalStats.avg)}%</span></div>
             <div className="w-px h-8 bg-white/20"></div>
             <div className="flex flex-col text-left"><span className="text-[10px] font-black opacity-60 uppercase">Sessions</span><span className="font-black text-lg">{globalStats.totalQuizzes}</span></div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="w-full max-sm mb-10 text-left animate-fade-in max-w-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-70">Focus Areas</h3>
            <div className="space-y-3">
              {suggestions.map((s, idx) => (
                <button key={idx} onClick={() => handleQuickPractice(s)} className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-between active-scale transition-all text-left">
                  <div className="flex flex-col max-w-[70%]"><span className="text-[10px] font-black text-indigo-300 uppercase">{s.subject}</span><span className="font-bold text-sm truncate">{s.chapter}</span></div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-amber-400">{Math.round(s.averagePercentage)}%</span>
                    <span className="text-[8px] font-black opacity-40 uppercase text-white">Review</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="w-full max-w-sm space-y-4">
          <button onClick={() => setStep(AppStep.CLASS_SELECT)} className="w-full bg-white text-indigo-700 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl active-scale">Start Learning</button>
          
          <button onClick={() => setConfig(c => ({...c, isTeacherMode: !c.isTeacherMode}))} className={`w-full py-4 rounded-[2rem] border transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${config.isTeacherMode ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-white/10 border-white/20 text-white/80'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.827a1 1 0 00-.788 0l-7 3a1 1 0 000 1.846l7 3a1 1 0 00.788 0l7-3a1 1 0 000-1.846l-7-3z" /><path d="M4.394 15.023a1 1 0 000 1.846l7 3a1 1 0 00.788 0l7-3a1 1 0 000-1.846l-7-3a1 1 0 00-.788 0l-7 3z" /></svg>
            {config.isTeacherMode ? 'Teacher ON' : 'Teacher Mode'}
          </button>
        </div>

        {/* Learning Stats Modal */}
        {showStatsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
              <div className="p-8 text-center bg-indigo-600 text-white">
                <h3 className="text-2xl font-black mb-1 text-white">Learning Journey</h3>
                <p className="text-xs font-black opacity-60 uppercase tracking-widest text-indigo-100">Performance Tracking</p>
              </div>
              <div className="p-8 space-y-6 flex-1 overflow-y-auto android-scroll">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 text-left">
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-1">Overall</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{Math.round(globalStats.avg)}%</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 text-left">
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-1">Quizzes</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{globalStats.totalQuizzes}</span>
                  </div>
                </div>
                
                {suggestions.length > 0 ? (
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4">Focus Areas</h4>
                    <div className="space-y-3">
                      {suggestions.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-2xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase truncate">{s.chapter}</p>
                            <p className="text-[10px] font-bold text-slate-500">{s.subject} • {s.classLevel}</p>
                          </div>
                          <span className="font-black text-rose-600">{Math.round(s.averagePercentage)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm font-bold text-slate-400 italic">No focused areas yet. Keep learning!</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex gap-4">
                   <button onClick={handleResetStats} className="flex-1 py-4 bg-slate-100 dark:bg-gray-800 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest active-scale">Reset</button>
                   <button onClick={() => setShowStatsModal(false)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active-scale">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-6 z-[60] flex gap-2">
        <button onClick={toggleTheme} className="p-3 bg-white/10 dark:bg-white/5 rounded-2xl backdrop-blur-md border border-white/20 active-scale shadow-sm">
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>

      {step === AppStep.CLASS_SELECT && (
        <StepLayout title="Grade" subtitle="Choose your level" onBack={handleBack}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
              <button key={c} onClick={() => selectClass(c as ClassLevel)} className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border-2 border-transparent active-scale flex flex-col items-center group transition-colors hover:border-indigo-500">
                <span className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-none mb-1">{c.split(' ')[1]}</span>
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
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
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
              <button key={i} onClick={() => { setConfig(p => ({...p, chapter: ch})); setStep(AppStep.CONTENT_TYPE_SELECT); }} className="p-6 bg-white dark:bg-gray-800 rounded-[1.5rem] flex items-center gap-5 shadow-md border border-slate-100 dark:border-gray-700 active-scale hover:border-indigo-500 text-left transition-all group">
                <span className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black flex-shrink-0 shadow-lg text-sm">{i+1}</span>
                <span className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600">{ch}</span>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.CONTENT_TYPE_SELECT && (
        <StepLayout title="Goal" subtitle={config.chapter || ""} onBack={handleBack}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {(['MCQs', 'Quick Revision'] as ContentType[]).map(t => (
              <button key={t} onClick={() => handleFetchContent(t)} className="p-12 bg-white dark:bg-gray-800 rounded-[3.5rem] shadow-2xl border-2 border-transparent hover:border-indigo-500 group text-left active-scale transition-all">
                <div className={`w-24 h-24 rounded-[2rem] mb-10 flex items-center justify-center ${t === 'MCQs' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'} group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                  {CONTENT_TYPE_ICONS[t]}
                </div>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">{t}</h3>
                <p className="text-base font-bold text-slate-400 leading-tight">{t === 'MCQs' ? '20-question challenge' : 'Concise fact sheet highlights'}</p>
              </button>
            ))}
          </div>
        </StepLayout>
      )}

      {step === AppStep.RESULTS && (
        <StepLayout title={config.contentType === 'MCQs' ? 'Study Zone' : 'Revision Hub'} onBack={handleBack}>
           {config.contentType === 'MCQs' ? (
             config.isTeacherMode ? <TeacherView /> : <StudentQuiz />
           ) : (
             <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
               <div className="bg-indigo-700 text-white p-10 rounded-[3rem] shadow-2xl border border-white/10">
                 <div className="flex items-center gap-4 mb-10">
                   <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                   </div>
                   <h2 className="text-3xl font-black">Chapter Highlights</h2>
                 </div>
                 <div className="space-y-4">
                    {revisionData.map((point, i) => (
                      <div key={i} className="flex gap-5 p-6 bg-white/10 rounded-[1.5rem] border border-white/5 group hover:bg-white/15 transition-all text-left">
                        <span className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center font-black flex-shrink-0 text-sm">{i+1}</span>
                        <p className="font-bold leading-relaxed text-lg">{point}</p>
                      </div>
                    ))}
                 </div>
               </div>
               <button onClick={resetApp} className="w-full py-7 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-2xl active-scale shadow-2xl">Return to Dashboard</button>
             </div>
           )}
        </StepLayout>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="max-w-xs w-full">
            <div className="relative w-28 h-28 mx-auto mb-10">
              <div className="absolute inset-0 bg-indigo-500 blur-[40px] opacity-20 animate-pulse"></div>
              <div className="relative w-full h-full bg-white dark:bg-gray-800 rounded-[2rem] border border-indigo-100 dark:border-indigo-900 shadow-2xl flex items-center justify-center">
                <svg className="w-14 h-14 text-indigo-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Preparing content...</h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">AI is generating educational material</p>
            <div className="relative w-full h-3 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden border border-slate-200 shadow-inner">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
            </div>
            <div className="mt-3 flex justify-between px-1"><span className="text-[10px] font-black text-indigo-600">{Math.round(loadingProgress)}%</span><span className="text-[10px] font-black text-slate-400">Loading...</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
