'use client';

import { memo } from 'react';
import {
  FileText,
  CheckCircle2,
  FileSearch,
  Sparkles
} from 'lucide-react';

const EmptyDocumentState = memo(() => {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const docxFile = files.find(file => file.name.endsWith('.docx'));

    if (docxFile) {
      // Create a file input event to trigger upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.docx';

      // Create a FileList-like object
      Object.defineProperty(input, 'files', {
        value: files,
        writable: false,
      });

      // Trigger the upload
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          {/* Main Visual */}
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl">
              <FileText className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Perfect Your APA Document
          </h1>
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            Get instant feedback on APA 7th edition compliance as you write and edit
          </p>

          {/* Upload Area */}
          <div
            className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-300 cursor-pointer group card-hover focus-ring-smooth"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.querySelector('input[type="file"]')?.click()}
            tabIndex="0"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <FileText className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Drop your DOCX file here
              </h3>
              <p className="text-slate-600 mb-4">
                Or click to browse and select your document
              </p>
              <button className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25 button-lift button-press focus-ring-smooth">
                <span>Choose File</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-slate-200 bg-slate-50 px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-slate-900 mb-6 text-center">
            Powered by Advanced APA Analysis
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl mx-auto mb-3 flex items-center justify-center card-hover">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Real-time Feedback</h4>
              <p className="text-sm text-slate-600">Instant validation as you type and edit</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-slate-500 rounded-xl mx-auto mb-3 flex items-center justify-center card-hover">
                <FileSearch className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Comprehensive Analysis</h4>
              <p className="text-sm text-slate-600">Citations, references, formatting & more</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500 rounded-xl mx-auto mb-3 flex items-center justify-center card-hover">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Smart Corrections</h4>
              <p className="text-sm text-slate-600">One-click fixes for common issues</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

EmptyDocumentState.displayName = 'EmptyDocumentState';

export default EmptyDocumentState;