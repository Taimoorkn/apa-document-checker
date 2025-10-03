'use client';

import React from 'react';
import { EditorContent } from '@tiptap/react';
import { useUnifiedDocumentEditor } from '@/hooks/useUnifiedDocumentEditor';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';
import { useToast } from '@/hooks/use-toast';
import EmptyDocumentState from '@/components/EmptyDocumentState';
import LoadingState from '@/components/LoadingState';
import DocumentControls from '@/components/DocumentControls';
import FormattingToolbar from '@/components/FormattingToolbar';
import { SavingIndicator } from '@/components/SavingIndicator';

/**
 * New Document Editor Component
 * Uses the new real-time editing architecture with Tiptap as source of truth
 */
export const NewDocumentEditor = () => {
  const {
    documentModel,
    processingState
  } = useUnifiedDocumentStore();

  const {
    editor,
    editorError,
    editorInitialized,
    issues,
    isAnalyzing,
    triggerAnalysis,
    showHighlighting,
    toggleHighlighting,
    saveStatus,
    saveError,
    retrySave
  } = useUnifiedDocumentEditor();

  const { toast } = useToast();
  const isLoading = processingState.isUploading;

  // Show error toast when save fails
  React.useEffect(() => {
    if (saveError) {
      toast({
        title: "Auto-save failed",
        description: saveError,
        variant: "destructive",
      });
    }
  }, [saveError, toast]);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (!documentModel) {
    return <EmptyDocumentState />;
  }

  // Error state
  if (editorError) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-4">
            <div className="text-red-400 text-2xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-semibold text-lg">Editor Error</h3>
              <p className="text-red-600 mt-1">
                {editorError.message || 'The document editor encountered an error'}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <DocumentControls
        documentText={documentModel.getPlainText()}
        isAnalyzing={isAnalyzing}
        onRunAnalysis={triggerAnalysis}
        showIssueHighlighting={showHighlighting}
        toggleIssueHighlighting={toggleHighlighting}
        issues={issues}
        editor={editor}
      />

      <FormattingToolbar editor={editor} />

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-slate-50" style={{ scrollBehavior: 'smooth' }}>
        <div className="p-6">
          <div className="mx-auto max-w-4xl">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200">
              {!editorInitialized && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-3 text-slate-600">Initializing editor...</p>
                  </div>
                </div>
              )}
              <EditorContent
                editor={editor}
                className="prose max-w-none min-h-[500px] p-8 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Saving Indicator */}
      <SavingIndicator saveStatus={saveStatus} onRetry={retrySave} />
    </div>
  );
};

export default NewDocumentEditor;