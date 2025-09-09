'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createEditor, Editor, Transforms, Text, Node, Path, Range, Point } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { decorationHighlighter } from '@/utils/slateDecorationHighlighter';
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
  Underline,
  Undo,
  Redo
} from 'lucide-react';

// Custom Slate.js element types for APA document structure
const ELEMENT_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading-1',
  HEADING_2: 'heading-2',
  HEADING_3: 'heading-3',
  HEADING_4: 'heading-4',
  HEADING_5: 'heading-5',
  TITLE: 'title',
  CITATION: 'citation'
};

export default function DocumentEditorWithDecorations() {
  const { 
    documentText, 
    documentHtml, 
    activeIssueId, 
    issues, 
    setActiveIssue, 
    lastFixAppliedAt, 
    processingState, 
    documentFormatting,
    currentDocumentBuffer,
    analyzeDocument,
    showIssueHighlighting,
    toggleIssueHighlighting
  } = useDocumentStore();
  
  // Editor state
  const [editor] = useState(() => withHistory(withReact(createEditor())));
  const [value, setValue] = useState([{
    type: 'paragraph',
    children: [{ text: '' }]
  }]);
  
  // Decorations state for highlighting
  const [decorations, setDecorations] = useState([]);
  
  // Refs for components
  const editorRef = useRef(null);
  const renderRef = useRef(0);
  
  const isLoading = processingState.isUploading || processingState.isAnalyzing;

  // Convert document with rich formatting data to Slate nodes
  const convertTextToSlateNodes = useCallback((text, formatting) => {
    if (!formatting?.paragraphs?.length) {
      return [{ type: ELEMENT_TYPES.PARAGRAPH, children: [{ text: text || '' }] }];
    }

    const result = formatting.paragraphs.map((paraFormatting, index) => {
      // Determine paragraph type based on style and content
      const paraType = determineParagraphType(paraFormatting.text, paraFormatting);
      
      // Create children with rich formatting from runs
      let children = [];
      
      if (paraFormatting.runs && paraFormatting.runs.length > 0) {
        children = paraFormatting.runs.map(run => ({
          text: run.text || '',
          bold: run.font?.bold === true,
          italic: run.font?.italic === true,
          underline: run.font?.underline === true,
          fontFamily: run.font?.family || null,
          fontSize: run.font?.size || null,
          color: run.color || null
        }));
      } else {
        children = [{ 
          text: paraFormatting.text || '',
          fontFamily: paraFormatting.font?.family || null,
          fontSize: paraFormatting.font?.size || null
        }];
      }
      
      // Ensure we have at least one child
      if (children.length === 0) {
        children = [{ text: '' }];
      }
      
      return {
        type: paraType,
        children: children,
        paraIndex: index,
        formatting: {
          font: paraFormatting.font,
          spacing: paraFormatting.spacing,
          indentation: paraFormatting.indentation,
          alignment: paraFormatting.alignment,
          style: paraFormatting.style
        }
      };
    });
    
    return result.length > 0 ? result : [{ type: ELEMENT_TYPES.PARAGRAPH, children: [{ text: '' }] }];
  }, []);

  // Determine paragraph type based on content and formatting
  const determineParagraphType = useCallback((text, formatting) => {
    if (formatting?.style) {
      const style = formatting.style.toLowerCase();
      if (style.includes('title')) return ELEMENT_TYPES.TITLE;
      if (style.includes('heading1') || style === 'heading 1') return ELEMENT_TYPES.HEADING_1;
      if (style.includes('heading2') || style === 'heading 2') return ELEMENT_TYPES.HEADING_2;
      if (style.includes('heading3') || style === 'heading 3') return ELEMENT_TYPES.HEADING_3;
      if (style.includes('heading4') || style === 'heading 4') return ELEMENT_TYPES.HEADING_4;
      if (style.includes('heading5') || style === 'heading 5') return ELEMENT_TYPES.HEADING_5;
    }
    return ELEMENT_TYPES.PARAGRAPH;
  }, []);

  // Initialize editor content from document data
  useEffect(() => {
    if (documentText && documentFormatting) {
      const newValue = convertTextToSlateNodes(documentText, documentFormatting);
      
      const isInitialState = value.length === 1 && 
        value[0]?.type === 'paragraph' && 
        value[0]?.children?.length === 1 && 
        value[0]?.children[0]?.text === '';
      
      const shouldUpdate = isInitialState || lastFixAppliedAt;
      
      if (shouldUpdate) {
        setValue(newValue);
      }
    }
  }, [documentText, documentFormatting, lastFixAppliedAt]);

  // Update decorations when issues or highlighting state changes
  useEffect(() => {
    if (!editor || isLoading) {
      setDecorations([]);
      return;
    }

    if (showIssueHighlighting && issues.length > 0) {
      const newDecorations = decorationHighlighter.generateDecorations(
        editor,
        issues,
        documentFormatting,
        activeIssueId
      );
      setDecorations(newDecorations);
    } else {
      setDecorations([]);
    }
  }, [editor, issues, activeIssueId, showIssueHighlighting, documentFormatting, isLoading, value]);

  // Handle decoration rendering
  const decorate = useCallback(([node, path]) => {
    const ranges = [];
    
    decorations.forEach(decoration => {
      if (Range.includes(decoration, path)) {
        ranges.push(decoration);
      }
    });
    
    return ranges;
  }, [decorations]);

  // Handle manual analysis trigger
  const handleManualAnalysis = useCallback(async () => {
    const { analyzeEditorContent } = useDocumentStore.getState();
    
    if (analyzeEditorContent && !isLoading && value.length > 0) {
      await analyzeEditorContent(value, documentFormatting);
    }
  }, [value, isLoading, documentFormatting]);

  // Handle editor value changes
  const handleEditorChange = useCallback((newValue) => {
    setValue(newValue);
  }, []);

  // Custom rendering for different element types
  const renderElement = useCallback((props) => {
    const { attributes, children, element } = props;
    const formatting = element.formatting || {};
    
    const baseStyle = {};
    
    // Apply formatting styles
    if (formatting.font?.family) {
      baseStyle.fontFamily = `"${formatting.font.family}", serif`;
    }
    if (formatting.font?.size) {
      baseStyle.fontSize = `${formatting.font.size}px`;
    }
    if (formatting.spacing?.line) {
      baseStyle.lineHeight = formatting.spacing.line;
    }
    if (formatting.spacing?.before) {
      baseStyle.marginTop = `${formatting.spacing.before}pt`;
    }
    if (formatting.spacing?.after) {
      baseStyle.marginBottom = `${formatting.spacing.after}pt`;
    }
    if (formatting.indentation?.firstLine) {
      baseStyle.textIndent = `${formatting.indentation.firstLine}in`;
    }
    if (formatting.alignment) {
      baseStyle.textAlign = formatting.alignment;
    }
    
    switch (element.type) {
      case ELEMENT_TYPES.TITLE:
        return <h1 {...attributes} style={baseStyle}>{children}</h1>;
      case ELEMENT_TYPES.HEADING_1:
        return <h1 {...attributes} style={baseStyle}>{children}</h1>;
      case ELEMENT_TYPES.HEADING_2:
        return <h2 {...attributes} style={baseStyle}>{children}</h2>;
      case ELEMENT_TYPES.HEADING_3:
        return <h3 {...attributes} style={baseStyle}>{children}</h3>;
      default:
        return <p {...attributes} style={baseStyle}>{children}</p>;
    }
  }, []);

  // Custom rendering for text leaves with decorations
  const renderLeaf = useCallback((props) => {
    const { attributes, children, leaf } = props;
    
    let element = children;
    
    // Apply text formatting
    const leafStyle = {};
    if (leaf.fontFamily) {
      leafStyle.fontFamily = `"${leaf.fontFamily}", serif`;
    }
    if (leaf.fontSize) {
      leafStyle.fontSize = `${leaf.fontSize}px`;
    }
    if (leaf.color) {
      leafStyle.color = leaf.color.startsWith('#') ? leaf.color : `#${leaf.color}`;
    }
    
    // Apply decorations for highlighting
    if (leaf.type === 'highlight') {
      const decorationProps = decorationHighlighter.getDecorationProps(leaf);
      element = (
        <span
          {...decorationProps}
          style={{ ...leafStyle, ...decorationProps.style }}
          onClick={() => setActiveIssue(leaf.issueId)}
        >
          {element}
        </span>
      );
    } else {
      element = <span style={leafStyle}>{element}</span>;
    }
    
    // Apply text marks
    if (leaf.bold) {
      element = <strong>{element}</strong>;
    }
    if (leaf.italic) {
      element = <em>{element}</em>;
    }
    if (leaf.underline) {
      element = <u>{element}</u>;
    }
    
    return <span {...attributes}>{element}</span>;
  }, [setActiveIssue]);

  // Keyboard shortcut for Run Check
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

  // Ensure we have valid Slate value
  const safeValue = Array.isArray(value) && value.length > 0 ? value : [{
    type: 'paragraph',
    children: [{ text: '' }]
  }];

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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col items-center">
            <div className="loading-spinner mb-6"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Document</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Analyzing your document with enhanced XML processing...
            </p>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Document-level Formatting Issues Banner */}
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
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              <div className="mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-[500px]">
                  <div ref={editorRef}>
                    <Slate 
                      key={`slate-editor-${lastFixAppliedAt || 'initial'}`}
                      editor={editor} 
                      initialValue={safeValue}
                      onValueChange={handleEditorChange}
                    >
                      <Editable
                        decorate={decorate}
                        renderElement={renderElement}
                        renderLeaf={renderLeaf}
                        placeholder="Start writing your APA document..."
                        className="min-h-96 outline-none"
                      />
                    </Slate>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}