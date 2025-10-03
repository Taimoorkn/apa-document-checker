'use client';

import { useState, useEffect, useRef } from 'react';
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';

/**
 * Analysis hook - Runs APA analysis in background
 * Updates issue list without touching editor content
 */
export const useAnalysis = (editor, documentModel, enabled = true) => {
  const [issues, setIssues] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef(null);
  const analyzerRef = useRef(null);
  const lastContentRef = useRef(null);

  // Initialize analyzer once
  useEffect(() => {
    analyzerRef.current = new EnhancedAPAAnalyzer();
  }, []);

  useEffect(() => {
    if (!editor || !documentModel || !enabled) {
      return;
    }

    const handleUpdate = () => {
      // Clear existing timeout
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      // Debounce analysis (8 seconds - after user stops typing)
      analysisTimeoutRef.current = setTimeout(async () => {
        try {
          const currentContent = editor.getJSON();
          const contentString = JSON.stringify(currentContent);

          // Skip if no changes
          if (lastContentRef.current === contentString) {
            return;
          }

          lastContentRef.current = contentString;
          setIsAnalyzing(true);

          // Extract text and formatting from Tiptap JSON
          const documentData = {
            text: editor.getText(),
            html: editor.getHTML(),
            formatting: documentModel.formatting,
            structure: documentModel.structure,
            styles: documentModel.styles
          };

          // Run analysis (synchronous for now, Web Worker in future)
          const newIssues = analyzerRef.current.analyzeDocument(documentData);

          // Update issues state (triggers decoration update)
          setIssues(newIssues);

          console.log(`🧠 Analysis complete: ${newIssues.length} issues found`);
          setIsAnalyzing(false);
        } catch (error) {
          console.error('❌ Analysis failed:', error);
          setIsAnalyzing(false);
        }
      }, 8000); // 8 second debounce
    };

    // Listen to editor updates
    editor.on('update', handleUpdate);

    // Run initial analysis
    handleUpdate();

    return () => {
      editor.off('update', handleUpdate);
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [editor, documentModel, enabled]);

  return { issues, isAnalyzing };
};
