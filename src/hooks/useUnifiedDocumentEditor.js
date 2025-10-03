'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { FormattedParagraph, FontFormatting, DocumentDefaults } from '@/utils/tiptapFormattingExtensions';
import { IssueHighlighter } from '@/utils/tiptapIssueHighlighter';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';
import { useAutoSave } from './useAutoSave';
import { useAnalysis } from './useAnalysis';
import { useIssueDecorations } from './useIssueDecorations';

/**
 * Unified Document Editor Hook - NEW ARCHITECTURE
 * Makes Tiptap the source of truth during editing sessions
 * No setContent() calls after initial load - uses transactions for all updates
 */
export const useUnifiedDocumentEditor = () => {
  const {
    documentModel,
    getEditorContent,
    events
  } = useUnifiedDocumentStore();

  const [editorError, setEditorError] = useState(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  // UI state (moved from Zustand)
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [showHighlighting, setShowHighlighting] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, // Use custom FormattedParagraph
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      FormattedParagraph,
      FontFormatting,
      DocumentDefaults,
      Underline,
      IssueHighlighter.configure({
        issues: [], // Will be updated by useIssueDecorations
        activeIssueId,
        showHighlighting,
        onIssueClick: (issueId) => {
          setActiveIssueId(issueId);
          // Emit event so issues panel can react
          events.emit('activeIssueChanged', {
            previousId: activeIssueId,
            currentId: issueId,
            shouldScroll: false // Already in view, don't scroll editor
          });
        }
      })
    ],
    content: '<p>Loading document...</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none min-h-[500px] p-4',
        spellcheck: 'false'
      }
    },
    onCreate: ({ editor }) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Editor created successfully');
        }
        setEditorInitialized(true);
        setEditorError(null);

        // Load initial content (ONLY TIME setContent is called)
        if (documentModel) {
          const initialContent = getEditorContent();
          if (initialContent) {
            editor.commands.setContent(initialContent, false, {
              preserveWhitespace: true
            });
          }
        }
      } catch (error) {
        console.error('Error in editor onCreate:', error);
        setEditorError(error);
      }
    },
    onError: ({ error }) => {
      console.error('Editor encountered an error:', error);
      setEditorError(error);
    }
  });

  // Auto-save hook (passive observer)
  const documentId = documentModel?.supabase?.documentId || documentModel?.id;
  useAutoSave(editor, documentId, !!documentModel);

  // Analysis hook (passive observer) - wait for editor to be initialized with content
  const { issues, isAnalyzing, triggerAnalysis } = useAnalysis(editor, documentModel, !!documentModel, editorInitialized);

  // Issue decorations (visual only)
  useIssueDecorations(editor, issues, activeIssueId, showHighlighting);

  /**
   * Scroll to specific issue in editor
   */
  const scrollToIssue = useCallback((issueId) => {
    if (!editor || !issueId) {
      console.warn('scrollToIssue: Missing editor or issueId', { hasEditor: !!editor, issueId });
      return;
    }

    const issue = issues.find(i => i.id === issueId);
    if (!issue) {
      console.warn('scrollToIssue: Issue not found', { issueId, totalIssues: issues.length });
      return;
    }

    // Skip document-level issues without specific text
    if (issue.location?.type === 'document' && !issue.highlightText && !issue.text) {
      console.warn('scrollToIssue: Document-level issue without specific text', { issueId });
      return;
    }

    // Determine search text
    let searchText = issue.highlightText || issue.text || '';
    if (!searchText || searchText.length < 2) {
      console.warn('scrollToIssue: No valid search text', { issueId, searchText });
      return;
    }

    // Handle truncated text
    const isTruncated = searchText.endsWith('...');
    if (isTruncated) {
      searchText = searchText.slice(0, -3).trim();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('scrollToIssue: Searching for:', searchText.substring(0, 80), {
        paragraphIndex: issue.location?.paragraphIndex,
        isTruncated
      });
    }

    try {
      const { state } = editor;
      const { doc } = state;
      const positions = [];

      // Search strategy based on location
      if (issue.location?.paragraphIndex !== undefined) {
        // Search in specific paragraph
        let currentPara = 0;
        let found = false;

        doc.descendants((node, pos) => {
          if (found) return false;

          if (node.type.name === 'paragraph' || node.type.name === 'heading') {
            if (currentPara === issue.location.paragraphIndex) {
              const text = node.textContent;
              const index = text.indexOf(searchText);

              if (index !== -1) {
                const from = pos + 1 + index;
                const to = from + (isTruncated
                  ? Math.min(searchText.length + 20, text.length - index)
                  : searchText.length);
                positions.push({ from, to });
              }
              found = true;
              return false;
            }
            currentPara++;
          }
        });
      } else {
        // Search entire document
        doc.descendants((node, pos) => {
          if (node.isText) {
            const text = node.text;
            const index = text.indexOf(searchText);

            if (index !== -1) {
              const from = pos + index;
              const to = from + (isTruncated
                ? Math.min(searchText.length + 20, text.length - index)
                : searchText.length);
              positions.push({ from, to });
            }
          } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
            const text = node.textContent;
            if (text.includes(searchText)) {
              const index = text.indexOf(searchText);
              if (index !== -1) {
                const from = pos + 1 + index;
                const to = from + (isTruncated
                  ? Math.min(searchText.length + 20, text.length - index)
                  : searchText.length);
                positions.push({ from, to });
              }
            }
          }
        });
      }

      // Scroll to the first found position
      if (positions.length > 0) {
        const { from, to } = positions[0];

        if (process.env.NODE_ENV === 'development') {
          console.log('scrollToIssue: Found position', { from, to, totalMatches: positions.length });
        }

        editor.chain()
          .focus()
          .setTextSelection({ from, to })
          .scrollIntoView()
          .run();
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('scrollToIssue: Text not found in document', {
          searchText: searchText.substring(0, 80),
          issueTitle: issue.title,
          issueCategory: issue.category,
          paragraphIndex: issue.location?.paragraphIndex
        });
      }
    } catch (error) {
      console.error('Error scrolling to issue:', error);
    }
  }, [editor, issues]);

  // Listen for fix application (use transaction, not setContent)
  useEffect(() => {
    const cleanup = events.on('fixApplied', (data) => {
      if (!editor) return;

      const { fixData } = data;

      if (!fixData) {
        console.warn('No fixData provided for fix application');
        return;
      }

      // Apply fix via ProseMirror transaction (surgical update)
      try {
        const { state, view } = editor;
        const tr = state.tr;

        if (fixData.type === 'textReplacement' && fixData.textReplacement) {
          const { from, to, text } = fixData.textReplacement;
          tr.insertText(text, from, to);
          view.dispatch(tr);
          console.log('🔧 Text fix applied via transaction');
        }
        else if (fixData.type === 'formatting' && fixData.formatting) {
          // For formatting fixes, we need to refresh from model
          // This is unavoidable for document-wide formatting changes
          const updatedContent = getEditorContent();
          if (updatedContent) {
            editor.commands.setContent(updatedContent, false, {
              preserveWhitespace: true
            });
            console.log('🎨 Formatting fix applied via content refresh');
          }
        }
      } catch (error) {
        console.error('Error applying fix via transaction:', error);
      }
    });

    return cleanup;
  }, [editor, events, getEditorContent]);

  // Listen for active issue changes that should trigger scrolling
  useEffect(() => {
    const cleanup = events.on('activeIssueChanged', (data) => {
      if (data.shouldScroll && data.currentId && editorInitialized) {
        setTimeout(() => {
          scrollToIssue(data.currentId);
        }, 200);
      }
    });

    return cleanup;
  }, [events, editorInitialized, scrollToIssue]);

  // Listen for document restoration events
  useEffect(() => {
    const cleanup = events.on('documentRestored', (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Document restored, refreshing editor...', data.description);
      }

      // For document restoration, we need to reload content
      if (editor && documentModel) {
        const restoredContent = getEditorContent();
        if (restoredContent) {
          editor.commands.setContent(restoredContent, false, {
            preserveWhitespace: true
          });
        }
      }
    });

    return cleanup;
  }, [events, editor, documentModel, getEditorContent]);

  return {
    editor,
    editorError,
    setEditorError,
    editorInitialized,
    setEditorInitialized,
    issues,
    isAnalyzing,
    triggerAnalysis,
    activeIssueId,
    setActiveIssueId,
    showHighlighting,
    toggleHighlighting: () => setShowHighlighting(!showHighlighting),
    scrollToIssue,

    // Stats for debugging
    stats: {
      hasDocument: !!documentModel,
      documentVersion: documentModel?.version,
      issueCount: issues.length
    }
  };
};
