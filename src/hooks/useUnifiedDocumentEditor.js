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

      // FALLBACK: If paragraph search failed, try document-wide search
      if (positions.length === 0 && issue.location?.paragraphIndex !== undefined) {
        if (process.env.NODE_ENV === 'development') {
          console.log('scrollToIssue: Paragraph search failed, trying document-wide search...');
        }

        // Try case-sensitive document-wide search
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

        // If still not found, try case-insensitive
        if (positions.length === 0) {
          const searchLower = searchText.toLowerCase();
          doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              const text = node.textContent;
              const textLower = text.toLowerCase();
              if (textLower.includes(searchLower)) {
                const index = textLower.indexOf(searchLower);
                if (index !== -1) {
                  const from = pos + 1 + index;
                  const to = from + searchText.length;
                  positions.push({ from, to });
                }
              }
            }
          });
        }
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
      if (!editor) {
        console.warn('⚠️ [useUnifiedDocumentEditor] Editor not available for fix application');
        return;
      }

      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║    🔧 [useUnifiedDocumentEditor] APPLYING FIX        ║');
      console.log('╚═══════════════════════════════════════════════════════╝');

      const { fixData, pmPosition } = data;

      if (!fixData) {
        console.warn('   ⚠️ No fixData provided');
        return;
      }

      console.log(`   Fix type: ${fixData.type}`);
      if (pmPosition) {
        console.log(`   Has pmPosition: from=${pmPosition.from}, to=${pmPosition.to}`);
      } else {
        console.log(`   No pmPosition, will use fallback`);
      }

      // Apply fix via ProseMirror transaction (surgical update)
      try {
        if (fixData.type === 'textReplacement' && fixData.textReplacement) {
          const { text: replacementText, original: originalText } = fixData.textReplacement;
          const { state, view } = editor;
          const { doc } = state;
          let foundPosition = null;

          console.log(`   Replacing: "${originalText?.substring(0, 40)}${originalText?.length > 40 ? '...' : ''}"`);
          console.log(`   With: "${replacementText?.substring(0, 40)}${replacementText?.length > 40 ? '...' : ''}"`);

          if (!originalText) {
            console.warn('   ❌ No original text provided for replacement');
            return;
          }

          // NEW: Use pmPosition if available (accurate, no search needed)
          if (pmPosition) {
            const { from, to } = pmPosition;

            // Validate position is still correct (content might have changed)
            if (from >= 0 && to <= doc.content.size && from < to) {
              const textAtPosition = doc.textBetween(from, to, ' ');

              if (textAtPosition === originalText || textAtPosition.includes(originalText)) {
                foundPosition = { from, to };
                console.log(`   ✅ Using pmPosition: from=${from}, to=${to}`);
              } else {
                console.warn(`   ⚠️ pmPosition text mismatch:`);
                console.warn(`      Expected: "${originalText.substring(0, 30)}..."`);
                console.warn(`      Actual: "${textAtPosition.substring(0, 30)}..."`);
                console.warn(`      Falling back to search...`);
              }
            }
          }

          // FALLBACK: Search-based positioning (if pmPosition not available or stale)
          if (!foundPosition) {
            const legacyFrom = fixData.textReplacement.from;
            const legacyTo = fixData.textReplacement.to;

            // Try legacy position first
            if (legacyFrom < doc.content.size && legacyTo <= doc.content.size) {
              const textAtPosition = doc.textBetween(legacyFrom, legacyTo, ' ');
              if (textAtPosition === originalText || textAtPosition.includes(originalText)) {
                foundPosition = { from: legacyFrom, to: legacyTo };
              }
            }

            // If still not found, search the entire document
            if (!foundPosition) {
              if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Searching for text to replace:', originalText.substring(0, 50));
              }

              doc.descendants((node, pos) => {
                if (foundPosition) return false;

                if (node.isText && node.text.includes(originalText)) {
                  const index = node.text.indexOf(originalText);
                  foundPosition = {
                    from: pos + index,
                    to: pos + index + originalText.length
                  };
                  return false;
                } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                  const text = node.textContent;
                  if (text.includes(originalText)) {
                    const index = text.indexOf(originalText);
                    foundPosition = {
                      from: pos + 1 + index,
                      to: pos + 1 + index + originalText.length
                    };
                    return false;
                  }
                }
              });
            }
          }

          if (foundPosition) {
            const tr = state.tr;
            tr.insertText(replacementText, foundPosition.from, foundPosition.to);
            view.dispatch(tr);

            console.log('   ✅ Text replacement applied via transaction');
            console.log('╚═══════════════════════════════════════════════════════╝\n');
          } else {
            console.warn('   ❌ Could not find text to replace');
            console.warn('╚═══════════════════════════════════════════════════════╝\n');
          }
        }
        else if (fixData.type === 'formatting' && fixData.formatting) {
          // NEW: Apply formatting fix via transaction (preserves cursor position)
          const { property, value} = fixData.formatting;
          const { state, view } = editor;
          const tr = state.tr;

          console.log(`   🎨 Applying formatting fix: ${property}=${value}`);
          console.log('   Traversing document nodes...');

          // Apply formatting to all nodes in the document
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              // Update paragraph-level attributes
              if (property === 'lineHeight') {
                tr.setNodeMarkup(pos, null, { ...node.attrs, lineHeight: value });
              } else if (property === 'indentation') {
                tr.setNodeMarkup(pos, null, { ...node.attrs, firstLineIndent: `${value}in` });
              }
            } else if (node.isText && (property === 'fontFamily' || property === 'fontSize')) {
              // Update text marks for font properties
              const from = pos;
              const to = pos + node.nodeSize;

              // Get existing marks
              const marks = node.marks;

              // Find or create fontFormatting mark
              let fontMark = marks.find(m => m.type.name === 'fontFormatting');

              if (fontMark) {
                // Update existing mark
                const newAttrs = { ...fontMark.attrs };
                if (property === 'fontFamily') newAttrs.fontFamily = value;
                if (property === 'fontSize') newAttrs.fontSize = value;

                tr.removeMark(from, to, fontMark);
                tr.addMark(from, to, state.schema.marks.fontFormatting.create(newAttrs));
              } else {
                // Create new mark
                const attrs = {};
                if (property === 'fontFamily') attrs.fontFamily = value;
                if (property === 'fontSize') attrs.fontSize = value;

                tr.addMark(from, to, state.schema.marks.fontFormatting.create(attrs));
              }
            }
          });

          view.dispatch(tr);

          console.log('   ✅ Formatting fix applied via transaction (cursor preserved)');
          console.log('╚═══════════════════════════════════════════════════════╝\n');
        }
      } catch (error) {
        console.error('   ❌ [useUnifiedDocumentEditor] Error applying fix:', error);
        console.error('╚═══════════════════════════════════════════════════════╝\n');
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
