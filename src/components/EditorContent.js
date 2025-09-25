'use client';

import { memo } from 'react';
import { EditorContent as TiptapEditorContent } from '@tiptap/react';
import { AlertCircle } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

const EditorContent = memo(({
  editor,
  editorInitialized,
  editorError,
  setEditorError,
  setEditorInitialized,
  documentText
}) => {
  if (editorError) {
    return (
      <div className="p-8 min-h-[500px] bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Editor Error</h3>
          <p className="text-sm text-red-600 mb-4">
            The document editor encountered an error and could not load properly.
          </p>
          <p className="text-xs text-red-500 mb-4 font-mono">
            {editorError.message}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setEditorError(null);
                setEditorInitialized(false);
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Reload Editor
            </button>
            {documentText && (
              <div className="mt-4 p-4 bg-white rounded border text-left max-h-60 overflow-auto">
                <h4 className="font-medium text-gray-700 mb-2">Document Text Preview:</h4>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {documentText.substring(0, 1000)}
                  {documentText.length > 1000 && '...'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (editor && editorInitialized) {
    return (
      <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <>
          <TiptapEditorContent editor={editor} />
          {/* Debug info - only in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-gray-100 border-t text-xs text-gray-600">
              <div>Editor ready: {editor.isEditable ? 'Yes' : 'No'}</div>
              <div>Document text length: {documentText?.length || 0}</div>
              <div>Editor HTML length: {editor.getHTML()?.length || 0}</div>
              <div>First 100 chars: {documentText?.substring(0, 100)}</div>
            </div>
          )}
        </>
      </ErrorBoundary>
    );
  }

  return (
    <div className="p-8 min-h-[500px]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p className="text-gray-600">Initializing editor...</p>
        {documentText && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-yellow-50 rounded text-left">
            <p className="text-sm font-semibold text-yellow-800 mb-2">Document loaded but editor not ready</p>
            <p className="text-xs text-gray-700">Document preview: {documentText.substring(0, 200)}...</p>
          </div>
        )}
      </div>
    </div>
  );
});

EditorContent.displayName = 'EditorContent';

export default EditorContent;