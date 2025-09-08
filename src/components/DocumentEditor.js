'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createEditor, Editor, Transforms, Text, Node, Path, Range, Point } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { positionMapper } from '@/utils/documentPositionMapper';
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

  // Apply issue highlighting using position mapping
  const applyIssueHighlighting = useCallback(() => {
    if (!issues.length || !editor || !value) return;
    
    console.log('🎨 Applying issue highlighting with position mapping');
    
    // Build position mapping first
    positionMapper.buildMapping(documentFormatting?.paragraphs || [], value);
    
    // Remove existing highlights first
    Editor.removeMark(editor, MARKS.APA_ISSUE);
    
    // Process each issue with position-based highlighting
    Editor.withoutNormalizing(editor, () => {
      issues.forEach(issue => {
        try {
          // Skip document-level formatting issues that don't map to text
          if (issue.location?.type === 'document' && !issue.highlightText) {
            console.log(`⏭️ Skipping document-level issue: ${issue.title}`);
            return;
          }
          
          // Try to map issue to Slate position
          const position = positionMapper.mapIssueToSlatePosition(issue);
          
          if (position) {
            console.log(`📍 Highlighting issue "${issue.title}" at position:`, position);
            
            // Handle different position types
            if (position.wholeParagraph) {
              // Highlight entire paragraph for structural issues
              const [node] = Editor.node(editor, position.path);
              if (node && node.children) {
                node.children.forEach((child, index) => {
                  if (Text.isText(child) && child.text) {
                    const childPath = [...position.path, index];
                    const range = {
                      anchor: { path: childPath, offset: 0 },
                      focus: { path: childPath, offset: child.text.length }
                    };
                    
                    Transforms.select(editor, range);
                    Editor.addMark(editor, MARKS.APA_ISSUE, {
                      issueId: issue.id,
                      severity: issue.severity,
                      active: issue.id === activeIssueId
                    });
                  }
                });
              }
            } else if (position.isDocumentLevel) {
              // Highlight first 50 chars for document-level issues
              const [node] = Editor.node(editor, position.path);
              if (node && node.children && node.children[0]) {
                const firstChild = node.children[0];
                if (Text.isText(firstChild) && firstChild.text) {
                  const childPath = [...position.path, 0];
                  const range = {
                    anchor: { path: childPath, offset: 0 },
                    focus: { path: childPath, offset: Math.min(position.length, firstChild.text.length) }
                  };
                  
                  Transforms.select(editor, range);
                  Editor.addMark(editor, MARKS.APA_ISSUE, {
                    issueId: issue.id,
                    severity: issue.severity,
                    active: issue.id === activeIssueId,
                    isDocumentLevel: true
                  });
                }
              }
            } else {
              // Precise text highlighting
              const [node] = Editor.node(editor, position.path);
              
              // For paragraph-level paths, find the text node
              if (node && !Text.isText(node) && node.children) {
                // Search within paragraph children for the text
                let currentOffset = 0;
                const searchText = issue.highlightText || issue.text;
                
                for (let i = 0; i < node.children.length; i++) {
                  const child = node.children[i];
                  if (Text.isText(child) && child.text) {
                    const childLength = child.text.length;
                    
                    // Check if the target text starts in this child
                    if (position.offset >= currentOffset && position.offset < currentOffset + childLength) {
                      const childPath = [...position.path, i];
                      const startOffset = position.offset - currentOffset;
                      const endOffset = Math.min(startOffset + position.length, childLength);
                      
                      const range = {
                        anchor: { path: childPath, offset: startOffset },
                        focus: { path: childPath, offset: endOffset }
                      };
                      
                      Transforms.select(editor, range);
                      Editor.addMark(editor, MARKS.APA_ISSUE, {
                        issueId: issue.id,
                        severity: issue.severity,
                        active: issue.id === activeIssueId
                      });
                      break;
                    }
                    
                    currentOffset += childLength;
                  }
                }
              } else if (Text.isText(node)) {
                // Direct text node highlighting
                const range = {
                  anchor: { path: position.path, offset: position.offset },
                  focus: { path: position.path, offset: position.offset + position.length }
                };
                
                Transforms.select(editor, range);
                Editor.addMark(editor, MARKS.APA_ISSUE, {
                  issueId: issue.id,
                  severity: issue.severity,
                  active: issue.id === activeIssueId
                });
              }
            }
          } else {
            // Fallback to text search if position mapping fails
            const searchText = issue.highlightText || issue.text;
            if (searchText && searchText.length > 3) {
              console.log(`⚠️ Position mapping failed for "${issue.title}", using text search`);
              
              const textNodes = Array.from(Editor.nodes(editor, {
                at: [],
                match: n => Text.isText(n) && n.text && n.text.includes(searchText)
              }));
              
              if (textNodes.length > 0) {
                const [node, path] = textNodes[0];
                const index = node.text.indexOf(searchText);
                if (index !== -1) {
                  const range = {
                    anchor: { path, offset: index },
                    focus: { path, offset: index + searchText.length }
                  };
                  
                  Transforms.select(editor, range);
                  Editor.addMark(editor, MARKS.APA_ISSUE, {
                    issueId: issue.id,
                    severity: issue.severity,
                    active: issue.id === activeIssueId
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to highlight issue "${issue.title}":`, error);
        }
      });
    });

    // Deselect after highlighting
    Transforms.deselect(editor);
    console.log('✅ Issue highlighting completed');
  }, [editor, issues, activeIssueId, value, documentFormatting]);

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
    console.log('📊 Extracting current formatting from Slate editor...');
    
    // Analyze the actual formatting in the editor to detect issues
    let detectedFontFamily = null;
    let detectedFontSize = null;
    let detectedSpacing = null;
    let fontFamilyConsistent = true;
    let fontSizeConsistent = true;
    
    // Create a fresh formatting object based on current Slate content
    const paragraphs = slateValue.map((node, index) => {
      const paragraphText = node.children?.map(child => child.text || '').join('') || '';
      
      // Extract formatting from Slate node - DON'T use defaults, use actual values
      const formatting = node.formatting || {};
      const firstChild = node.children?.[0] || {};
      
      // Extract actual font properties from the node
      const actualFontFamily = firstChild.fontFamily || formatting.font?.family || null;
      const actualFontSize = firstChild.fontSize || formatting.font?.size || null;
      
      // Track detected fonts across document
      if (actualFontFamily) {
        if (!detectedFontFamily) {
          detectedFontFamily = actualFontFamily;
        } else if (detectedFontFamily !== actualFontFamily) {
          fontFamilyConsistent = false;
        }
      }
      
      if (actualFontSize) {
        if (!detectedFontSize) {
          detectedFontSize = actualFontSize;
        } else if (detectedFontSize !== actualFontSize) {
          fontSizeConsistent = false;
        }
      }
      
      return {
        text: paragraphText,
        index: index,
        font: {
          family: actualFontFamily, // Use actual font, not default
          size: actualFontSize      // Use actual size, not default
        },
        spacing: formatting.spacing || { line: detectedSpacing || 1.0 }, // Don't assume double spacing
        indentation: formatting.indentation || { firstLine: 0 }, // Don't assume correct indentation
        alignment: formatting.alignment || 'left',
        style: formatting.style || 'Normal',
        runs: node.children?.map(child => ({
          text: child.text || '',
          font: {
            family: child.fontFamily || actualFontFamily, // Use detected font
            size: child.fontSize || actualFontSize,       // Use detected size
            bold: child.bold || false,
            italic: child.italic || false,
            underline: child.underline || false
          },
          color: child.color || null
        })) || []
      };
    });

    console.log('📊 Detected formatting:', {
      fontFamily: detectedFontFamily,
      fontSize: detectedFontSize,
      fontFamilyConsistent,
      fontSizeConsistent
    });

    // Create document-level formatting based on detected values (not assumptions)
    const documentFormatting = {
      document: {
        font: { 
          family: detectedFontFamily,  // Use detected, not assumed
          size: detectedFontSize       // Use detected, not assumed
        },
        spacing: { line: detectedSpacing || 1.0 }, // Don't assume double spacing
        margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 }, // These we can assume
        indentation: { firstLine: 0.0 } // Don't assume correct indentation
      },
      paragraphs: paragraphs,
      compliance: {
        overall: 50, // Lower base score to allow issues to be detected
        font: { 
          family: detectedFontFamily === 'Times New Roman',
          size: detectedFontSize === 12
        },
        spacing: { line: detectedSpacing === 2.0 },
        margins: { compliant: true } // Assume margins are correct for now
      }
    };

    console.log('📊 Generated formatting object for analysis:', {
      documentFont: documentFormatting.document.font,
      compliance: documentFormatting.compliance,
      paragraphCount: paragraphs.length
    });

    return documentFormatting;
  }, []);

  // Handle manual analysis trigger
  const handleManualAnalysis = useCallback(async () => {
    const { analyzeEditorContent, documentFormatting } = useDocumentStore.getState();
    
    if (analyzeEditorContent && !isLoading && value.length > 0) {
      console.log('🔍 Running manual analysis on current editor content');
      
      try {
        // Try to extract current formatting from Slate editor
        const extractedFormatting = extractCurrentFormatting(value);
        
        // Merge extracted formatting with original document formatting
        // This preserves original formatting (like spacing) while allowing font changes to be detected
        let currentFormatting = documentFormatting;
        
        if (extractedFormatting.document.font.family || extractedFormatting.document.font.size) {
          // User has made font changes, use hybrid approach
          currentFormatting = {
            ...documentFormatting,
            document: {
              ...documentFormatting.document,
              font: {
                family: extractedFormatting.document.font.family || documentFormatting.document?.font?.family,
                size: extractedFormatting.document.font.size || documentFormatting.document?.font?.size
              }
            },
            paragraphs: extractedFormatting.paragraphs.map((extractedPara, index) => {
              const originalPara = documentFormatting.paragraphs?.[index] || {};
              return {
                ...originalPara,
                text: extractedPara.text, // Use current text
                font: {
                  family: extractedPara.font.family || originalPara.font?.family,
                  size: extractedPara.font.size || originalPara.font?.size
                },
                // Preserve original spacing, margins, etc.
                spacing: originalPara.spacing || { line: 2.0 },
                indentation: originalPara.indentation || { firstLine: 0.5 },
                alignment: originalPara.alignment || 'left'
              };
            })
          };
        }
        
        console.log('📊 Using formatting for analysis:', {
          paragraphCount: currentFormatting.paragraphs?.length || 0,
          hasFormatting: !!currentFormatting,
          source: 'hybrid-current-original',
          fontFamily: currentFormatting.document?.font?.family,
          fontSize: currentFormatting.document?.font?.size,
          spacing: currentFormatting.document?.spacing?.line
        });

        // Analyze current editor state with the hybrid formatting
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

  // Listen for active issue change events
  useEffect(() => {
    const handleActiveIssueChange = (event) => {
      const { previousId, currentId } = event.detail;
      console.log(`🎯 Active issue changed: ${previousId} → ${currentId}`);
      
      // Re-apply highlighting when active issue changes
      if (showIssueHighlighting) {
        setTimeout(() => applyIssueHighlighting(), 50);
      }
    };

    window.addEventListener('activeIssueChanged', handleActiveIssueChange);
    return () => window.removeEventListener('activeIssueChanged', handleActiveIssueChange);
  }, [showIssueHighlighting, applyIssueHighlighting]);

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
                
                // Clear any issue highlighting marks from the replaced text
                const newEndPoint = { path, offset: startIndex + replacementText.length };
                const newRange = { anchor: startPoint, focus: newEndPoint };
                
                // Remove issue highlighting marks from the new text
                Transforms.unsetNodes(editor, [MARKS.APA_ISSUE], {
                  at: newRange,
                  match: n => Text.isText(n)
                });
                
                console.log(`✅ Replaced "${originalText}" with "${replacementText}" at path:`, path);
                console.log(`📍 Range: ${startIndex}-${endIndex} in text: "${nodeText}"`);
                console.log(`🧹 Cleared highlighting from new text range`);
              }
            }
          });
        });
        
        // Force re-render by updating value
        const currentValue = editor.children;
        setValue([...currentValue]);
        
        // Also trigger a full highlighting refresh after a short delay
        // This ensures any stale highlighting is cleaned up
        setTimeout(() => {
          console.log('🧹 Refreshing issue highlighting after fix');
          removeIssueHighlighting();
          setTimeout(() => {
            if (showIssueHighlighting) {
              applyIssueHighlighting();
            }
          }, 100);
        }, 50);
        
      } else {
        console.warn(`⚠️ Could not find text "${originalText}" in editor`);
      }
      
    } catch (error) {
      console.error('Error applying text replacement to editor:', error);
    }
  }, [editor, showIssueHighlighting, removeIssueHighlighting, applyIssueHighlighting]);

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


  // Check for document-level formatting issues - MUST be before any conditional returns
  const documentLevelIssues = useMemo(() => {
    return issues.filter(issue => 
      issue.location?.type === 'document' && 
      ['formatting'].includes(issue.category) &&
      ['fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins'].includes(issue.fixAction)
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
          
          {/* Document Controls - Fixed Header */}
          <div className="bg-white border-b border-gray-200 flex-shrink-0">
            {/* Top Bar with Title and Actions */}
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
                  {/* Run APA Check Button */}
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
                  
                  {/* Show/Hide Issues Button */}
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
              {/* Undo/Redo */}
              <div className="flex items-center space-x-1 pr-3 border-r border-gray-200">
                <button 
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Undo"
                  onClick={() => console.log('Undo clicked - not implemented')}
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button 
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Redo"
                  onClick={() => console.log('Redo clicked - not implemented')}
                >
                  <Redo className="h-4 w-4" />
                </button>
              </div>
              
              {/* Text Formatting */}
              <div className="flex items-center space-x-1 px-3">
                <button 
                  className={`p-2 rounded transition-colors ${
                    editor.marks?.bold ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Bold"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const isActive = editor.marks?.bold;
                    if (isActive) {
                      Editor.removeMark(editor, 'bold');
                    } else {
                      Editor.addMark(editor, 'bold', true);
                    }
                  }}
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button 
                  className={`p-2 rounded transition-colors ${
                    editor.marks?.italic ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Italic"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const isActive = editor.marks?.italic;
                    if (isActive) {
                      Editor.removeMark(editor, 'italic');
                    } else {
                      Editor.addMark(editor, 'italic', true);
                    }
                  }}
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button 
                  className={`p-2 rounded transition-colors ${
                    editor.marks?.underline ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Underline"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const isActive = editor.marks?.underline;
                    if (isActive) {
                      Editor.removeMark(editor, 'underline');
                    } else {
                      Editor.addMark(editor, 'underline', true);
                    }
                  }}
                >
                  <Underline className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Document Content - Scrollable Area */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              <div className="mx-auto">
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