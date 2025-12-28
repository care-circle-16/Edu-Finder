
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
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-gray-800 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-8 bg-blue-600 dark:bg-blue-800 text-white shadow-lg">
        <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-blue-500 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="mt-1 text-blue-100 text-sm">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto android-scroll">
        <div className="max-w-7xl mx-auto w-full h-full">
          {children}
        </div>
      </div>

      {/* Footer */}
      {(onNext || onBack) && (
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-4">
            {onBack ? (
              <button 
                onClick={onBack}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                Back
              </button>
            ) : <div />}
            
            {onNext && (
              <button 
                onClick={onNext}
                disabled={nextDisabled}
                className={`px-8 py-3 rounded-xl font-bold shadow-md transition-all ${
                  nextDisabled 
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform active:scale-95'
                }`}
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepLayout;
