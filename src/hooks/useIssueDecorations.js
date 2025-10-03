'use client';

import { useEffect } from 'react';

/**
 * Issue Decorations hook - Updates visual highlights only
 * Does NOT mutate editor content
 */
export const useIssueDecorations = (
  editor,
  issues,
  activeIssueId,
  showHighlighting
) => {
  useEffect(() => {
    if (!editor || !editor.commands.updateIssueHighlights) {
      return;
    }

    try {
      // Update decorations without touching content
      editor.commands.updateIssueHighlights({
        issues,
        activeIssueId,
        showHighlighting
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 Updated decorations for ${issues.length} issues`);
      }
    } catch (error) {
      console.error('❌ Decoration update failed:', error);
    }
  }, [editor, issues, activeIssueId, showHighlighting]);
};
