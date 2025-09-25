'use client';

import { memo } from 'react';

const LoadingState = memo(() => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col items-center">
        <div className="loading-spinner mb-6"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Document</h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Analyzing your document with enhanced XML processing...
        </p>
      </div>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

export default LoadingState;