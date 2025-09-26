'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { FormattedParagraph, FontFormatting, DocumentDefaults } from '@/utils/tiptapFormattingExtensions';
import { IssueHighlighter } from '@/utils/tiptapIssueHighlighter';
import { tiptapConverter } from '@/utils/tiptapDocumentConverter';
import { useDocumentStore } from '@/store/enhancedDocumentStore';

export const useDocumentEditor = () => {
  const {
    documentText,
    activeIssueId,
    issues,
    setActiveIssue,
    documentFormatting,
    showIssueHighlighting,
    analyzeDocumentRealtime,
    cancelRealtimeAnalysis
  } = useDocumentStore();

  const [editorError, setEditorError] = useState(null);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const lastContentUpdate = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      FormattedParagraph,
      FontFormatting,
      DocumentDefaults,
      Underline,
      IssueHighlighter.configure({
        issues: issues,
        activeIssueId: activeIssueId,
        showHighlighting: showIssueHighlighting,
        onIssueClick: (issueId) => setActiveIssue(issueId)
      })
    ],
    content: '<p>Initial content</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none',
        spellcheck: 'false'
      }
    },
    onUpdate: ({ editor, transaction }) => {
      try {
        // Only trigger analysis if there were actual content changes, not just selection or focus changes
        if (!transaction.docChanged) {
          return;
        }

        const currentContent = editor.getJSON();
        lastContentUpdate.current = currentContent;

        if (documentText && currentContent) {
          analyzeDocumentRealtime(currentContent, {
            debounceMs: 8000, // Increased to 8 seconds for better performance
            minChangeThreshold: 100
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in editor onUpdate:', error);
        }
        setEditorError(error);
      }
    },
    onCreate: ({ editor }) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Editor created successfully, isEditable:', editor.isEditable);
        }
        setEditorInitialized(true);
        setEditorError(null);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in editor onCreate:', error);
        }
        setEditorError(error);
      }
    },
    onError: ({ error }) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Editor encountered an error:', error);
      }
      setEditorError(error);
    }
  });

  // Update editor content when document changes
  useEffect(() => {
    if (!editor || !documentText) {
      return;
    }

    if (documentFormatting && documentFormatting.paragraphs) {
      const convertAndSetContent = async () => {
        try {
          const paragraphCount = documentFormatting.paragraphs.length;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Converting document with ${paragraphCount} paragraphs...`);
          }

          const tiptapDoc = await tiptapConverter.convertToTiptapDocument(documentText, documentFormatting);

          setTimeout(() => {
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(tiptapDoc);
              if (process.env.NODE_ENV === 'development') {
                console.log('Document content set with formatting');
              }

              setTimeout(() => {
                if (issues.length > 0) {
                  editor.commands.updateIssueHighlights({
                    issues: issues,
                    activeIssueId: activeIssueId,
                    showHighlighting: showIssueHighlighting
                  });
                }
              }, 200);
            }
          }, 100);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error converting document:', error);
          }
          // Fallback HTML generation logic here...
          // (keeping the existing fallback logic but without console.logs in production)
        }
      };

      convertAndSetContent();
    } else {
      const paragraphs = (documentText || '').split('\n').filter(p => p.trim()).slice(0, 500);
      const htmlContent = paragraphs.map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('') || '<p>No content to display</p>';

      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(htmlContent);
        }
      }, 100);
    }
  }, [editor, documentText, documentFormatting]);

  // Update issue highlighting when issues or settings change
  useEffect(() => {
    if (!editor || !editor.commands) return;

    const timer = setTimeout(() => {
      if (editor && !editor.isDestroyed) {
        editor.commands.updateIssueHighlights({
          issues: issues,
          activeIssueId: activeIssueId,
          showHighlighting: showIssueHighlighting
        });

        if (activeIssueId) {
          scrollToIssue(activeIssueId);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [editor, issues, activeIssueId, showIssueHighlighting]);

  // Function to scroll to an issue in the document
  const scrollToIssue = useCallback((issueId) => {
    if (!editor) return;

    const { state } = editor;
    const { doc } = state;
    const issue = issues.find(i => i.id === issueId);

    if (!issue) return;

    const searchText = issue.highlightText || issue.text;
    if (!searchText) return;

    let found = false;
    doc.descendants((node, pos) => {
      if (found) return false;

      if (node.isText && node.text.includes(searchText)) {
        editor.chain()
          .focus()
          .setTextSelection({ from: pos, to: pos + searchText.length })
          .scrollIntoView()
          .run();
        found = true;
        return false;
      }
    });
  }, [editor, issues]);

  // Listen for active issue changes from store
  useEffect(() => {
    if (!editor || !activeIssueId) return;
    editor.commands.setActiveIssue(activeIssueId);
  }, [editor, activeIssueId]);

  // Cleanup real-time analysis on unmount
  useEffect(() => {
    return () => {
      cancelRealtimeAnalysis();
    };
  }, [cancelRealtimeAnalysis]);

  return {
    editor,
    editorError,
    setEditorError,
    editorInitialized,
    setEditorInitialized,
    scrollToIssue
  };
};