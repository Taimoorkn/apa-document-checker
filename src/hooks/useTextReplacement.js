'use client';

import { useEffect, useCallback } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';

export const useTextReplacement = (editor, issues, activeIssueId, showIssueHighlighting) => {
  // Apply text replacement for fixes
  const applyTextReplacement = useCallback((originalText, replacementText) => {
    if (!editor || !originalText) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('Applying text replacement:', { originalText, replacementText });
    }

    const { state } = editor;
    const { doc } = state;
    let replaced = false;

    doc.descendants((node, pos) => {
      if (!replaced) {
        if (node.isText) {
          const text = node.text;
          const index = text.indexOf(originalText);

          if (index !== -1) {
            const from = pos + index;
            const to = from + originalText.length;

            editor.chain()
              .focus()
              .setTextSelection({ from, to })
              .deleteSelection()
              .insertContent(replacementText)
              .run();

            replaced = true;
            if (process.env.NODE_ENV === 'development') {
              console.log('Text replaced at position:', from);
            }
          }
        } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          const text = node.textContent;
          const index = text.indexOf(originalText);

          if (index !== -1) {
            const from = pos + index + 1;
            const to = from + originalText.length;

            editor.chain()
              .focus()
              .setTextSelection({ from, to })
              .deleteSelection()
              .insertContent(replacementText)
              .run();

            replaced = true;
            if (process.env.NODE_ENV === 'development') {
              console.log('Text replaced in block at position:', from);
            }
          }
        }
      }
    });

    if (replaced) {
      setTimeout(() => {
        editor.commands.updateIssueHighlights({
          issues: issues,
          activeIssueId: activeIssueId,
          showHighlighting: showIssueHighlighting
        });
      }, 100);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('Text not found for replacement:', originalText);
    }
  }, [editor, issues, activeIssueId, showIssueHighlighting]);

  // Listen for text replacement events using store event system
  useEffect(() => {
    const handleTextReplacement = (data) => {
      const { originalText, replacementText } = data;
      applyTextReplacement(originalText, replacementText);
    };

    const { events } = useDocumentStore.getState();
    const cleanup = events.on('applyTextReplacement', handleTextReplacement);

    return cleanup;
  }, [applyTextReplacement]);

  return {
    applyTextReplacement
  };
};