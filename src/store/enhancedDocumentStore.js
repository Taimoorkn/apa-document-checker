// src/store/enhancedDocumentStore.js - Updated store with server integration
'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Import the enhanced APA analyzer (same as before, but now works with rich data)
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';
import { aiEnhancedAnalyzer } from '@/utils/aiEnhancedAnalyzer';

export const useDocumentStore = create((set, get) => ({
  // Document state - now includes rich formatting data
  documentText: null,
  documentHtml: null,
  documentName: null,
  documentFormatting: null, // Rich formatting data from server
  documentStructure: null,  // Document structure data
  documentStyles: null,     // Document styles
  originalDocumentBuffer: null, // Original document buffer for first upload
  currentDocumentBuffer: null,  // Current document buffer (with applied fixes)
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
    isAiAnalyzing: false, // New: AI analysis state
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
      
      // Store the original file buffer for fixes
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);
      
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
      
      // Store the rich document data including document buffers
      set(state => ({
        documentHtml: documentData.html,
        documentText: documentData.text,
        documentFormatting: documentData.formatting,
        documentStructure: documentData.structure,
        documentStyles: documentData.styles,
        originalDocumentBuffer: uint8Array, // Store original buffer
        currentDocumentBuffer: uint8Array,  // Initialize current buffer same as original
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
      let issues = analysisResults.map(issue => ({
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

      // Enhance with AI analysis if API key is available
      try {
        if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
          console.log('🤖 Starting AI-enhanced analysis...');
          
          set(state => ({
            processingState: {
              ...state.processingState,
              isAiAnalyzing: true,
              stage: 'AI analyzing content...'
            }
          }));

          const enhancedIssues = await aiEnhancedAnalyzer.enhanceAnalysis(documentData, issues);
          issues = enhancedIssues;
          
          console.log(`✨ AI analysis complete: ${issues.length} total issues (${issues.filter(i => i.aiGenerated).length} AI-generated)`);
        }
      } catch (aiError) {
        console.warn('⚠️ AI analysis failed, continuing with rule-based analysis:', aiError.message);
      }
      
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
          isAiAnalyzing: false,
          stage: null
        }
      }));
      
      
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
  
  // Enhanced fix application with document regeneration
  applyFix: async (issueId) => {
    const { issues, documentHtml, documentText, documentFormatting } = get();
    const issue = issues.find(i => i.id === issueId);
    
    if (!issue || !issue.hasFix) {
      return false;
    }
    
    set(state => ({
      processingState: {
        ...state.processingState,
        isApplyingFix: true,
        currentFixId: issueId,
        stage: `Applying fix: ${issue.title}`
      }
    }));
    
    try {
      // Check if this is a formatting fix that requires document regeneration
      const formattingFixes = ['fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins', 'fixIndentation'];
      
      if (formattingFixes.includes(issue.fixAction)) {
        console.log(`🔄 Regenerating document with fix: ${issue.fixAction}`);
        
        // Apply the fix to the formatting data and regenerate HTML
        const result = await get().applyFormattingFix(issue, documentFormatting, documentText);
        
        if (result.success) {
          // Remove the fixed issue and update all document data
          const updatedIssues = issues.filter(i => i.id !== issueId);
          
          // Recalculate score
          const criticalCount = updatedIssues.filter(i => i.severity === 'Critical').length;
          const majorCount = updatedIssues.filter(i => i.severity === 'Major').length;
          const minorCount = updatedIssues.filter(i => i.severity === 'Minor').length;
          
          const newScore = updatedIssues.length === 0 ? 100 : 
            Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))));
          
          // Calculate updated stats
          const words = result.text ? result.text.trim().split(/\s+/).filter(Boolean).length : 0;
          const chars = result.text ? result.text.length : 0;
          const paragraphs = result.formatting?.paragraphs?.length || 0;
          
          set(state => ({
            // Update all document data with the server response
            documentHtml: result.html,
            documentText: result.text,
            documentFormatting: result.formatting,
            documentStructure: result.structure,
            documentStyles: result.styles,
            currentDocumentBuffer: result.updatedBuffer || state.currentDocumentBuffer, // Update buffer for next fix
            documentStats: {
              wordCount: words,
              charCount: chars,
              paragraphCount: paragraphs,
              processingTime: state.documentStats.processingTime // Keep original processing time
            },
            complianceDetails: result.formatting?.compliance || null,
            issues: updatedIssues,
            analysisScore: newScore,
            lastFixAppliedAt: Date.now(),
            activeIssueId: null,
            processingState: {
              ...state.processingState,
              isApplyingFix: false,
              currentFixId: null,
              stage: null
            }
          }));
          
          return true;
        }
      } else {
        // Use the original text-based fix approach for content issues
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
        
        return true;
      }
      
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
          break;
      }
      
      return { html: updatedHtml, text: updatedText, changed };
      
    } catch (error) {
      console.error('Error in applySpecificFix:', error);
      return { html, text, changed: false };
    }
  },
  
  // Apply formatting fix via server-side DOCX modification (Memory-based)
  applyFormattingFix: async (issue, originalFormatting, documentText) => {
    const SERVER_URL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : '';
    
    const { currentDocumentBuffer, documentName } = get();
    
    try {
      console.log(`🔧 Applying memory-based formatting fix: ${issue.fixAction}`);
      
      if (!currentDocumentBuffer) {
        throw new Error('No document buffer available for document modification');
      }
      
      // Determine fix value based on action
      let fixValue;
      switch (issue.fixAction) {
        case 'fixFont':
          fixValue = 'Times New Roman';
          break;
        case 'fixFontSize':
          fixValue = 24; // 24 half-points = 12pt
          break;
        case 'fixLineSpacing':
          fixValue = 480; // 480 = double spacing in Word
          break;
        case 'fixMargins':
          fixValue = { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 };
          break;
        case 'fixIndentation':
          fixValue = 0.5;
          break;
        default:
          throw new Error(`Unknown fix action: ${issue.fixAction}`);
      }
      
      console.log(`📡 Sending fix request to server: ${issue.fixAction} = ${JSON.stringify(fixValue)}`);
      
      // Convert Uint8Array to base64 for JSON transport
      const base64Buffer = btoa(String.fromCharCode(...currentDocumentBuffer));
      
      // Send fix request to server with document buffer
      const response = await fetch(`${SERVER_URL}/api/apply-fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentBuffer: base64Buffer,
          fixAction: issue.fixAction,
          fixValue: fixValue,
          originalFilename: documentName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Server failed to apply fix');
      }
      
      console.log('🎉 Memory-based fix applied successfully');
      
      // Convert the returned buffer back to Uint8Array for next iteration
      let updatedBuffer = null;
      if (result.modifiedDocumentBuffer) {
        const binaryString = atob(result.modifiedDocumentBuffer);
        updatedBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          updatedBuffer[i] = binaryString.charCodeAt(i);
        }
      }
      
      // Return the updated document data from server
      return {
        success: true,
        html: result.document.html,
        text: result.document.text,
        formatting: result.document.formatting,
        structure: result.document.structure,
        styles: result.document.styles,
        updatedBuffer: updatedBuffer // Include updated buffer for cumulative fixes
      };
      
    } catch (error) {
      console.error('Error applying memory-based formatting fix:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Set active issue
  setActiveIssue: (issueId) => {
    set({ activeIssueId: issueId });
  },

  // Generate AI-powered fix suggestion
  generateAIFixSuggestion: async (issueId) => {
    const { issues, documentText } = get();
    const issue = issues.find(i => i.id === issueId);
    
    if (!issue || !documentText || !process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      return { success: false, error: 'AI suggestions not available' };
    }

    try {
      console.log(`🤖 Generating AI fix suggestion for: ${issue.title}`);
      
      const suggestion = await aiEnhancedAnalyzer.generateFixSuggestion(issue, documentText);
      
      if (suggestion.success) {
        // Update the issue with AI suggestion
        set(state => ({
          issues: state.issues.map(i => 
            i.id === issueId 
              ? { ...i, aiSuggestion: suggestion.suggestion }
              : i
          )
        }));
        
        return suggestion;
      }
      
      return suggestion;
      
    } catch (error) {
      console.error('Error generating AI fix suggestion:', error);
      return { success: false, error: error.message };
    }
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