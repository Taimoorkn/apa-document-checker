'use client';

import { memo } from 'react';
import {
  FileText,
  CheckCircle2,
  FileSearch,
  Sparkles
} from 'lucide-react';

const EmptyDocumentState = memo(() => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="text-center max-w-lg">
        <div className="relative inline-block mb-8">
          <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <FileText className="h-14 w-14 text-white transform -rotate-3" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          Ready to Perfect Your Document
        </h2>
        <p className="text-gray-600 mb-10 text-lg leading-relaxed">
          Upload your academic paper to start editing with intelligent APA 7th edition validation
        </p>

        <div className="grid gap-4 max-w-md mx-auto">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Real-time Validation</p>
                <p className="text-sm text-gray-600 mt-0.5">Instant APA compliance checking as you edit</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileSearch className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Smart Issue Detection</p>
                <p className="text-sm text-gray-600 mt-0.5">Automatically finds and highlights APA violations</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">One-Click Fixes</p>
                <p className="text-sm text-gray-600 mt-0.5">Apply automated corrections with confidence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

EmptyDocumentState.displayName = 'EmptyDocumentState';

export default EmptyDocumentState;