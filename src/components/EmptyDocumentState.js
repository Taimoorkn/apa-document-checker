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
    <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="text-center max-w-lg">
        <div className="relative inline-block mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <FileText className="h-16 w-16 text-white transform -rotate-3" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Ready to Perfect Your Document
        </h2>
        <p className="text-slate-600 mb-10 text-lg leading-relaxed">
          Upload your academic paper to start editing with intelligent APA 7th edition validation
        </p>

        <div className="grid gap-4 max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Real-time Validation</p>
                <p className="text-sm text-slate-600 mt-0.5">Instant APA compliance checking as you edit</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-500/25">
                <FileSearch className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Smart Issue Detection</p>
                <p className="text-sm text-slate-600 mt-0.5">Automatically finds and highlights APA violations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">One-Click Fixes</p>
                <p className="text-sm text-slate-600 mt-0.5">Apply automated corrections with confidence</p>
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