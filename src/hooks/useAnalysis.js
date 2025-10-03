'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TiptapAPAAnalyzer } from '@/utils/tiptapApaAnalyzer';

/**
 * Analysis hook - Runs APA analysis in background
 * Updates issue list without touching editor content
 * TIPTAP-FIRST ARCHITECTURE: Uses TiptapAPAAnalyzer which works directly with Tiptap structure
 */
export const useAnalysis = (editor, documentModel, enabled = true, editorInitialized = true) => {
  const [issues, setIssues] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef(null);
  const analyzerRef = useRef(null);
  const lastContentRef = useRef(null);
  const hasRunInitialAnalysisRef = useRef(false);

  // Initialize Tiptap-native analyzer once
  useEffect(() => {
    analyzerRef.current = new TiptapAPAAnalyzer();
  }, []);

  // Actual analysis function (extracted for reuse)
  const performAnalysis = useCallback(async () => {
    if (!editor || !documentModel || !analyzerRef.current) {
      console.warn('⚠️ [useAnalysis] Missing dependencies:', {
        hasEditor: !!editor,
        hasDocumentModel: !!documentModel,
        hasAnalyzer: !!analyzerRef.current
      });
      return;
    }

    try {
      const currentContent = editor.getJSON();
      const contentString = JSON.stringify(currentContent);

      // Skip if no changes
      if (lastContentRef.current === contentString) {
        console.log('⏭️ [useAnalysis] Skipping analysis - no content changes');
        return;
      }

      lastContentRef.current = contentString;
      setIsAnalyzing(true);

      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║      🧠 [useAnalysis] ANALYSIS TRIGGERED             ║');
      console.log('╚═══════════════════════════════════════════════════════╝');

      // TIPTAP-FIRST: Analyzer works directly with editor instance
      // No need for text extraction - analyzeDocument() traverses Tiptap nodes directly
      const issuesWithPositions = analyzerRef.current.analyzeDocument(
        editor,
        documentModel.formatting,
        documentModel.structure
      );

      // Issues already have pmPosition from analyzer - no post-processing needed!

      console.log(`\n📦 [useAnalysis] Updating state with ${issuesWithPositions.length} issues...`);

      // Update issues state (triggers decoration update)
      setIssues(issuesWithPositions);

      // IMPORTANT: Also update DocumentModel so IssuesPanel can see the new issues
      if (documentModel && documentModel.issues) {
        // Clear old issues by clearing the Maps
        documentModel.issues.issues.clear();
        documentModel.issues.paragraphIssues.clear();

        // Add new issues
        issuesWithPositions.forEach(issue => {
          documentModel.issues.addIssue(issue);
        });
        console.log(`✅ [useAnalysis] DocumentModel updated with ${issuesWithPositions.length} issues`);
      }

      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log(`║      ✅ [useAnalysis] ANALYSIS COMPLETE              ║`);
      console.log('╚═══════════════════════════════════════════════════════╝\n');

      setIsAnalyzing(false);
    } catch (error) {
      console.error('╔═══════════════════════════════════════════════════════╗');
      console.error('║      ❌ [useAnalysis] ANALYSIS FAILED                ║');
      console.error('╚═══════════════════════════════════════════════════════╝');
      console.error('Error details:', error);
      setIsAnalyzing(false);
    }
  }, [editor, documentModel]);

  // Manual trigger function for Run Check button
  const triggerAnalysis = useCallback(() => {
    console.log('🔄 [useAnalysis] Manual analysis triggered');
    // Clear any pending debounced analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    // Run immediately
    performAnalysis();
  }, [performAnalysis]);

  useEffect(() => {
    if (!editor || !documentModel || !enabled) {
      console.log('⏸️ [useAnalysis] Analysis disabled:', {
        hasEditor: !!editor,
        hasDocumentModel: !!documentModel,
        enabled
      });
      return;
    }

    // IMMEDIATE initial analysis on first load - ONLY after editor content is loaded
    if (!hasRunInitialAnalysisRef.current && editorInitialized) {
      hasRunInitialAnalysisRef.current = true;
      console.log('🚀 [useAnalysis] Running immediate initial analysis (editor initialized)');
      performAnalysis();
    }

    const handleUpdate = () => {
      // Clear existing timeout
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      console.log('⏱️ [useAnalysis] Editor updated, debouncing analysis (8s)...');

      // Debounce analysis (8 seconds - after user stops typing)
      analysisTimeoutRef.current = setTimeout(() => {
        console.log('⏰ [useAnalysis] Debounce complete, running analysis...');
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
