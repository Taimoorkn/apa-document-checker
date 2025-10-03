'use client';

import { useState, useEffect } from 'react';

/**
 * Saving Indicator - Non-blocking status badge
 * Shows save status in bottom-right corner without interrupting editing
 */
export const SavingIndicator = ({ saveStatus, onRetry }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldFade, setShouldFade] = useState(false);

  useEffect(() => {
    if (saveStatus === 'saving' || saveStatus === 'error') {
      setIsVisible(true);
      setShouldFade(false);
    } else if (saveStatus === 'saved') {
      setIsVisible(true);
      setShouldFade(false);
      // Auto-hide success state after 2 seconds
      const timer = setTimeout(() => {
        setShouldFade(true);
        setTimeout(() => setIsVisible(false), 300);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [saveStatus]);

  if (!isVisible) return null;

  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: (
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          text: 'Saving...',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700'
        };
      case 'saved':
        return {
          icon: (
            <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          text: 'Saved',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700'
        };
      case 'error':
        return {
          icon: (
            <svg className="h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Save failed',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          showRetry: true
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        shouldFade ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg ${config.bgColor} ${config.borderColor}`}
      >
        {config.icon}
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.text}
        </span>
        {config.showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 text-xs font-semibold text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
