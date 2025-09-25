'use client';

import { memo } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

const DocumentControls = memo(({
  lastFixAppliedAt,
  documentText,
  documentFormatting,
  handleManualAnalysis,
  isLoading,
  processingState,
  showIssueHighlighting,
  toggleIssueHighlighting,
  issues,
  editor,
  tiptapConverter
}) => {
  return (
    <div className="bg-white border-b border-slate-200 flex-shrink-0">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-slate-900">Document Editor</h3>
            {lastFixAppliedAt && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></div>
                Recently Updated
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">

            {/* Run Check Button */}
            <button
              onClick={handleManualAnalysis}
              disabled={isLoading || processingState.isAnalyzing}
              title="Run APA analysis on current document (Ctrl+Shift+C)"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isLoading || processingState.isAnalyzing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/25'
              }`}
            >
              {processingState.isAnalyzing ? (
                <>
                  <div className="loading-spinner w-4 h-4"></div>
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Run Check</span>
                </>
              )}
            </button>

            {/* Toggle Highlighting */}
            <button
              onClick={() => toggleIssueHighlighting()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                showIssueHighlighting
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-sm'
              }`}
            >
              {showIssueHighlighting ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span>Hide Issues</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>Show Issues</span>
                </>
              )}
            </button>

            {/* Issue Count */}
            {issues.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                <AlertCircle className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DocumentControls.displayName = 'DocumentControls';

export default DocumentControls;