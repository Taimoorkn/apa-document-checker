'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { FormattedParagraph, FontFormatting, DocumentDefaults } from '@/utils/tiptapFormattingExtensions';
import { IssueHighlighter } from '@/utils/tiptapIssueHighlighter';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';

/**
 * Unified Document Editor Hook - Replaces useDocumentEditor.js
 * Provides bidirectional sync between DocumentModel and Tiptap editor
 */
export const useUnifiedDocumentEditor = () => {
  const {
    documentModel,
    getEditorContent,
    syncWithEditor,
    getIssues,
    uiState: { activeIssueId, showIssueHighlighting },
    setActiveIssue,
    editorState,
    scheduleIncrementalAnalysis,
    events
  } = useUnifiedDocumentStore();

  const [editorError, setEditorError] = useState(null);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const lastContentRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const isInternalUpdateRef = useRef(false);

  // Get current issues
  const issues = getIssues();

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
        issues: issues,
        activeIssueId: activeIssueId,
        showHighlighting: showIssueHighlighting,
        onIssueClick: (issueId) => setActiveIssue(issueId, { shouldScroll: false })
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
    onUpdate: ({ editor, transaction }) => {
      // Skip if this is an internal update (from sync)
      if (isInternalUpdateRef.current) {
        return;
      }

      try {
        const currentContent = editor.getJSON();

        // Check if content actually changed
        const contentString = JSON.stringify(currentContent);
        if (lastContentRef.current === contentString) {
          return;
        }

        lastContentRef.current = contentString;

        if (process.env.NODE_ENV === 'development') {
          console.log('📝 Editor content changed, scheduling sync...');
        }

        // Debounce sync to avoid excessive updates
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          performSync(currentContent, transaction);
        }, 300); // 300ms debounce for responsive editing

      } catch (error) {
        console.error('Error in editor onUpdate:', error);
        setEditorError(error);
      }
    },
    onCreate: ({ editor }) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Editor created successfully');
        }
        setEditorInitialized(true);
        setEditorError(null);

        // Sync with document model if available
        if (documentModel && editorState.needsSync) {
          syncEditorFromModel();
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

  /**
   * Perform bidirectional sync with document model
   */
  const performSync = useCallback(async (editorContent, transaction = null) => {
    if (!documentModel || isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      const changesMeta = {
        timestamp: Date.now(),
        userInitiated: true,
        transactionSteps: transaction?.steps?.length || 0
      };

      const result = syncWithEditor(editorContent, changesMeta);

      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Sync completed: ${result.hasChanges ? 'changes detected' : 'no changes'}`);
        }
      } else {
        console.warn('Sync failed:', result.error);
      }

    } catch (error) {
      console.error('Error during sync:', error);
      setEditorError(error);
    } finally {
      setIsSyncing(false);
    }
  }, [documentModel, syncWithEditor, isSyncing]);

  /**
   * Sync editor content from document model
   */
  const syncEditorFromModel = useCallback(async () => {
    if (!editor || !documentModel || isSyncing) {
      return;
    }

    setIsSyncing(true);
    isInternalUpdateRef.current = true;

    try {
      const editorContent = getEditorContent();

      if (editorContent) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📥 Syncing editor from document model...');
        }

        // Update editor content without triggering onUpdate
        await new Promise(resolve => {
          setTimeout(() => {
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(editorContent, false, {
                preserveWhitespace: true
              });

              // Update issue highlights after content is set
              setTimeout(() => {
                if (editor && !editor.isDestroyed) {
                  updateIssueHighlights();
                }
                resolve();
              }, 100);
            } else {
              resolve();
            }
          }, 50);
        });

        lastContentRef.current = JSON.stringify(editorContent);

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Editor synced from model');
        }
      }

    } catch (error) {
      console.error('Error syncing editor from model:', error);
      setEditorError(error);
    } finally {
      isInternalUpdateRef.current = false;
      setIsSyncing(false);
    }
  }, [editor, documentModel, getEditorContent, isSyncing]);

  /**
   * Update issue highlights in editor
   */
  const updateIssueHighlights = useCallback(() => {
    if (!editor || !editor.commands.updateIssueHighlights) {
      return;
    }

    try {
      editor.commands.updateIssueHighlights({
        issues: issues,
        activeIssueId: activeIssueId,
        showHighlighting: showIssueHighlighting
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 Updated highlights for ${issues.length} issues`);
      }
    } catch (error) {
      console.error('Error updating issue highlights:', error);
    }
  }, [editor, issues, activeIssueId, showIssueHighlighting]);

  /**
   * Scroll to specific issue in editor
   * Uses the same search logic as tiptapIssueHighlighter for consistency
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

    // Determine search text (same as highlighter)
    let searchText = issue.highlightText || issue.text || '';
    if (!searchText || searchText.length < 2) {
      console.warn('scrollToIssue: No valid search text', { issueId, searchText });
      return;
    }

    // Handle truncated text (same as highlighter)
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

      // Use same search strategy as highlighter
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

  // === EFFECTS ===

  // Sync editor when document model changes
  useEffect(() => {
    if (editorInitialized && documentModel && editorState.needsSync) {
      syncEditorFromModel();
    }
  }, [editorInitialized, documentModel, editorState.needsSync]);

  // Update issue highlights when issues change
  useEffect(() => {
    if (editorInitialized) {
      const timer = setTimeout(() => {
        updateIssueHighlights();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [editorInitialized, issues, activeIssueId, showIssueHighlighting, updateIssueHighlights]);

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
        console.log('📋 Document restored, syncing editor...', data.description);
      }

      // Sync editor from restored document
      setTimeout(() => {
        syncEditorFromModel();
      }, 100);
    });

    return cleanup;
  }, [events]);

  // Listen for fix application events
  useEffect(() => {
    const cleanup = events.on('fixApplied', (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Fix applied, syncing editor...', data.fixAction);
      }

      // Sync editor after fix application
      setTimeout(() => {
        syncEditorFromModel();
      }, 100);
    });

    return cleanup;
  }, [events]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // === MANUAL SYNC METHODS ===

  /**
   * Force sync editor to document model
   */
  const forceSync = useCallback(async () => {
    if (editor) {
      const currentContent = editor.getJSON();
      await performSync(currentContent);
    }
  }, [editor, performSync]);

  /**
   * Refresh editor from document model
   */
  const refreshFromModel = useCallback(async () => {
    await syncEditorFromModel();
  }, []);

  return {
    editor,
    editorError,
    setEditorError,
    editorInitialized,
    setEditorInitialized,
    isSyncing,
    scrollToIssue,
    forceSync,
    refreshFromModel,

    // Stats for debugging
    stats: {
      hasDocument: !!documentModel,
      documentVersion: documentModel?.version,
      issueCount: issues.length,
      lastSync: editorState.lastSyncTimestamp,
      needsSync: editorState.needsSync
    }
  };
};