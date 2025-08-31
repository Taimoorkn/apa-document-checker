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
    analyzeDocument,
    showIssueHighlighting,
    toggleIssueHighlighting
  } = useDocumentStore();
  
  // Editor state
  const [editor] = useState(() => withHistory(withReact(createEditor())));
  const [value, setValue] = useState([{
    type: 'paragraph',
    children: [{ text: '' }]
  }]); // Default empty paragraph to prevent Slate errors
  
  // Refs for components
  const editorRef = useRef(null);
  
  const isLoading = processingState.isUploading || processingState.isAnalyzing;

  // Initialize editor content from document data - ONLY for server updates
  useEffect(() => {
    if (documentText && documentFormatting) {
      if (process.env.NODE_ENV === 'development') {
        console.log('=== DOCUMENT FORMATTING DEBUG ===');
        console.log('Raw document formatting from server:', documentFormatting);
        console.log('lastFixAppliedAt:', lastFixAppliedAt);
      }
      
      const newValue = convertTextToSlateNodes(documentText, documentFormatting);
      
      // Update in these cases:
      // 1. Initial load (value has only empty paragraph)
      // 2. A fix was recently applied (lastFixAppliedAt changed)
      const isInitialState = value.length === 1 && 
        value[0]?.type === 'paragraph' && 
        value[0]?.children?.length === 1 && 
        value[0]?.children[0]?.text === '';
      
      const shouldUpdate = isInitialState || lastFixAppliedAt;
      
      if (shouldUpdate) {
        console.log('🔄 Updating Slate editor with server data');
        console.log('Reasons:', {
          initialLoad: isInitialState,
          fixApplied: !!lastFixAppliedAt
        });
        
        // Force Slate to re-render by creating completely new value
        const freshValue = JSON.parse(JSON.stringify(newValue));
        setValue(freshValue);
      }
    }
  }, [documentText, documentFormatting, lastFixAppliedAt]);



  // Convert document with rich formatting data to Slate nodes
  const convertTextToSlateNodes = useCallback((text, formatting) => {
    console.log('🔄 convertTextToSlateNodes called with:', {
      hasText: !!text,
      hasFormatting: !!formatting,
      paragraphCount: formatting?.paragraphs?.length || 0
    });

    if (!formatting?.paragraphs?.length) {
      const fallback = [{ type: ELEMENT_TYPES.PARAGRAPH, children: [{ text: text || '' }] }];
      console.log('📄 Using fallback Slate nodes:', fallback);
      return fallback;
    }


    // Use ONLY the paragraph text from formatting data - ignore the raw text parameter
    const result = formatting.paragraphs.map((paraFormatting, index) => {
      
      // Determine paragraph type based on style and content
      const paraType = determineParagraphType(paraFormatting.text, paraFormatting);
      
      // Create children with rich formatting from runs
      let children = [];
      
      if (paraFormatting.runs && paraFormatting.runs.length > 0) {
        // Use run-level formatting for precise text formatting
        children = [];
        paraFormatting.runs.forEach((run, runIndex) => {
          
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
    
    // Safety check to ensure we never return undefined or empty array
    if (!Array.isArray(result) || result.length === 0) {
      console.warn('⚠️ convertTextToSlateNodes produced invalid result, using fallback');
      return [{ type: ELEMENT_TYPES.PARAGRAPH, children: [{ text: text || '' }] }];
    }
    
    console.log('✅ convertTextToSlateNodes produced', result.length, 'nodes');
    return result;
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

  // Remove all issue highlighting from Slate editor
  const removeIssueHighlighting = useCallback(() => {
    if (!editor) return;

    console.log('🧹 Removing all issue highlights from editor');
    
    try {
      // Use Editor.withoutNormalizing to batch all operations
      Editor.withoutNormalizing(editor, () => {
        // Get all nodes with APA_ISSUE marks
        const allNodes = Array.from(Editor.nodes(editor, {
          at: [],
          match: n => Text.isText(n) && n[MARKS.APA_ISSUE],
          mode: 'all'
        }));

        console.log(`🧹 Found ${allNodes.length} nodes with issue highlighting`);

        // Remove marks in reverse order to avoid path conflicts
        allNodes.reverse().forEach(([node, path]) => {
          try {
            // Check if path still exists before trying to unset
            if (Editor.hasPath(editor, path) && Text.isText(node) && node[MARKS.APA_ISSUE]) {
              Transforms.unsetNodes(editor, MARKS.APA_ISSUE, {
                at: path,
                match: n => Text.isText(n)
              });
            }
          } catch (error) {
            console.warn('Error removing highlight at path:', path, error);
          }
        });
      });

      console.log(`🧹 Successfully removed all issue highlighting`);
    } catch (error) {
      console.error('Error in removeIssueHighlighting:', error);
      // If all else fails, regenerate the editor content without highlights
      console.log('🔄 Regenerating editor content to clear highlights');
      if (documentText && documentFormatting) {
        const newValue = convertTextToSlateNodes(documentText, documentFormatting);
        setValue(newValue);
      }
    }
  }, [editor, convertTextToSlateNodes]); // Remove documentText, documentFormatting from deps

  // Apply or remove issue highlighting when state changes
  useEffect(() => {
    // Skip highlighting during loading
    if (isLoading) {
      console.log('🎨 Skipping issue highlighting - loading');
      return;
    }

    // Apply highlighting when toggled or after fixes are applied
    if (value.length > 0) {
      if (showIssueHighlighting) {
        console.log('🎨 Applying issue highlighting to Slate editor');
        setTimeout(() => applyIssueHighlighting(), 100); // Delayed to prevent render conflicts
      } else {
        console.log('🎨 Removing issue highlighting from Slate editor');
        setTimeout(() => removeIssueHighlighting(), 100);
      }
    }
  }, [showIssueHighlighting, lastFixAppliedAt, isLoading, applyIssueHighlighting, removeIssueHighlighting]);

  // Cleanup function (no timeouts to clean up now)
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

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

  // Extract current formatting from Slate editor
  const extractCurrentFormatting = useCallback((slateValue) => {
    // Create a fresh formatting object based on current Slate content
    const paragraphs = slateValue.map((node, index) => {
      const paragraphText = node.children?.map(child => child.text || '').join('') || '';
      
      // Extract formatting from Slate node
      const formatting = node.formatting || {};
      const firstChild = node.children?.[0] || {};
      
      return {
        text: paragraphText,
        index: index,
        font: {
          family: firstChild.fontFamily || formatting.font?.family || 'Times New Roman',
          size: firstChild.fontSize || formatting.font?.size || 12
        },
        spacing: formatting.spacing || { line: 2.0 },
        indentation: formatting.indentation || { firstLine: 0.5 },
        alignment: formatting.alignment || 'left',
        style: formatting.style || 'Normal',
        runs: node.children?.map(child => ({
          text: child.text || '',
          font: {
            family: child.fontFamily || 'Times New Roman',
            size: child.fontSize || 12,
            bold: child.bold || false,
            italic: child.italic || false,
            underline: child.underline || false
          },
          color: child.color || null
        })) || []
      };
    });

    return {
      document: {
        font: { family: 'Times New Roman', size: 12 },
        spacing: { line: 2.0 },
        margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
        indentation: { firstLine: 0.5 }
      },
      paragraphs: paragraphs,
      compliance: {
        overall: 85, // Base score, will be adjusted by analysis
        font: { family: true, size: true },
        spacing: { line: true },
        margins: { compliant: true }
      }
    };
  }, []);

  // Handle manual analysis trigger
  const handleManualAnalysis = useCallback(async () => {
    const { analyzeEditorContent } = useDocumentStore.getState();
    
    if (analyzeEditorContent && !isLoading && value.length > 0) {
      console.log('🔍 Running manual analysis on current editor content');
      
      try {
        // Extract current formatting from Slate editor
        const currentFormatting = extractCurrentFormatting(value);
        console.log('📊 Extracted current formatting:', {
          paragraphCount: currentFormatting.paragraphs.length,
          hasFormatting: true,
          source: 'current-editor'
        });

        // Analyze current editor state with its current formatting
        await analyzeEditorContent(value, currentFormatting);
        console.log('✅ Manual analysis completed');
      } catch (error) {
        console.error('❌ Manual analysis failed:', error);
      }
    }
  }, [value, isLoading, extractCurrentFormatting]);

  // Handle editor value changes (NO automatic analysis)
  const handleEditorChange = useCallback((newValue) => {
    setValue(newValue);
    // NO automatic analysis, NO isUserEditing flag changes
    // Keep it simple - just update the editor content
  }, []);

  // Keyboard shortcut for Run Check (Ctrl/Cmd + Shift + C)
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

  // Listen for text replacement events from store
  useEffect(() => {
    const handleTextReplacement = (event) => {
      const { originalText, replacementText, issueId } = event.detail;
      
      console.log(`🔧 DocumentEditor received text replacement request:`, {
        originalText,
        replacementText,
        issueId
      });
      
      // Apply the text replacement directly in the Slate editor
      applyTextReplacementToEditor(originalText, replacementText);
    };

    window.addEventListener('applyTextReplacement', handleTextReplacement);
    return () => window.removeEventListener('applyTextReplacement', handleTextReplacement);
  }, []);

  // Apply text replacement directly in Slate editor
  const applyTextReplacementToEditor = useCallback((originalText, replacementText) => {
    try {
      console.log(`🔍 Searching for text in editor: "${originalText}"`);
      
      // Search through all text nodes in the editor
      const textNodes = Array.from(Editor.nodes(editor, {
        at: [],
        match: n => Text.isText(n) && n.text.includes(originalText),
        mode: 'all'
      }));

      console.log(`🔍 Found ${textNodes.length} matching text nodes`);

      if (textNodes.length > 0) {
        Editor.withoutNormalizing(editor, () => {
          // Replace text in each matching node (process in reverse order to avoid path conflicts)
          textNodes.reverse().forEach(([node, path]) => {
            if (Text.isText(node) && node.text.includes(originalText)) {
              const nodeText = node.text;
              const startIndex = nodeText.indexOf(originalText);
              
              if (startIndex !== -1) {
                const endIndex = startIndex + originalText.length;
                
                // Create range for the specific text to replace
                const startPoint = { path, offset: startIndex };
                const endPoint = { path, offset: endIndex };
                const range = { anchor: startPoint, focus: endPoint };
                
                // Select the range and replace the text
                Transforms.select(editor, range);
                Transforms.insertText(editor, replacementText);
                
                console.log(`✅ Replaced "${originalText}" with "${replacementText}" at path:`, path);
                console.log(`📍 Range: ${startIndex}-${endIndex} in text: "${nodeText}"`);
              }
            }
          });
        });
        
        // Force re-render by updating value
        const currentValue = editor.children;
        setValue([...currentValue]);
        
      } else {
        console.warn(`⚠️ Could not find text "${originalText}" in editor`);
      }
      
    } catch (error) {
      console.error('Error applying text replacement to editor:', error);
    }
  }, [editor]);

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
    }
    if (formatting.font?.size) {
      // Force exact pixel size to match Word display
      baseStyle.fontSize = `${formatting.font.size}px`;
    }
    
    // Line spacing - use the exact value from the server
    if (formatting.spacing?.line) {
      // Use the line height value directly as the server should have converted it properly
      baseStyle.lineHeight = formatting.spacing.line;
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
    }
    if (leaf.color) {
      leafStyle.color = leaf.color.startsWith('#') ? leaf.color : `#${leaf.color}`;
    }
    
    let element = <span {...leafProps} style={leafStyle}>{children}</span>;

    if (leaf.bold) {
      element = <strong style={leafStyle}>{element}</strong>;
    }
    if (leaf.italic) {
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


  // Ensure we have valid Slate value
  const safeValue = Array.isArray(value) && value.length > 0 ? value : [{
    type: 'paragraph',
    children: [{ text: '' }]
  }];

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
                  onClick={handleManualAnalysis}
                  disabled={isLoading || processingState.isAnalyzing}
                  title="Run APA analysis on current document (Ctrl+Shift+C)"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLoading || processingState.isAnalyzing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md'
                  }`}
                >
                  {processingState.isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run Check
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => {
                    console.log('🔄 Toggle button clicked, current state:', showIssueHighlighting);
                    toggleIssueHighlighting();
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showIssueHighlighting 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showIssueHighlighting ? 'Hide Issues' : 'Show Issues'}
                </button>
                
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="text-xs text-gray-500">
                  {issues.length > 0 
                    ? `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} found`
                    : 'Click "Run Check" to analyze document'
                  }
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
                      key={`slate-editor-${lastFixAppliedAt || 'initial'}`}
                      editor={editor} 
                      initialValue={safeValue}
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