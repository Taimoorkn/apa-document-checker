'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createEditor, Editor, Transforms, Text, Element as SlateElement, Range } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { FileText, InfoIcon } from 'lucide-react';

// Custom Slate.js element types for APA document structure
const ELEMENT_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading-1',
  HEADING_2: 'heading-2',
  HEADING_3: 'heading-3',
  HEADING_4: 'heading-4',
  HEADING_5: 'heading-5',
  TITLE: 'title',
  ABSTRACT: 'abstract',
  REFERENCES: 'references',
  CITATION: 'citation'
};

// Custom Slate.js marks for text formatting
const MARKS = {
  BOLD: 'bold',
  ITALIC: 'italic',
  UNDERLINE: 'underline',
  APA_ISSUE: 'apa-issue'
};

export default function DocumentEditor() {
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
    analyzeDocument
  } = useDocumentStore();
  
  // Editor state
  const [editor] = useState(() => withHistory(withReact(createEditor())));
  const [value, setValue] = useState([]);
  const [showIssues, setShowIssues] = useState(true);
  
  // Refs for components
  const editorRef = useRef(null);
  
  const isLoading = processingState.isUploading || processingState.isAnalyzing;

  // Initialize editor content from document data
  useEffect(() => {
    if (documentText && value.length === 0) {
      const initialValue = convertTextToSlateNodes(documentText, documentFormatting);
      setValue(initialValue);
    }
  }, [documentText, documentFormatting]);

  // Apply issue highlighting when issues or active issue changes
  useEffect(() => {
    if (showIssues) {
      applyIssueHighlighting();
    }
  }, [issues, activeIssueId, showIssues]);

  // Convert plain text and formatting data to Slate nodes
  const convertTextToSlateNodes = useCallback((text, formatting) => {
    if (!text) return [{ type: ELEMENT_TYPES.PARAGRAPH, children: [{ text: '' }] }];

    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, index) => {
      // Determine paragraph type based on content and formatting
      const paraType = determineParagraphType(paragraph, formatting?.paragraphs?.[index]);
      
      // Create children with potential formatting
      const children = [{ text: paragraph }];
      
      return {
        type: paraType,
        children: children,
        paraIndex: index,
        // Preserve original formatting data
        formatting: formatting?.paragraphs?.[index] || {}
      };
    });
  }, []);

  // Determine paragraph type based on content and formatting
  const determineParagraphType = useCallback((text, formatting) => {
    const trimmedText = text.trim().toLowerCase();
    
    // Check for special sections
    if (trimmedText === 'abstract') return ELEMENT_TYPES.ABSTRACT;
    if (trimmedText === 'references') return ELEMENT_TYPES.REFERENCES;
    
    // Check for headings based on formatting or style
    if (formatting?.style) {
      const style = formatting.style.toLowerCase();
      if (style.includes('title')) return ELEMENT_TYPES.TITLE;
      if (style.includes('heading1')) return ELEMENT_TYPES.HEADING_1;
      if (style.includes('heading2')) return ELEMENT_TYPES.HEADING_2;
      if (style.includes('heading3')) return ELEMENT_TYPES.HEADING_3;
      if (style.includes('heading4')) return ELEMENT_TYPES.HEADING_4;
      if (style.includes('heading5')) return ELEMENT_TYPES.HEADING_5;
    }
    
    // Check for citations
    if (/\([^)]+,\s*\d{4}\)/.test(text)) {
      return ELEMENT_TYPES.PARAGRAPH; // Keep as paragraph but mark citations
    }
    
    return ELEMENT_TYPES.PARAGRAPH;
  }, []);


  // Apply issue highlighting to Slate editor
  const applyIssueHighlighting = useCallback(() => {
    if (!issues.length) return;

    // Remove existing highlights
    Editor.removeMark(editor, MARKS.APA_ISSUE);

    issues.forEach(issue => {
      if (!issue.text) return;

      // Find text in editor and apply highlighting
      const [match] = Editor.nodes(editor, {
        at: [],
        match: n => Text.isText(n) && n.text.includes(issue.text)
      });

      if (match) {
        const [node, path] = match;
        const text = node.text;
        const index = text.indexOf(issue.text);

        if (index !== -1) {
          const range = {
            anchor: { path, offset: index },
            focus: { path, offset: index + issue.text.length }
          };

          Editor.addMark(editor, MARKS.APA_ISSUE, {
            issueId: issue.id,
            severity: issue.severity,
            active: issue.id === activeIssueId
          });
        }
      }
    });
  }, [editor, issues, activeIssueId]);

  // Get CSS class for issue highlighting
  const getIssueClass = useCallback((severity) => {
    const baseClass = 'cursor-pointer border-b-2 transition-all duration-200';
    switch (severity) {
      case 'Critical':
        return `${baseClass} bg-red-200 border-red-500 hover:bg-red-300`;
      case 'Major':
        return `${baseClass} bg-orange-200 border-orange-500 hover:bg-orange-300`;
      case 'Minor':
        return `${baseClass} bg-blue-200 border-blue-500 hover:bg-blue-300`;
      default:
        return baseClass;
    }
  }, []);

  // Handle editor value changes
  const handleEditorChange = useCallback((newValue) => {
    setValue(newValue);
    
    // Trigger analysis with debounce using editor content analyzer
    const { analyzeEditorContent } = useDocumentStore.getState();
    
    if (analyzeEditorContent && !isLoading) {
      // Clear existing timeout
      if (window.editorAnalysisTimeout) {
        clearTimeout(window.editorAnalysisTimeout);
      }
      
      // Set new timeout for analysis
      window.editorAnalysisTimeout = setTimeout(() => {
        console.log('🔄 Analyzing editor content changes...');
        analyzeEditorContent(newValue);
      }, 1500); // Increased debounce time for better performance
    }
  }, [isLoading]);

  // Custom rendering for different element types
  const renderElement = useCallback((props) => {
    const { attributes, children, element } = props;
    
    switch (element.type) {
      case ELEMENT_TYPES.TITLE:
        return (
          <h1 
            {...attributes} 
            className="text-2xl font-bold text-center mb-6"
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            {children}
          </h1>
        );
      case ELEMENT_TYPES.HEADING_1:
        return (
          <h1 
            {...attributes} 
            className="text-xl font-bold text-center mb-4"
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            {children}
          </h1>
        );
      case ELEMENT_TYPES.HEADING_2:
        return (
          <h2 
            {...attributes} 
            className="text-lg font-bold text-center mb-3"
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            {children}
          </h2>
        );
      case ELEMENT_TYPES.HEADING_3:
        return (
          <h3 
            {...attributes} 
            className="text-base font-bold mb-3"
            style={{ fontFamily: '"Times New Roman", serif' }}
          >
            {children}
          </h3>
        );
      case ELEMENT_TYPES.ABSTRACT:
        return (
          <div {...attributes} className="mb-6">
            <h2 className="text-lg font-bold text-center mb-2">Abstract</h2>
            <p className="apa-paragraph">{children}</p>
          </div>
        );
      case ELEMENT_TYPES.REFERENCES:
        return (
          <div {...attributes} className="mb-6">
            <h2 className="text-lg font-bold text-center mb-4">References</h2>
            <p className="apa-paragraph">{children}</p>
          </div>
        );
      default:
        return (
          <p 
            {...attributes} 
            className="apa-paragraph mb-4"
            style={{
              fontFamily: '"Times New Roman", serif',
              fontSize: '12pt',
              lineHeight: '2',
              textIndent: element.type === ELEMENT_TYPES.PARAGRAPH ? '0.5in' : '0'
            }}
          >
            {children}
          </p>
        );
    }
  }, []);

  // Custom rendering for text marks
  const renderLeaf = useCallback((props) => {
    const { attributes, children, leaf } = props;
    let element = <span {...attributes}>{children}</span>;

    if (leaf.bold) {
      element = <strong>{element}</strong>;
    }
    if (leaf.italic) {
      element = <em>{element}</em>;
    }
    if (leaf.underline) {
      element = <u>{element}</u>;
    }
    if (leaf[MARKS.APA_ISSUE]) {
      const issueData = leaf[MARKS.APA_ISSUE];
      element = (
        <mark
          className={`${getIssueClass(issueData.severity)} ${issueData.active ? 'active-issue' : ''}`}
          data-issue-id={issueData.issueId}
          onClick={() => setActiveIssue(issueData.issueId)}
          title="APA issue detected - click for details"
        >
          {element}
        </mark>
      );
    }

    return element;
  }, [getIssueClass, setActiveIssue]);


  if (!documentText) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <FileText className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Edit Your Document</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Upload your academic paper to start editing with real-time APA validation
          </p>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <InfoIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 mb-1">Enhanced Editor Features</p>
                <p className="text-sm text-gray-600">
                  • Real-time editing with APA validation<br/>
                  • Accurate DOCX preview rendering<br/>
                  • Issue highlighting and fixes
                </p>
              </div>
            </div>
          </div>
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
          {/* Document Controls - Fixed Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
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
                  onClick={() => setShowIssues(!showIssues)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showIssues 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showIssues ? 'Hide Issues' : 'Show Issues'}
                </button>
                
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="text-xs text-gray-500">
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
                </div>
              </div>
            </div>
          </div>

          {/* Document Content - Scrollable Area */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                {/* Slate.js Document Editor */}
                <div 
                  ref={editorRef}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
                  style={{
                    fontFamily: '"Times New Roman", serif',
                    fontSize: '12pt',
                    lineHeight: '2'
                  }}
                >
                  <Slate 
                    editor={editor} 
                    initialValue={value} 
                    onValueChange={handleEditorChange}
                  >
                    <Editable
                      renderElement={renderElement}
                      renderLeaf={renderLeaf}
                      placeholder="Start writing your APA document..."
                      className="min-h-96 outline-none"
                      style={{
                        fontFamily: '"Times New Roman", serif',
                        fontSize: '12pt',
                        lineHeight: '2'
                      }}
                      data-slate-editor="true"
                    />
                  </Slate>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}