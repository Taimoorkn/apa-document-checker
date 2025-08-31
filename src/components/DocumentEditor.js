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
    if (documentText && documentFormatting && value.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('=== DOCUMENT FORMATTING DEBUG ===');
        console.log('Raw document formatting from server:', documentFormatting);
        
        // Debug first few paragraphs
        if (documentFormatting.paragraphs) {
          console.log('First 3 paragraphs formatting:');
          documentFormatting.paragraphs.slice(0, 3).forEach((para, i) => {
            console.log(`Paragraph ${i}:`, {
              text: para.text?.substring(0, 50) + '...',
              font: para.font,
              spacing: para.spacing,
              runs: para.runs?.map(run => ({
                text: run.text?.substring(0, 20),
                font: run.font
              }))
            });
          });
        }
      }
      
      const initialValue = convertTextToSlateNodes(documentText, documentFormatting);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Generated Slate nodes (first 2):', initialValue.slice(0, 2));
      }
      
      setValue(initialValue);
    }
  }, [documentText, documentFormatting]);

  // Apply issue highlighting when issues or active issue changes
  useEffect(() => {
    if (showIssues) {
      applyIssueHighlighting();
    }
  }, [issues, activeIssueId, showIssues]);


  // Convert document with rich formatting data to Slate nodes
  const convertTextToSlateNodes = useCallback((text, formatting) => {
    if (!formatting?.paragraphs?.length) {
      return [{ type: ELEMENT_TYPES.PARAGRAPH, children: [{ text: text || '' }] }];
    }

    console.log('Converting to Slate nodes with formatting data:', formatting.paragraphs.length, 'paragraphs');
    console.log('Raw text from server:', JSON.stringify(text.substring(0, 200)));
    console.log('First 5 paragraph texts from formatting:');
    formatting.paragraphs.slice(0, 5).forEach((para, i) => {
      console.log(`  ${i}: "${para.text?.substring(0, 80)}..."`);
    });

    // Use ONLY the paragraph text from formatting data - ignore the raw text parameter
    return formatting.paragraphs.map((paraFormatting, index) => {
      console.log(`Paragraph ${index}: "${paraFormatting.text?.substring(0, 50)}...", style: ${paraFormatting.style}`, {
        hasRuns: !!paraFormatting.runs?.length,
        runsCount: paraFormatting.runs?.length || 0,
        spacing: paraFormatting.spacing
      });
      
      // Determine paragraph type based on style and content
      const paraType = determineParagraphType(paraFormatting.text, paraFormatting);
      
      // Create children with rich formatting from runs
      let children = [];
      
      if (paraFormatting.runs && paraFormatting.runs.length > 0) {
        // Use run-level formatting for precise text formatting
        children = [];
        paraFormatting.runs.forEach((run, runIndex) => {
          console.log(`  Run ${runIndex}: text="${run.text}", font size=${run.font?.size}pt, family="${run.font?.family}"`);
          console.log(`    🔍 Font formatting in run:`, {
            bold: run.font?.bold,
            italic: run.font?.italic,
            underline: run.font?.underline,
            fullFontObject: run.font
          });
          
          const runText = run.text || '';
          
          // Handle line breaks within runs by splitting into multiple text nodes
          if (runText.includes('\n')) {
            const parts = runText.split('\n');
            parts.forEach((part, partIndex) => {
              if (partIndex > 0) {
                // Add line break between parts
                children.push({ text: '\n' });
              }
              if (part) {
                const leafNode = {
                  text: part,
                  bold: run.font?.bold === true,
                  italic: run.font?.italic === true,
                  underline: run.font?.underline === true,
                  fontFamily: run.font?.family || null,
                  fontSize: run.font?.size || null,
                  color: run.color || null
                };
                console.log(`    📝 Creating leaf node:`, leafNode);
                if (part.toLowerCase().includes('running') || part.toLowerCase().includes('department')) {
                  console.log(`🎯 SPECIAL DEBUG for "${part}":`, {
                    originalBold: run.font?.bold,
                    originalItalic: run.font?.italic,
                    leafBold: leafNode.bold,
                    leafItalic: leafNode.italic,
                    fullRunFont: run.font
                  });
                }
                children.push(leafNode);
              }
            });
          } else {
            const leafNode = {
              text: runText,
              bold: run.font?.bold === true,
              italic: run.font?.italic === true,
              underline: run.font?.underline === true,
              fontFamily: run.font?.family || null,
              fontSize: run.font?.size || null,
              color: run.color || null
            };
            console.log(`    📝 Creating leaf node:`, leafNode);
            if (runText.toLowerCase().includes('running') || runText.toLowerCase().includes('department')) {
              console.log(`🎯 SPECIAL DEBUG for "${runText}":`, {
                originalBold: run.font?.bold,
                originalItalic: run.font?.italic,
                leafBold: leafNode.bold,
                leafItalic: leafNode.italic,
                fullRunFont: run.font
              });
            }
            children.push(leafNode);
          }
        });
      } else {
        // Fallback to paragraph text if no runs
        const paraText = paraFormatting.text || '';
        if (paraText.includes('\n')) {
          // Handle line breaks in paragraph text
          const parts = paraText.split('\n');
          children = [];
          parts.forEach((part, partIndex) => {
            if (partIndex > 0) {
              children.push({ text: '\n' });
            }
            if (part) {
              children.push({ 
                text: part,
                fontFamily: paraFormatting.font?.family || null,
                fontSize: paraFormatting.font?.size || null
              });
            }
          });
        } else {
          children = [{ 
            text: paraText,
            fontFamily: paraFormatting.font?.family || null,
            fontSize: paraFormatting.font?.size || null
          }];
        }
      }
      
      // Ensure we have at least one child
      if (children.length === 0) {
        children = [{ text: '' }];
      }
      
      return {
        type: paraType,
        children: children,
        paraIndex: index,
        // Preserve complete formatting data including spacing, indentation, alignment
        formatting: {
          font: paraFormatting.font,
          spacing: paraFormatting.spacing,
          indentation: paraFormatting.indentation,
          alignment: paraFormatting.alignment,
          style: paraFormatting.style
        }
      };
    });
  }, []);

  // Determine paragraph type based on content and formatting
  const determineParagraphType = useCallback((text, formatting) => {
    // Check for headings based on Word styles first (most reliable)
    if (formatting?.style) {
      const style = formatting.style.toLowerCase();
      if (style.includes('title')) return ELEMENT_TYPES.TITLE;
      if (style.includes('heading1') || style === 'heading 1') return ELEMENT_TYPES.HEADING_1;
      if (style.includes('heading2') || style === 'heading 2') return ELEMENT_TYPES.HEADING_2;
      if (style.includes('heading3') || style === 'heading 3') return ELEMENT_TYPES.HEADING_3;
      if (style.includes('heading4') || style === 'heading 4') return ELEMENT_TYPES.HEADING_4;
      if (style.includes('heading5') || style === 'heading 5') return ELEMENT_TYPES.HEADING_5;
      if (style.includes('heading6') || style === 'heading 6') return ELEMENT_TYPES.HEADING_5; // Map H6 to H5
    }
    
    // All other content is treated as regular paragraphs
    return ELEMENT_TYPES.PARAGRAPH;
  }, []);

  // Apply issue highlighting to Slate editor
  const applyIssueHighlighting = useCallback(() => {
    if (!issues.length || !editor) return;

    // Remove existing highlights
    Editor.removeMark(editor, MARKS.APA_ISSUE);

    issues.forEach(issue => {
      if (!issue.text) return;

      // Find text in editor and apply highlighting
      try {
        const [match] = Editor.nodes(editor, {
          at: [],
          match: n => Text.isText(n) && n.text && n.text.includes(issue.text)
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

            Transforms.select(editor, range);
            Editor.addMark(editor, MARKS.APA_ISSUE, {
              issueId: issue.id,
              severity: issue.severity,
              active: issue.id === activeIssueId
            });
          }
        }
      } catch (error) {
        console.warn('Error highlighting issue in editor:', error);
      }
    });

    // Deselect after highlighting
    Transforms.deselect(editor);
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
    
    // Extract formatting from element when available
    const formatting = element.formatting || {};
    
    // Build comprehensive style object from extracted formatting
    const baseStyle = {};
    
    // Font properties (paragraph-level defaults)
    if (formatting.font?.family) {
      baseStyle.fontFamily = `"${formatting.font.family}", serif`;
      console.log(`Paragraph font family: ${formatting.font.family}`);
    }
    if (formatting.font?.size) {
      // Force exact pixel size to match Word display
      baseStyle.fontSize = `${formatting.font.size}px`;
      console.log(`Forcing paragraph size: ${formatting.font.size}px (matching Word ${formatting.font.size}pt)`);
    }
    
    // Line spacing - use the exact value from the server
    if (formatting.spacing?.line) {
      // Use the line height value directly as the server should have converted it properly
      baseStyle.lineHeight = formatting.spacing.line;
      console.log(`Line height: ${formatting.spacing.line} (direct from server)`);
    }
    
    // Paragraph spacing (before/after)
    if (formatting.spacing?.before) {
      baseStyle.marginTop = `${formatting.spacing.before}pt`;
    }
    if (formatting.spacing?.after) {
      baseStyle.marginBottom = `${formatting.spacing.after}pt`;
    }
    
    // Text indentation
    if (formatting.indentation?.firstLine) {
      baseStyle.textIndent = `${formatting.indentation.firstLine}in`;
    }
    if (formatting.indentation?.left) {
      baseStyle.paddingLeft = `${formatting.indentation.left}in`;
    }
    if (formatting.indentation?.right) {
      baseStyle.paddingRight = `${formatting.indentation.right}in`;
    }
    if (formatting.indentation?.hanging) {
      baseStyle.textIndent = `-${formatting.indentation.hanging}in`;
      baseStyle.paddingLeft = `${formatting.indentation.hanging}in`;
    }
    
    // Text alignment
    if (formatting.alignment) {
      const alignmentMap = {
        'left': 'left',
        'center': 'center', 
        'right': 'right',
        'both': 'justify',
        'justify': 'justify'
      };
      baseStyle.textAlign = alignmentMap[formatting.alignment] || formatting.alignment;
    }
    
    // Debug: Add data attributes to paragraphs for inspection
    const debugAttrs = {};
    if (formatting.font?.size) {
      debugAttrs['data-debug-para-font-size'] = formatting.font.size;
    }
    if (formatting.font?.family) {
      debugAttrs['data-debug-para-font-family'] = formatting.font.family;
    }
    
    switch (element.type) {
      case ELEMENT_TYPES.TITLE:
        return (
          <h1 
            {...attributes} 
            {...debugAttrs}
            style={baseStyle}
          >
            {children}
          </h1>
        );
      case ELEMENT_TYPES.HEADING_1:
        return (
          <h1 
            {...attributes} 
            {...debugAttrs}
            style={baseStyle}
          >
            {children}
          </h1>
        );
      case ELEMENT_TYPES.HEADING_2:
        return (
          <h2 
            {...attributes} 
            {...debugAttrs}
            style={baseStyle}
          >
            {children}
          </h2>
        );
      case ELEMENT_TYPES.HEADING_3:
        return (
          <h3 
            {...attributes} 
            {...debugAttrs}
            style={baseStyle}
          >
            {children}
          </h3>
        );
      default:
        return (
          <p 
            {...attributes} 
            {...debugAttrs}
            style={baseStyle}
          >
            {children}
          </p>
        );
    }
  }, []);

  // Custom rendering for text marks with rich formatting support
  const renderLeaf = useCallback((props) => {
    const { attributes, children, leaf } = props;
    
    // Build inline styles for font properties
    const leafStyle = {};
    const leafProps = { ...attributes };
    
    // Use a combination of inline styles and CSS class for better specificity
    if (leaf.fontFamily) {
      leafStyle.fontFamily = `"${leaf.fontFamily}", serif`;
    }
    if (leaf.fontSize) {
      // Force exact pixel size to match Word display (28pt should display as 28px equivalent)
      leafStyle.fontSize = `${leaf.fontSize}px`;
      leafProps.className = `${leafProps.className || ''} docx-original-formatting`.trim();
      console.log(`Forcing exact display size: ${leaf.fontSize}px (matching Word ${leaf.fontSize}pt) for text: "${leaf.text?.substring(0, 20)}..."`);
    }
    if (leaf.color) {
      leafStyle.color = leaf.color.startsWith('#') ? leaf.color : `#${leaf.color}`;
    }
    
    // Debug: Log the complete style being applied and add data attributes for debugging
    if (Object.keys(leafStyle).length > 0) {
      console.log('Leaf style being applied:', leafStyle, 'to text:', leaf.text?.substring(0, 30));
      // Add debug attributes to inspect in browser
      leafProps['data-debug-font-size'] = leaf.fontSize || 'none';
      leafProps['data-debug-font-family'] = leaf.fontFamily || 'none';
    }
    
    // Debug bold/italic formatting
    if (leaf.bold || leaf.italic || leaf.underline) {
      console.log(`🔍 Text formatting DEBUG for "${leaf.text?.substring(0, 20)}...":`, {
        bold: leaf.bold,
        italic: leaf.italic,
        underline: leaf.underline,
        leafKeys: Object.keys(leaf)
      });
    }
    
    // Special debugging for specific words
    if (leaf.text && (leaf.text.toLowerCase().includes('running') || leaf.text.toLowerCase().includes('department'))) {
      console.log(`🎯 RENDER LEAF DEBUG for "${leaf.text}":`, {
        bold: leaf.bold,
        italic: leaf.italic,
        boldType: typeof leaf.bold,
        italicType: typeof leaf.italic,
        willApplyBold: !!leaf.bold,
        willApplyItalic: !!leaf.italic
      });
    }
    
    let element = <span {...leafProps} style={leafStyle}>{children}</span>;

    if (leaf.bold) {
      console.log(`✅ Applying BOLD to: "${leaf.text?.substring(0, 20)}..."`);
      element = <strong style={leafStyle}>{element}</strong>;
    }
    if (leaf.italic) {
      console.log(`✅ Applying ITALIC to: "${leaf.text?.substring(0, 20)}..."`);
      element = <em style={leafStyle}>{element}</em>;
    }
    if (leaf.underline) {
      element = <u style={leafStyle}>{element}</u>;
    }
    if (leaf[MARKS.APA_ISSUE]) {
      const issueData = leaf[MARKS.APA_ISSUE];
      element = (
        <mark
          className={`${getIssueClass(issueData.severity)} ${issueData.active ? 'active-issue' : ''}`}
          data-issue-id={issueData.issueId}
          onClick={() => setActiveIssue(issueData.issueId)}
          title="APA issue detected - click for details"
          style={leafStyle}
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
                {/* Document Editor */}
                <div 
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-[500px]"
                >
                  <div
                    ref={editorRef}
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
                        data-slate-editor="true"
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