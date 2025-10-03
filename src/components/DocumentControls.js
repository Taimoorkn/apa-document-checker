'use client';

import { memo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Download,
  FileText,
  File
} from 'lucide-react';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';

const DocumentControls = memo(({
  documentText,
  isAnalyzing,
  showIssueHighlighting,
  toggleIssueHighlighting,
  issues,
  editor,
  onRunAnalysis
}) => {
  const { documentModel, exportDocument } = useUnifiedDocumentStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    if (!documentModel) {
      alert('No document loaded');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportDocument(format);

      if (result.success) {
        // Create blob and download
        const blob = format === 'html' || format === 'text'
          ? new Blob([result.content], { type: format === 'html' ? 'text/html' : 'text/plain' })
          : new Blob([result.content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ Exported as ${format}${result.method ? ` (${result.method})` : ''}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 flex-shrink-0">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-slate-900">Document Editor</h3>
            {isAnalyzing && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse"></div>
                Analyzing...
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">

            {/* Export Buttons */}
            {documentModel && (
              <>
                <button
                  onClick={() => handleExport('docx')}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>{isExporting ? 'Exporting...' : 'Export DOCX'}</span>
                </button>

                <button
                  onClick={() => handleExport('html')}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" />
                  <span>HTML</span>
                </button>
              </>
            )}

            {/* Run Check Button */}
            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              title="Run APA analysis on current document (Ctrl+Shift+C)"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isAnalyzing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/25'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
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