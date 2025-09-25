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
    <div className="bg-white border-b border-gray-200 flex-shrink-0">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Document Editor</h3>
            {lastFixAppliedAt && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
                Recently Updated
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Force Update Button - Debug */}
            {documentText && (
              <button
                onClick={async () => {
                  if (editor && documentText && documentFormatting) {
                    try {
                      const tiptapDoc = await tiptapConverter.convertToTiptapDocument(documentText, documentFormatting);
                      editor.commands.setContent(tiptapDoc);
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Forced formatted content update');
                      }
                    } catch (error) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('Force update error:', error);
                      }
                      const paragraphs = documentText.split('\n').filter(p => p.trim());
                      const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');
                      editor.commands.setContent(htmlContent);
                    }
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                Force Update Content
              </button>
            )}

            {/* Run Check Button */}
            <button
              onClick={handleManualAnalysis}
              disabled={isLoading || processingState.isAnalyzing}
              title="Run APA analysis on current document (Ctrl+Shift+C)"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLoading || processingState.isAnalyzing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                showIssueHighlighting
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
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