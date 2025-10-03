'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';
import { PositionCalculator } from '@/utils/positionCalculator';

/**
 * Analysis hook - Runs APA analysis in background
 * Updates issue list without touching editor content
 * NEW: Enriches issues with ProseMirror positions for accurate highlighting
 */
export const useAnalysis = (editor, documentModel, enabled = true, editorInitialized = true) => {
  const [issues, setIssues] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef(null);
  const analyzerRef = useRef(null);
  const lastContentRef = useRef(null);
  const hasRunInitialAnalysisRef = useRef(false);

  // Initialize analyzer once
  useEffect(() => {
    analyzerRef.current = new EnhancedAPAAnalyzer();
  }, []);

  // Actual analysis function (extracted for reuse)
  const performAnalysis = useCallback(async () => {
    if (!editor || !documentModel || !analyzerRef.current) {
      return;
    }

    try {
      const currentContent = editor.getJSON();
      const contentString = JSON.stringify(currentContent);

      // Skip if no changes
      if (lastContentRef.current === contentString) {
        console.log('⏭️ Skipping analysis - no content changes');
        return;
      }

      lastContentRef.current = contentString;
      setIsAnalyzing(true);

      console.log('🧠 Running APA analysis...');

      // Extract text and formatting from Tiptap JSON
      const documentData = {
        text: editor.getText(),
        html: editor.getHTML(),
        formatting: documentModel.formatting,
        structure: documentModel.structure,
        styles: documentModel.styles
      };

      // Run analysis (synchronous for now, Web Worker in future)
      const rawIssues = analyzerRef.current.analyzeDocument(documentData);

      // NEW: Build position map from editor's current document structure
      const positionMap = PositionCalculator.buildPositionMap(editor);

      // NEW: Enrich issues with ProseMirror positions
      const enrichedIssues = PositionCalculator.enrichIssuesWithPositions(
        rawIssues,
        positionMap,
        editor
      );

      if (process.env.NODE_ENV === 'development') {
        const withPositions = enrichedIssues.filter(i => i.pmPosition).length;
        console.log(`📍 Position enrichment: ${withPositions}/${enrichedIssues.length} issues have PM positions`);
      }

      // Update issues state (triggers decoration update)
      setIssues(enrichedIssues);

      // IMPORTANT: Also update DocumentModel so IssuesPanel can see the new issues
      if (documentModel && documentModel.issues) {
        // Clear old issues by clearing the Maps
        documentModel.issues.issues.clear();
        documentModel.issues.paragraphIssues.clear();

        // Add new issues
        enrichedIssues.forEach(issue => {
          documentModel.issues.addIssue(issue);
        });
      }

      console.log(`✅ Analysis complete: ${enrichedIssues.length} issues found`);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setIsAnalyzing(false);
    }
  }, [editor, documentModel]);

  // Manual trigger function for Run Check button
  const triggerAnalysis = useCallback(() => {
    console.log('🔄 Manual analysis triggered');
    // Clear any pending debounced analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    // Run immediately
    performAnalysis();
  }, [performAnalysis]);

  useEffect(() => {
    if (!editor || !documentModel || !enabled) {
      return;
    }

    // IMMEDIATE initial analysis on first load - ONLY after editor content is loaded
    if (!hasRunInitialAnalysisRef.current && editorInitialized) {
      hasRunInitialAnalysisRef.current = true;
      console.log('🚀 Running immediate initial analysis (editor initialized)');
      performAnalysis();
    }

    const handleUpdate = () => {
      // Clear existing timeout
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      // Debounce analysis (8 seconds - after user stops typing)
      analysisTimeoutRef.current = setTimeout(() => {
        performAnalysis();
      }, 8000); // 8 second debounce for updates only
    };

    // Listen to editor updates (for real-time editing)
    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [editor, documentModel, enabled, editorInitialized, performAnalysis]);

  return { issues, isAnalyzing, triggerAnalysis };
};
