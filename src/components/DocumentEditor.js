'use client';

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { FormattedParagraph, FontFormatting, DocumentDefaults } from '@/utils/tiptapFormattingExtensions';
import { tiptapConverter } from '@/utils/tiptapDocumentConverter';
import { IssueHighlighter } from '@/utils/tiptapIssueHighlighter';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import ErrorBoundary from './ErrorBoundary';
import { 
  FileText,
  CheckCircle2,
  Eye, 
  EyeOff, 
  FileSearch, 
  Sparkles, 
  AlertCircle,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Undo,
  Redo
} from 'lucide-react';

export default function DocumentEditor() {
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
  
  console.log('DocumentEditor render:', {
    hasDocumentText: !!documentText,
    documentTextLength: documentText?.length,
    firstChars: documentText?.substring(0, 50)
  });
  
  const editorRef = useRef(null);
  const isLoading = processingState.isUploading || processingState.isAnalyzing;
  const lastContentUpdate = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editorError, setEditorError] = useState(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  // Ensure client-side only rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Tiptap editor with SSR fix and error handling
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, // Disable default paragraph to use our formatted version
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      FormattedParagraph, // Our custom paragraph with formatting
      FontFormatting,     // Custom mark for font properties
      DocumentDefaults,   // Document-wide defaults
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
    onUpdate: ({ editor }) => {
      try {
        // Track content changes for analysis
        const currentContent = editor.getJSON();
        lastContentUpdate.current = currentContent;
      } catch (error) {
        console.error('Error in editor onUpdate:', error);
        setEditorError(error);
      }
    },
    onCreate: ({ editor }) => {
      try {
        console.log('Editor created successfully, isEditable:', editor.isEditable);
        setEditorInitialized(true);
        setEditorError(null);
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

  // Update editor content when document changes from server
  useEffect(() => {
    console.log('useEffect for content update:', {
      hasEditor: !!editor,
      hasDocumentText: !!documentText,
      hasDocumentFormatting: !!documentFormatting,
      editorReady: editor?.isEditable
    });
    
    if (!editor || !documentText) {
      console.log('Skipping update - missing editor or text');
      return;
    }
    
    // Force update with current content
    console.log('Setting editor content with formatting:', {
      hasFormatting: !!documentFormatting,
      paragraphCount: documentFormatting?.paragraphs?.length
    });
    
    // Always try to use Tiptap formatting for better preservation
    if (documentFormatting && documentFormatting.paragraphs) {
      // Use async function to handle document conversion
      const convertAndSetContent = async () => {
        try {
          const paragraphCount = documentFormatting.paragraphs.length;
          console.log(`Converting document with ${paragraphCount} paragraphs...`);

          // Always convert to Tiptap format to preserve formatting (now async)
          const tiptapDoc = await tiptapConverter.convertToTiptapDocument(documentText, documentFormatting);
          console.log('Converted Tiptap document');

          // Set content with a delay to ensure editor is ready
          setTimeout(() => {
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(tiptapDoc);
              console.log('Document content set with formatting');

              // After content is set, update highlighting
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
        console.error('Error converting document:', error);
        // Fallback to HTML with preserved styling
        let htmlContent = '';
        
        if (documentFormatting && documentFormatting.paragraphs) {
          documentFormatting.paragraphs.forEach((para, index) => {
            if (index > 2000) return; // Limit for performance
            
            let paraText = '';
            let styleAttr = '';
            
            // Extract text
            if (para.runs && para.runs.length > 0) {
              paraText = para.runs.map(run => run.text || '').join('');
            } else if (para.text) {
              paraText = para.text;
            }
            
            // Build style attribute
            const styles = [];
            if (para.spacing?.line) {
              styles.push(`line-height: ${para.spacing.line}`);
            }
            if (para.spacing?.before) {
              styles.push(`margin-top: ${para.spacing.before}pt`);
            }
            if (para.spacing?.after) {
              styles.push(`margin-bottom: ${para.spacing.after}pt`);
            }
            if (para.indentation?.firstLine) {
              styles.push(`text-indent: ${para.indentation.firstLine}in`);
            }
            if (para.alignment && para.alignment !== 'left') {
              styles.push(`text-align: ${para.alignment}`);
            }
            
            if (styles.length > 0) {
              styleAttr = ` style="${styles.join('; ')}"`;
            }
            
            // Only add non-empty paragraphs
            if (paraText && paraText.trim()) {
              // Escape HTML characters
              paraText = paraText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
              
              htmlContent += `<p${styleAttr}>${paraText}</p>`;
            }
          });
        }
        
        // Ensure we have some content
        if (!htmlContent) {
          const paragraphs = (documentText || '').split('\n').filter(p => p.trim()).slice(0, 500);
          htmlContent = paragraphs.map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('') || '<p>Document could not be displayed</p>';
        }
        
        setTimeout(() => {
          if (editor && !editor.isDestroyed) {
            editor.commands.setContent(htmlContent);
            console.log('Document rendered as HTML with styles');
          }
        }, 100);
        }
      };

      // Start async conversion
      convertAndSetContent();
    } else {
      // No formatting data, use document text
      const paragraphs = (documentText || '').split('\n').filter(p => p.trim()).slice(0, 500);
      const htmlContent = paragraphs.map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('') || '<p>No content to display</p>';
      
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(htmlContent);
        }
      }, 100);
    }
  }, [editor, documentText, documentFormatting]); // Include formatting in dependencies

  // Update issue highlighting when issues or settings change
  useEffect(() => {
    if (!editor || !editor.commands) return;
    
    console.log('Updating issue highlights:', {
      issueCount: issues.length,
      showIssueHighlighting,
      activeIssueId
    });
    
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      if (editor && !editor.isDestroyed) {
        // Update highlights with current issues
        editor.commands.updateIssueHighlights({
          issues: issues,
          activeIssueId: activeIssueId,
          showHighlighting: showIssueHighlighting
        });
        
        // Scroll to active issue if there is one
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
    
    // Find the issue text in the document
    const searchText = issue.highlightText || issue.text;
    if (!searchText) return;
    
    let found = false;
    doc.descendants((node, pos) => {
      if (found) return false;
      
      if (node.isText && node.text.includes(searchText)) {
        // Focus the editor and set selection
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

  // Handle manual analysis
  const handleManualAnalysis = useCallback(async () => {
    const { analyzeEditorContent } = useDocumentStore.getState();
    
    if (analyzeEditorContent && !isLoading && editor) {
      const content = editor.getJSON();
      await analyzeEditorContent(content, documentFormatting);
    }
  }, [editor, isLoading, documentFormatting]);

  // Apply text replacement for fixes
  const applyTextReplacement = useCallback((originalText, replacementText) => {
    if (!editor || !originalText) return;
    
    console.log('Applying text replacement:', { originalText, replacementText });
    
    const { state } = editor;
    const { doc, tr } = state;
    let replaced = false;
    
    // Search and replace in the document
    doc.descendants((node, pos) => {
      if (!replaced) {
        if (node.isText) {
          const text = node.text;
          const index = text.indexOf(originalText);
          
          if (index !== -1) {
            const from = pos + index;
            const to = from + originalText.length;
            
            // Use transaction to replace text
            editor.chain()
              .focus()
              .setTextSelection({ from, to })
              .deleteSelection()
              .insertContent(replacementText)
              .run();
            
            replaced = true;
            console.log('Text replaced at position:', from);
          }
        } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          // For block nodes, check text content
          const text = node.textContent;
          const index = text.indexOf(originalText);
          
          if (index !== -1) {
            const from = pos + index + 1; // +1 for block node boundary
            const to = from + originalText.length;
            
            editor.chain()
              .focus()
              .setTextSelection({ from, to })
              .deleteSelection()
              .insertContent(replacementText)
              .run();
            
            replaced = true;
            console.log('Text replaced in block at position:', from);
          }
        }
      }
    });
    
    if (replaced) {
      // Update highlights after replacement
      setTimeout(() => {
        editor.commands.updateIssueHighlights({
          issues: issues,
          activeIssueId: activeIssueId,
          showHighlighting: showIssueHighlighting
        });
      }, 100);
    } else {
      console.warn('Text not found for replacement:', originalText);
    }
  }, [editor, issues, activeIssueId, showIssueHighlighting]);

  // Listen for active issue changes from store
  useEffect(() => {
    if (!editor || !activeIssueId) return;
    
    // Update active issue highlight
    editor.commands.setActiveIssue(activeIssueId);
  }, [editor, activeIssueId]);

  // Listen for text replacement events using store event system
  useEffect(() => {
    const handleTextReplacement = (data) => {
      const { originalText, replacementText } = data;
      applyTextReplacement(originalText, replacementText);
    };

    // Use store event system instead of window events for better scoping
    const { events } = useDocumentStore.getState();
    const cleanup = events.on('applyTextReplacement', handleTextReplacement);

    return cleanup; // Automatic cleanup when component unmounts
  }, [applyTextReplacement]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        handleManualAnalysis();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleManualAnalysis]);

  // Document-level formatting issues
  const documentLevelIssues = useMemo(() => {
    return issues.filter(issue => 
      issue.location?.type === 'document' && 
      ['formatting'].includes(issue.category)
    );
  }, [issues]);

  // Empty state
  if (!documentText) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="text-center max-w-lg">
          <div className="relative inline-block mb-8">
            <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <FileText className="h-14 w-14 text-white transform -rotate-3" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
            Ready to Perfect Your Document
          </h2>
          <p className="text-gray-600 mb-10 text-lg leading-relaxed">
            Upload your academic paper to start editing with intelligent APA 7th edition validation
          </p>
          
          <div className="grid gap-4 max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Real-time Validation</p>
                  <p className="text-sm text-gray-600 mt-0.5">Instant APA compliance checking as you edit</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileSearch className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Smart Issue Detection</p>
                  <p className="text-sm text-gray-600 mt-0.5">Automatically finds and highlights APA violations</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">One-Click Fixes</p>
                  <p className="text-sm text-gray-600 mt-0.5">Apply automated corrections with confidence</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col items-center">
          <div className="loading-spinner mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Document</h3>
          <p className="text-sm text-gray-500 text-center max-w-sm">
            Analyzing your document with enhanced XML processing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Document-level Issues Banner */}
      {documentLevelIssues.length > 0 && showIssueHighlighting && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Document-wide formatting issues detected
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {documentLevelIssues.map(issue => (
                    <span 
                      key={issue.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 cursor-pointer hover:bg-amber-200"
                      onClick={() => setActiveIssue(issue.id)}
                    >
                      {issue.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const firstIssue = documentLevelIssues[0];
                if (firstIssue) setActiveIssue(firstIssue.id);
              }}
              className="text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              View in Issues Panel →
            </button>
          </div>
        </div>
      )}
      
      {/* Document Controls */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Document Editor</h3>
              {lastFixAppliedAt && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
                  Recently Updated
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* Force Update Button - Debug */}
              {documentText && (
                <button
                  onClick={async () => {
                    if (editor && documentText && documentFormatting) {
                      try {
                        const tiptapDoc = await tiptapConverter.convertToTiptapDocument(documentText, documentFormatting);
                        editor.commands.setContent(tiptapDoc);
                        console.log('Forced formatted content update');
                      } catch (error) {
                        console.error('Force update error:', error);
                        const paragraphs = documentText.split('\n').filter(p => p.trim());
                        const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');
                        editor.commands.setContent(htmlContent);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                >
                  Force Update Content
                </button>
              )}
              
              {/* Run Check Button */}
              <button 
                onClick={handleManualAnalysis}
                disabled={isLoading || processingState.isAnalyzing}
                title="Run APA analysis on current document (Ctrl+Shift+C)"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isLoading || processingState.isAnalyzing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {processingState.isAnalyzing ? (
                  <>
                    <div className="loading-spinner w-4 h-4"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Run Check</span>
                  </>
                )}
              </button>
              
              {/* Toggle Highlighting */}
              <button 
                onClick={() => toggleIssueHighlighting()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  showIssueHighlighting 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showIssueHighlighting ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span>Hide Issues</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Show Issues</span>
                  </>
                )}
              </button>
              
              {/* Issue Count */}
              {issues.length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Formatting Toolbar */}
        <div className="px-6 py-2 flex items-center space-x-1 bg-gray-50">
          <div className="flex items-center space-x-1 pr-3 border-r border-gray-200">
            <button 
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </button>
            <button 
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-1 px-3">
            <button 
              className={`p-2 rounded transition-colors ${
                editor?.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Bold"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button 
              className={`p-2 rounded transition-colors ${
                editor?.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Italic"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button 
              className={`p-2 rounded transition-colors ${
                editor?.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Underline"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          <div className="mx-auto">
            <div 
              ref={editorRef}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {editorError ? (
                // Show editor error fallback
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
              ) : editor && editorInitialized ? (
                <ErrorBoundary showDetails={true}>
                  <>
                    <EditorContent editor={editor} />
                    {/* Debug info */}
                    <div className="p-4 bg-gray-100 border-t text-xs text-gray-600">
                      <div>Editor ready: {editor.isEditable ? 'Yes' : 'No'}</div>
                      <div>Document text length: {documentText?.length || 0}</div>
                      <div>Editor HTML length: {editor.getHTML()?.length || 0}</div>
                      <div>First 100 chars: {documentText?.substring(0, 100)}</div>
                    </div>
                  </>
                </ErrorBoundary>
              ) : (
                <div className="p-8 min-h-[500px]">
                  <div className="text-center">
                    <div className="loading-spinner mb-4"></div>
                    <p className="text-gray-600">Initializing editor...</p>
                    {documentText && (
                      <div className="mt-4 p-4 bg-yellow-50 rounded text-left">
                        <p className="text-sm font-semibold text-yellow-800 mb-2">Document loaded but editor not ready</p>
                        <p className="text-xs text-gray-700">Document preview: {documentText.substring(0, 200)}...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}