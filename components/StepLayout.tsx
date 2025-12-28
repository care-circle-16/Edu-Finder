
import React from 'react';

interface StepLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}

const StepLayout: React.FC<StepLayoutProps> = ({ 
  title, 
  subtitle, 
  children, 
  onBack, 
  onNext, 
  nextDisabled,
  nextLabel = "Next"
}) => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-black overflow-hidden animate-fade-in transition-colors duration-300">
      {/* Header */}
      <div className="px-6 py-10 bg-indigo-600 dark:bg-indigo-950 text-white shadow-xl rounded-b-[3rem] relative z-10">
        <div className="flex items-center gap-5 max-w-7xl mx-auto w-full">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-3.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90 border border-white/10 shadow-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tighter">{title}</h1>
            {subtitle && <p className="mt-1 text-indigo-100 text-sm font-bold opacity-90">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto android-scroll">
        <div className="max-w-7xl mx-auto w-full h-full">
          {children}
        </div>
      </div>

      {/* Footer (Conditional) */}
      {onNext && (
        <div className="p-6 border-t border-slate-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto w-full flex justify-end">
            <button 
              onClick={onNext}
              disabled={nextDisabled}
              className={`px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl transition-all ${
                nextDisabled 
                  ? 'bg-slate-200 dark:bg-gray-800 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white transform active:scale-95'
              }`}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepLayout;
