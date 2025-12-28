
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
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-gray-800 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-10 bg-indigo-600 dark:bg-indigo-950 text-white shadow-lg rounded-b-[2.5rem] relative z-10">
        <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-indigo-100 text-sm font-medium opacity-80">{subtitle}</p>}
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
        <div className="p-6 border-t border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          <div className="max-w-7xl mx-auto w-full flex justify-end">
            <button 
              onClick={onNext}
              disabled={nextDisabled}
              className={`px-10 py-4 rounded-2xl font-black text-lg shadow-xl transition-all ${
                nextDisabled 
                  ? 'bg-slate-200 dark:bg-gray-700 text-slate-400 cursor-not-allowed' 
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
