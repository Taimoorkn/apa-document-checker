// src/store/enhancedDocumentStore.js - Updated store with server integration
'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Import the enhanced APA analyzer (same as before, but now works with rich data)
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';

export const useDocumentStore = create((set, get) => ({
  // Document state - now includes rich formatting data
  documentText: null,
  documentHtml: null,
  documentName: null,
  documentFormatting: null, // Rich formatting data from server
  documentStructure: null,  // Document structure data
  documentStyles: null,     // Document styles
  documentStats: {
    wordCount: 0,
    charCount: 0,
    paragraphCount: 0,
    processingTime: 0
  },
  
  // Issues and analysis state
  issues: [],
  activeIssueId: null,
  analysisScore: null,
  complianceDetails: null, // Detailed compliance information
  lastFixAppliedAt: null,
  
  // Processing state
  processingState: {
    isUploading: false,
    isAnalyzing: false,
    isSchedulingAnalysis: false,
    isApplyingFix: false,
    lastError: null,
    progress: 0,
    currentFixId: null,
    stage: null
  },
  
  // Upload document with server-side processing
  uploadDocument: async (file) => {
    const SERVER_URL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : '';
    
    try {
      set({
        processingState: {
          ...get().processingState,
          isUploading: true,
          lastError: null,
          progress: 10,
          stage: 'Uploading document...'
        }
      });
      
      // Validate file on client side
      if (!file.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Please upload a .docx file only');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('File size must be less than 10MB');
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('document', file);
      
      set({
        documentName: file.name,
        processingState: {
          ...get().processingState,
          progress: 20,
          stage: 'Sending to server...'
        }
      });
      
      // Send to server for processing
      const response = await fetch(`${SERVER_URL}/api/upload-docx`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });
      
      set({
        processingState: {
          ...get().processingState,
          progress: 60,
          stage: 'Processing document...'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Server processing failed');
      }
      
      set({
        processingState: {
          ...get().processingState,
          progress: 80,
          stage: 'Extracting document data...'
        }
      });
      
      const { document: documentData } = result;
      
      // Validate that we got the expected data structure
      if (!documentData.html || !documentData.text) {
        console.warn('Incomplete document data from server:', documentData);
        throw new Error('Server returned incomplete document data');
      }
      
      // Calculate stats
      const words = documentData.processingInfo?.wordCount || 
                    documentData.text.trim().split(/\s+/).filter(Boolean).length;
      const chars = documentData.text.length;
      const paragraphs = documentData.formatting?.paragraphs?.length || 0;
      
      set({
        processingState: {
          ...get().processingState,
          progress: 90,
          stage: 'Finalizing...'
        }
      });
      
      // Store the rich document data
      set(state => ({
        documentHtml: documentData.html,
        documentText: documentData.text,
        documentFormatting: documentData.formatting,
        documentStructure: documentData.structure,
        documentStyles: documentData.styles,
        documentStats: {
          wordCount: words,
          charCount: chars,
          paragraphCount: paragraphs,
          processingTime: documentData.processingInfo?.processingTime || 0
        },
        complianceDetails: documentData.formatting?.compliance || null,
        issues: [], // Clear previous issues
        activeIssueId: null,
        processingState: {
          ...state.processingState,
          progress: 100,
          isUploading: false,
          stage: 'Upload complete'
        }
      }));
      
      console.log('✅ Document successfully processed with rich formatting data');
      console.log('Document Text length:', documentData.text?.length);
      console.log('Document HTML length:', documentData.html?.length);
      console.log('Has formatting data:', !!documentData.formatting);
      console.log('Has structure data:', !!documentData.structure);
      console.log('Current processing state:', get().processingState);
      
      return true;
      
    } catch (error) {
      console.error('Error uploading document:', error);
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isUploading: false,
          lastError: error.message || 'Failed to process document',
          progress: 0,
          stage: null
        }
      }));
      
      return false;
    }
  },
  
  // Enhanced analysis using rich document data
  analyzeDocument: async () => {
    const { 
      documentText, 
      documentHtml, 
      documentFormatting, 
      documentStructure,
      documentStyles 
    } = get();
    
    if (!documentText) {
      console.warn('Cannot analyze document: No document data available');
      return { success: false, error: 'No document data available' };
    }
    
    try {
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: true,
          lastError: null,
          stage: 'Analyzing APA compliance...'
        }
      }));
      
      // Create comprehensive document data object
      const documentData = {
        text: documentText,
        html: documentHtml,
        formatting: documentFormatting,
        structure: documentStructure,
        styles: documentStyles
      };
      
      console.log('🔍 Starting APA analysis with rich data...');
      console.log('Available data:', {
        hasText: !!documentText,
        hasHtml: !!documentHtml,
        hasFormatting: !!documentFormatting,
        hasStructure: !!documentStructure,
        formattingCompliance: documentFormatting?.compliance?.overall
      });
      console.log('Current processing state before analysis:', get().processingState);
      
      // Use enhanced analyzer with rich document data
      const analysisResults = await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const analyzer = new EnhancedAPAAnalyzer();
            const results = analyzer.analyzeDocument(documentData);
            resolve(results);
          } catch (error) {
            reject(error);
          }
        }, 100);
      });
      
      // Map results to store format and add IDs
      const issues = analysisResults.map(issue => ({
        id: uuidv4(),
        ...issue,
        // Ensure all required fields are present
        title: issue.title || 'Unknown Issue',
        description: issue.description || '',
        severity: issue.severity || 'Minor',
        category: issue.category || 'general',
        text: issue.text || null,
        location: issue.location || null,
        hasFix: issue.hasFix || false,
        fixAction: issue.fixAction || null,
        explanation: issue.explanation || issue.description || ''
      }));
      
      // Calculate enhanced compliance score
      const criticalCount = issues.filter(i => i.severity === 'Critical').length;
      const majorCount = issues.filter(i => i.severity === 'Major').length;
      const minorCount = issues.filter(i => i.severity === 'Minor').length;
      
      // Use server-provided compliance data if available
      let analysisScore;
      if (documentFormatting?.compliance?.overall !== undefined) {
        // Adjust server compliance score based on content issues
        const contentPenalty = criticalCount * 10 + majorCount * 5 + minorCount * 2;
        analysisScore = Math.max(0, Math.min(100, 
          Math.round(documentFormatting.compliance.overall - contentPenalty)
        ));
      } else {
        // Fallback calculation
        analysisScore = Math.max(0, Math.min(100, 
          Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))
        ));
      }
      
      set(state => ({
        issues,
        analysisScore,
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          isSchedulingAnalysis: false,
          stage: null
        }
      }));
      
      console.log(`✅ Analysis complete: ${issues.length} issues found, score: ${analysisScore}%`);
      console.log('Issues breakdown:', { criticalCount, majorCount, minorCount });
      console.log('Final processing state:', get().processingState);
      
      return { 
        success: true, 
        issueCount: issues.length,
        score: analysisScore,
        breakdown: { criticalCount, majorCount, minorCount }
      };
      
    } catch (error) {
      console.error('❌ Error analyzing document:', error);
      console.error('Error details:', error.message, error.stack);
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          isSchedulingAnalysis: false,
          lastError: error.message || 'Analysis failed',
          stage: null
        }
      }));
      
      return { success: false, error: error.message };
    }
  },
  
  // Auto-analyze after upload
  analyzeDocumentDebounced: async () => {
    // For server-side processing, we can analyze immediately since processing is faster
    return await get().analyzeDocument();
  },
  
  // Enhanced fix application (same as before, but with better data)
  applyFix: async (issueId) => {
    const { issues, documentHtml, documentText } = get();
    const issue = issues.find(i => i.id === issueId);
    
    if (!issue || !issue.hasFix) {
      console.warn('Cannot apply fix: issue not found or no fix available');
      return false;
    }
    
    console.log('Applying fix for issue:', issue.title);
    
    set(state => ({
      processingState: {
        ...state.processingState,
        isApplyingFix: true,
        currentFixId: issueId,
        stage: `Applying fix: ${issue.title}`
      }
    }));
    
    try {
      // Apply the fix using the existing logic
      let updatedHtml = documentHtml;
      let updatedText = documentText;
      let contentChanged = false;
      
      const success = await get().applySpecificFix(issue, updatedHtml, updatedText);
      
      if (success.changed) {
        updatedHtml = success.html;
        updatedText = success.text;
        contentChanged = true;
      }
      
      // Remove the fixed issue
      const updatedIssues = issues.filter(i => i.id !== issueId);
      
      // Recalculate score
      const criticalCount = updatedIssues.filter(i => i.severity === 'Critical').length;
      const majorCount = updatedIssues.filter(i => i.severity === 'Major').length;
      const minorCount = updatedIssues.filter(i => i.severity === 'Minor').length;
      
      const newScore = updatedIssues.length === 0 ? 100 : 
        Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))));
      
      set(state => ({
        documentText: updatedText,
        documentHtml: updatedHtml,
        issues: updatedIssues,
        analysisScore: newScore,
        lastFixAppliedAt: contentChanged ? Date.now() : state.lastFixAppliedAt,
        activeIssueId: null,
        processingState: {
          ...state.processingState,
          isApplyingFix: false,
          currentFixId: null,
          stage: null
        }
      }));
      
      console.log('Fix applied successfully');
      return true;
      
    } catch (error) {
      console.error('Error applying fix:', error);
      
      // Still remove the issue even if fix failed
      const updatedIssues = issues.filter(i => i.id !== issueId);
      
      set(state => ({
        issues: updatedIssues,
        activeIssueId: null,
        processingState: {
          ...state.processingState,
          isApplyingFix: false,
          currentFixId: null,
          lastError: `Failed to apply fix: ${error.message}`,
          stage: null
        }
      }));
      
      return false;
    }
  },
  
  // Apply specific fix logic (same as before)
  applySpecificFix: async (issue, html, text) => {
    let updatedHtml = html;
    let updatedText = text;
    let changed = false;
    
    try {
      switch (issue.fixAction) {
        case 'fixFont':
          updatedHtml = html.replace(
            /font-family:[^;]+;?/gi, 
            'font-family: "Times New Roman", Times, serif;'
          );
          if (!html.includes('font-family')) {
            updatedHtml = `<div style="font-family: 'Times New Roman', Times, serif;">${html}</div>`;
          }
          changed = updatedHtml !== html;
          break;
          
        case 'addCitationComma':
          if (issue.text) {
            const fixedText = issue.text.replace(
              /\(([^,)]+)\s+(\d{4})\)/g, 
              '($1, $2)'
            );
            updatedText = text.replace(issue.text, fixedText);
            updatedHtml = html.replace(issue.text, fixedText);
            changed = updatedText !== text;
          }
          break;
          
        case 'fixParentheticalConnector':
          if (issue.text) {
            const fixedText = issue.text.replace(' and ', ' & ');
            updatedText = text.replace(issue.text, fixedText);
            updatedHtml = html.replace(issue.text, fixedText);
            changed = updatedText !== text;
          }
          break;
          
        case 'addPageNumber':
          if (issue.text && issue.text.includes('(') && issue.text.includes(')')) {
            const fixedText = issue.text.replace(/\)$/, ', p. 1)');
            updatedText = text.replace(issue.text, fixedText);
            updatedHtml = html.replace(issue.text, fixedText);
            changed = updatedText !== text;
          }
          break;
          
        case 'fixEtAlFormatting':
          if (issue.text) {
            // Fix et al. formatting: (Smith et al., 2021) → (Smith, et al., 2021)
            const fixedText = issue.text.replace(
              /\(([^,)]+)\s+et\s+al\.,\s*(\d{4})\)/g, 
              '($1, et al., $2)'
            );
            updatedText = text.replace(issue.text, fixedText);
            updatedHtml = html.replace(issue.text, fixedText);
            changed = updatedText !== text;
          }
          break;
          
        case 'fixReferenceConnector':
          if (issue.text) {
            // Fix reference connector: "Author, A., and Author, B." → "Author, A., & Author, B."
            const fixedText = issue.text.replace(/, and /g, ', & ');
            updatedText = text.replace(issue.text, fixedText);
            updatedHtml = html.replace(issue.text, fixedText);
            changed = updatedText !== text;
          }
          break;
          
        case 'fixAllCapsHeading':
          if (issue.text) {
            // Convert ALL CAPS heading to Title Case
            const fixedText = issue.text.toLowerCase()
              .split(' ')
              .map(word => {
                // Capitalize first letter of each word, except small words (unless first word)
                const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];
                const isFirstWord = word === issue.text.toLowerCase().split(' ')[0];
                
                if (isFirstWord || !smallWords.includes(word)) {
                  return word.charAt(0).toUpperCase() + word.slice(1);
                }
                return word;
              })
              .join(' ');
            
            updatedText = text.replace(issue.text, fixedText);
            updatedHtml = html.replace(issue.text, fixedText);
            changed = updatedText !== text;
          }
          break;
          
        default:
          console.log('Fix action not implemented:', issue.fixAction);
          break;
      }
      
      return { html: updatedHtml, text: updatedText, changed };
      
    } catch (error) {
      console.error('Error in applySpecificFix:', error);
      return { html, text, changed: false };
    }
  },
  
  // Set active issue
  setActiveIssue: (issueId) => {
    set({ activeIssueId: issueId });
  },
  
  // Get analysis summary with rich formatting data
  getAnalysisSummary: () => {
    const { 
      issues, 
      analysisScore, 
      documentStats, 
      documentFormatting,
      complianceDetails 
    } = get();
    
    const severityCounts = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
    
    const categoryCounts = issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {});
    
    return {
      score: analysisScore,
      totalIssues: issues.length,
      severity: severityCounts,
      categories: categoryCounts,
      documentInfo: {
        ...documentStats,
        hasRichFormatting: !!documentFormatting,
        formattingCompliance: complianceDetails
      },
      compliance: complianceDetails
    };
  },

  // Export document
  exportDocument: async (format) => {
    const { documentHtml, documentName } = get();
    
    if (!documentHtml) {
      alert('No document to export');
      return false;
    }
    
    try {
      // Simple HTML export
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>APA Formatted Document</title>
          <style>
            body { 
              font-family: "Times New Roman", Times, serif; 
              font-size: 12pt; 
              line-height: 2; 
              margin: 1in; 
            }
          </style>
        </head>
        <body>${documentHtml}</body>
        </html>
      `;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName ? 
        documentName.replace('.docx', '_APA_formatted.html') : 
        'apa_formatted_document.html';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}));