'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { 
  FileText,
  CheckCircle2,
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle
} from 'lucide-react';

export default function SimpleDocumentEditor() {
  const { 
    documentText, 
    documentFormatting,
    issues,
    showIssueHighlighting,
    toggleIssueHighlighting
  } = useDocumentStore();

  // Simple editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[500px] p-8 focus:outline-none'
      }
    }
  });

  // Update content when document loads
  useEffect(() => {
    if (editor && documentText) {
      console.log('Setting document text:', documentText.substring(0, 100));
      
      // For now, just set the text directly
      const paragraphs = documentText.split('\n').filter(p => p.trim());
      const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');
      
      editor.commands.setContent(htmlContent || '<p>No content</p>');
    }
  }, [editor, documentText]);

  if (!documentText) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="text-center max-w-lg">
          <div className="relative inline-block mb-8">
            <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
              <FileText className="h-14 w-14 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-4">
            Ready to Perfect Your Document
          </h2>
          <p className="text-gray-600 mb-10 text-lg">
            Upload your academic paper to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Document Editor (Simplified)</h3>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => toggleIssueHighlighting()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                showIssueHighlighting 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {showIssueHighlighting ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showIssueHighlighting ? 'Hide' : 'Show'} Issues</span>
            </button>
            
            {issues.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {issues.length} issues
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="p-8 text-center text-gray-500">
              Loading editor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}