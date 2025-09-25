'use client';

import { useCallback, memo } from 'react';
import { tiptapConverter } from '@/utils/tiptapDocumentConverter';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';
import { useTextReplacement } from '@/hooks/useTextReplacement';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import EmptyDocumentState from './EmptyDocumentState';
import LoadingState from './LoadingState';
import DocumentIssuesBanner from './DocumentIssuesBanner';
import DocumentControls from './DocumentControls';
import FormattingToolbar from './FormattingToolbar';
import EditorContent from './EditorContent';

const DocumentEditor = memo(() => {
  const {
    documentText,
    activeIssueId,
    issues,
    setActiveIssue,
    lastFixAppliedAt,
    processingState,
    documentFormatting,
    showIssueHighlighting,
    toggleIssueHighlighting
  } = useDocumentStore();

  if (process.env.NODE_ENV === 'development') {
    console.log('DocumentEditor render:', {
      hasDocumentText: !!documentText,
      documentTextLength: documentText?.length,
      firstChars: documentText?.substring(0, 50)
    });
  }

  const isLoading = processingState.isUploading || processingState.isAnalyzing;

  // Use custom hooks for editor functionality
  const { editor, editorError, setEditorError, editorInitialized, setEditorInitialized } = useDocumentEditor();

  useTextReplacement(editor, issues, activeIssueId, showIssueHighlighting);

  // Handle manual analysis
  const handleManualAnalysis = useCallback(async () => {
    const { analyzeEditorContent } = useDocumentStore.getState();

    if (analyzeEditorContent && !isLoading && editor) {
      const content = editor.getJSON();
      await analyzeEditorContent(content, documentFormatting);
    }
  }, [editor, isLoading, documentFormatting]);

  useKeyboardShortcuts(handleManualAnalysis);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (!documentText) {
    return <EmptyDocumentState />;
  }


  return (
    <div className="h-full flex flex-col">
      <DocumentIssuesBanner
        issues={issues}
        showIssueHighlighting={showIssueHighlighting}
        setActiveIssue={setActiveIssue}
      />

      <DocumentControls
        lastFixAppliedAt={lastFixAppliedAt}
        documentText={documentText}
        documentFormatting={documentFormatting}
        handleManualAnalysis={handleManualAnalysis}
        isLoading={isLoading}
        processingState={processingState}
        showIssueHighlighting={showIssueHighlighting}
        toggleIssueHighlighting={toggleIssueHighlighting}
        issues={issues}
        editor={editor}
        tiptapConverter={tiptapConverter}
      />

      <FormattingToolbar editor={editor} />

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          <div className="mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <EditorContent
                editor={editor}
                editorInitialized={editorInitialized}
                editorError={editorError}
                setEditorError={setEditorError}
                setEditorInitialized={setEditorInitialized}
                documentText={documentText}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DocumentEditor.displayName = 'DocumentEditor';

export default DocumentEditor;