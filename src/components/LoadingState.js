'use client';

import { memo } from 'react';

const LoadingState = memo(() => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="bg-white rounded-2xl p-10 shadow-lg border border-slate-200 flex flex-col items-center max-w-sm">
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-3">Processing Document</h3>
        <p className="text-sm text-slate-600 text-center leading-relaxed">
          Analyzing your document with enhanced XML processing and APA validation...
        </p>
      </div>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

export default LoadingState;