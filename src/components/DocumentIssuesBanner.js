'use client';

import { memo, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

const DocumentIssuesBanner = memo(({ issues, showIssueHighlighting, setActiveIssue }) => {
  const documentLevelIssues = useMemo(() => {
    return issues.filter(issue =>
      issue.location?.type === 'document' &&
      ['formatting'].includes(issue.category)
    );
  }, [issues]);

  if (documentLevelIssues.length === 0 || !showIssueHighlighting) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">
              Document-wide formatting issues detected
            </p>
            <div className="flex flex-wrap gap-2">
              {documentLevelIssues.map(issue => (
                <span
                  key={issue.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 cursor-pointer hover:bg-amber-200 transition-colors duration-200"
                  onClick={() => setActiveIssue(issue.id)}
                >
                  {issue.title}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            const firstIssue = documentLevelIssues[0];
            if (firstIssue) setActiveIssue(firstIssue.id);
          }}
          className="text-sm text-amber-700 hover:text-amber-900 font-semibold hover:underline transition-all duration-200"
        >
          View in Issues Panel →
        </button>
      </div>
    </div>
  );
});

DocumentIssuesBanner.displayName = 'DocumentIssuesBanner';

export default DocumentIssuesBanner;