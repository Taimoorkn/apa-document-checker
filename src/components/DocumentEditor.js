'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';  // Fixed: Named import
import { Color } from '@tiptap/extension-color';  // Fixed: Named import
// Removed Underline - it's already in StarterKit
import { useEffect, useState, useCallback, useRef } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { FileText, AlertCircle, Loader2, Highlighter } from 'lucide-react';

// Custom extension for APA highlighting
const APAHighlight = Highlight.extend({
  name: 'apaHighlight',
  
  addAttributes() {
    return {
      ...this.parent?.(),
      issueId: {
        default: null,
      },
      severity: {
        default: 'minor',
      },
      title: {
        default: '',
      },
    };
  },
});

export default function DocumentEditor() {
  const { 
    displayData, 
    analysisData, 
    documentId,
    activeIssueId, 
    setActiveIssue,
    issues 
  } = useDocumentStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);  // Track client-side mounting
  const [showHighlights, setShowHighlights] = useState(true); // Toggle for highlights
  const editorRef = useRef(null);

  // Ensure we're on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize TipTap editor with SSR fix
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      APAHighlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-full p-8',
        // Don't force Times New Roman - preserve document's original formatting
      },
    },
    onUpdate: ({ editor }) => {
      // Debounced analysis could go here
    },
    immediatelyRender: false  // Fix for SSR hydration mismatch
  });

  // Load document HTML into editor
  useEffect(() => {
    if (displayData?.html && editor) {
      setIsProcessing(true);
      
      // Use the original HTML with its formatting preserved
      // Don't clean it too aggressively to maintain formatting
      const formattedHtml = preserveFormattingInHtml(displayData.html);
      
      // Set content in editor
      editor.commands.setContent(formattedHtml);
      
      // Apply highlights after content is loaded if enabled
      setTimeout(() => {
        if (showHighlights) {
          applyIssueHighlights();
        }
        setIsProcessing(false);
      }, 100);
    }
  }, [displayData?.html, editor]);

  // Re-apply or clear highlights when toggle changes
  useEffect(() => {
    if (editor && displayData?.html) {
      if (showHighlights) {
        applyIssueHighlights();
      } else {
        // Clear all highlights
        editor.commands.unsetHighlight();
      }
    }
  }, [showHighlights, editor, issues]);

  // Removed iframe preview mode - using single unified editor

  // Apply issue highlights to editor
  const applyIssueHighlights = useCallback(() => {
    if (!editor || !issues || issues.length === 0) return;

    // Clear existing highlights
    editor.commands.unsetHighlight();

    // Apply new highlights
    issues.forEach(issue => {
      if (issue.text) {
        // Find text in editor and highlight it
        const content = editor.getHTML();
        const index = content.toLowerCase().indexOf(issue.text.toLowerCase());
        
        if (index !== -1) {
          // This is simplified - in production you'd need proper text position mapping
          editor.chain()
            .focus()
            .setTextSelection({ from: index, to: index + issue.text.length })
            .setHighlight({ 
              color: getSeverityColor(issue.severity),
              issueId: issue.id,
              severity: issue.severity,
              title: issue.title
            })
            .run();
        }
      }
    });
  }, [editor, issues]);

  // Removed iframe highlighting - using TipTap editor only

  // Preserve formatting while cleaning HTML
  const preserveFormattingInHtml = (html) => {
    // Keep important styles but remove LibreOffice-specific tags
    let cleaned = html
      .replace(/<o:p[^>]*>/g, '<p>')
      .replace(/<\/o:p>/g, '</p>');
    
    // Preserve important inline styles for formatting
    // Don't remove style attributes completely
    
    return cleaned;
  };

  // Get color based on severity
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return '#ffcdd2';
      case 'Major': return '#ffe0b2';
      case 'Minor': return '#bbdefb';
      default: return '#fff9c4';
    }
  };

  // Handle active issue change
  useEffect(() => {
    if (activeIssueId && editor) {
      // Scroll to and highlight the active issue
      // This would need proper implementation with text position mapping
    }
  }, [activeIssueId, editor]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Document Editor
          </h3>
          {documentId && (
            <span className="text-sm text-gray-500">
              ID: {documentId.substring(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Show/Hide Highlights Toggle */}
          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors ${
              showHighlights
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
          >
            <Highlighter className="h-4 w-4" />
            <span>{showHighlights ? 'Hide' : 'Show'} Highlights</span>
          </button>
          
          {isProcessing && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {!displayData?.html && !analysisData?.text ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <FileText className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Check Your Document
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Upload your academic paper to start editing and checking against APA 7th edition guidelines
              </p>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 mb-1">
                      Enhanced Editor Features
                    </p>
                    <p className="text-sm text-gray-600">
                      • Real-time APA validation<br />
                      • In-line issue highlighting<br />
                      • Rich text editing capabilities<br />
                      • Live preview with original formatting
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Unified Editor (like Grammarly)
          <div className="h-full overflow-auto bg-white" ref={editorRef}>
            {isMounted && editor ? (
              <EditorContent 
                editor={editor} 
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}