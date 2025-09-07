'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Import the enhanced APA analyzer
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';

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
  
  // Editor state
  editorContent: null,      // Slate.js editor content
  editorChanged: false,     // Track if editor content has changed
  documentStats: {
    wordCount: 0,
    charCount: 0,
    paragraphCount: 0,
    processingTime: 0
  },
  
  // Issues and analysis state
  issues: [],
  activeIssueId: null,
  showIssueHighlighting: true, // Persist issue highlighting state
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
      
      // No automatic analysis - user must click "Run Check" button
      
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
        issues: [],
        analysisScore: null,
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          isSchedulingAnalysis: false,
          lastError: error.message || 'Document analysis failed',
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
      // Separate formatting fixes (server-side) from content fixes (client-side)
      const serverFormattingFixes = [
        'fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins', 'fixIndentation'
      ];
      
      const clientContentFixes = [
        'addCitationComma', 'fixParentheticalConnector', 'fixEtAlFormatting', 
        'fixReferenceConnector', 'fixAllCapsHeading', 'addPageNumber',
        'sortReferences', 'fixTableTitleCase', 'fixFigureCaptionCase',
        'fixTableNoteFormat', 'removeRetrievedFrom', 'formatDOI',
        'addReferencePeriod', 'fixReferenceIndent',
        'addSerialComma', 'fixListNumbering', 'fixComplexSeries',
        'replaceLatinAbbr', 'fixPluralAbbr', 'capitalizeSubtitle',
        'fixBlockQuote', 'fixStatSymbol', 'fixNumberFormat', 'replaceBiasedTerm'
      ];
      
      if (clientContentFixes.includes(issue.fixAction)) {
        console.log(`🔧 Applying client-side content fix: ${issue.fixAction}`);
        
        // Apply fix directly to current editor content (no server involved)
        const success = await get().applyClientSideFix(issue, issueId);
        
        return success;
        
      } else if (serverFormattingFixes.includes(issue.fixAction)) {
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
          
          // Clear the lastFixAppliedAt after a brief delay to allow re-triggering
          setTimeout(() => {
            set(state => ({
              lastFixAppliedAt: null
            }));
          }, 100);
          
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
        
        // Clear the lastFixAppliedAt after a brief delay if content changed
        if (contentChanged) {
          setTimeout(() => {
            set(state => ({
              lastFixAppliedAt: null
            }));
          }, 100);
        }
        
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

  // Apply client-side fix directly to editor content (no server involved)
  applyClientSideFix: async (issue, issueId) => {
    const { issues } = get();
    
    try {
      console.log(`🔧 Applying client-side fix: ${issue.fixAction} for issue: ${issue.title}`);
      console.log(`📝 Original text: "${issue.text}"`);
      
      // Calculate the replacement text
      let replacementText = '';
      
      switch (issue.fixAction) {
        case 'addCitationComma':
          replacementText = issue.text.replace(/\(([^,)]+)\s+(\d{4})\)/g, '($1, $2)');
          break;
        case 'fixParentheticalConnector':
          replacementText = issue.text.replace(' and ', ' & ');
          break;
        case 'fixEtAlFormatting':
          replacementText = issue.text.replace(/\(([^,)]+)\s+et\s+al\.,\s*(\d{4})\)/g, '($1, et al., $2)');
          break;
        case 'fixReferenceConnector':
          replacementText = issue.text.replace(/, and /g, ', & ');
          break;
        case 'fixAllCapsHeading':
          replacementText = issue.text.toLowerCase()
            .split(' ')
            .map((word, index) => {
              const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];
              if (index === 0 || !smallWords.includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
              }
              return word;
            })
            .join(' ');
          break;
        case 'addPageNumber':
          if (issue.text.includes('(') && issue.text.includes(')')) {
            replacementText = issue.text.replace(/\)$/, ', p. 1)');
          }
          break;
          
        // New reference fixes
        case 'sortReferences':
          // This requires reorganizing the entire references section
          replacementText = this.sortReferencesSection(issue.text);
          break;
          
        case 'addReferencePeriod':
          replacementText = issue.text.trim();
          if (!replacementText.endsWith('.')) {
            replacementText += '.';
          }
          break;
          
        case 'removeRetrievedFrom':
          replacementText = issue.text.replace(/Retrieved from\s*/gi, '');
          break;
          
        case 'formatDOI':
          // Convert doi:xxxxx to https://doi.org/xxxxx
          replacementText = issue.text.replace(/doi:\s*([^\s]+)/gi, 'https://doi.org/$1');
          break;
          
        // Table/Figure fixes
        case 'fixTableTitleCase':
          replacementText = this.convertToTitleCase(issue.text);
          break;
          
        case 'fixFigureCaptionCase':
          replacementText = this.convertToSentenceCase(issue.text);
          break;
          
        case 'fixTableNoteFormat':
          if (!issue.text.startsWith('Note.')) {
            replacementText = 'Note. ' + issue.text;
          } else {
            replacementText = issue.text;
          }
          break;
          
        // Lists and seriation fixes
        case 'addSerialComma':
          // Add comma before 'and' in series
          replacementText = issue.text.replace(/(\w+)\s+and\s+/, '$1, and ');
          break;
          
        case 'fixListNumbering':
          // This would require context of the whole list
          console.log('List numbering fix requires document-level changes');
          replacementText = issue.text;
          break;
          
        case 'fixComplexSeries':
          // Add semicolon before 'and' in complex series
          replacementText = issue.text.replace(/;\s*and\s+/, '; and ');
          break;
          
        // Abbreviation fixes
        case 'replaceLatinAbbr':
          if (issue.fixValue) {
            replacementText = issue.text.replace(issue.fixValue.original, issue.fixValue.replacement);
          }
          break;
          
        case 'fixPluralAbbr':
          // Remove apostrophe from plural abbreviations
          replacementText = issue.text.replace(/'s\b/g, 's');
          break;
          
        // Title/heading fixes
        case 'capitalizeSubtitle':
          // Capitalize first word after colon
          replacementText = issue.text.replace(/(:\s*)([a-z])/g, (match, colon, letter) => colon + letter.toUpperCase());
          break;
          
        // Quotation fixes
        case 'fixBlockQuote':
          // Add block quote formatting indicator
          replacementText = '\n' + issue.text + '\n';
          break;
          
        // Statistical fixes
        case 'fixStatSymbol':
          // Italicize statistical symbols
          if (issue.fixValue && issue.fixValue.symbol) {
            replacementText = issue.text.replace(new RegExp(`\\b${issue.fixValue.symbol}\\b`, 'g'), `*${issue.fixValue.symbol}*`);
          }
          break;
          
        case 'fixNumberFormat':
          // Fix number formatting issues
          if (issue.fixValue && issue.fixValue.corrected) {
            replacementText = issue.text.replace(issue.fixValue.original, issue.fixValue.corrected);
          }
          break;
          
        // Bias-free language fixes
        case 'replaceBiasedTerm':
          if (issue.fixValue && issue.fixValue.replacement) {
            replacementText = issue.text.replace(new RegExp(issue.fixValue.term, 'gi'), issue.fixValue.replacement);
          }
          break;
          
        default:
          console.warn(`Unsupported client-side fix: ${issue.fixAction}`);
          return false;
      }
      
      if (replacementText && replacementText !== issue.text) {
        console.log(`📝 Replacement text: "${replacementText}"`);
        
        // Signal to DocumentEditor to apply the text replacement
        // We'll use a custom event or store method to communicate with the editor
        window.dispatchEvent(new CustomEvent('applyTextReplacement', {
          detail: {
            originalText: issue.text,
            replacementText: replacementText,
            issueId: issueId
          }
        }));
        
        // Remove the issue from the list
        const updatedIssues = issues.filter(i => i.id !== issueId);
        
        // Recalculate score
        const criticalCount = updatedIssues.filter(i => i.severity === 'Critical').length;
        const majorCount = updatedIssues.filter(i => i.severity === 'Major').length;
        const minorCount = updatedIssues.filter(i => i.severity === 'Minor').length;
        
        const newScore = updatedIssues.length === 0 ? 100 : 
          Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))));
        
        set({
          issues: updatedIssues,
          analysisScore: newScore,
          activeIssueId: null,
          processingState: {
            ...get().processingState,
            isApplyingFix: false,
            currentFixId: null,
            stage: null
          }
        });
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Error applying client-side fix:', error);
      
      set({
        activeIssueId: null,
        processingState: {
          ...get().processingState,
          isApplyingFix: false,
          currentFixId: null,
          lastError: `Failed to apply fix: ${error.message}`,
          stage: null
        }
      });
      
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
        // Formatting fixes
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

        // Text-based content fixes
        case 'addCitationComma':
          if (issue.text) {
            const fixedText = issue.text.replace(/\(([^,)]+)\s+(\d{4})\)/g, '($1, $2)');
            fixValue = { originalText: issue.text, replacementText: fixedText };
          }
          break;
        case 'fixParentheticalConnector':
          if (issue.text) {
            const fixedText = issue.text.replace(' and ', ' & ');
            fixValue = { originalText: issue.text, replacementText: fixedText };
          }
          break;
        case 'fixEtAlFormatting':
          if (issue.text) {
            const fixedText = issue.text.replace(/\(([^,)]+)\s+et\s+al\.,\s*(\d{4})\)/g, '($1, et al., $2)');
            fixValue = { originalText: issue.text, replacementText: fixedText };
          }
          break;
        case 'fixReferenceConnector':
          if (issue.text) {
            const fixedText = issue.text.replace(/, and /g, ', & ');
            fixValue = { originalText: issue.text, replacementText: fixedText };
          }
          break;
        case 'fixAllCapsHeading':
          if (issue.text) {
            const fixedText = issue.text.toLowerCase()
              .split(' ')
              .map(word => {
                const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];
                const isFirstWord = word === issue.text.toLowerCase().split(' ')[0];
                
                if (isFirstWord || !smallWords.includes(word)) {
                  return word.charAt(0).toUpperCase() + word.slice(1);
                }
                return word;
              })
              .join(' ');
            fixValue = { originalText: issue.text, replacementText: fixedText };
          }
          break;
        case 'addPageNumber':
          if (issue.text && issue.text.includes('(') && issue.text.includes(')')) {
            const fixedText = issue.text.replace(/\)$/, ', p. 1)');
            fixValue = { originalText: issue.text, replacementText: fixedText };
          }
          break;
        default:
          throw new Error(`Unknown fix action: ${issue.fixAction}`);
      }
      
      if (!fixValue) {
        throw new Error(`Could not determine fix value for action: ${issue.fixAction}`);
      }
      
      console.log(`💡 Sending fix request to server: ${issue.fixAction} = ${JSON.stringify(fixValue)}`);
      
      // First, test if server is accessible
      try {
        const healthCheck = await fetch(`${SERVER_URL}/api/health`);
        console.log('🏥 Health check response:', healthCheck.status);
        if (!healthCheck.ok) {
          throw new Error(`Server health check failed: ${healthCheck.status}`);
        }
      } catch (healthError) {
        console.error('❌ Server is not accessible:', healthError);
        throw new Error(`Server is not accessible: ${healthError.message}. Make sure the backend server is running on port 3001.`);
      }
      
      // Convert Uint8Array to base64 for JSON transport
      const base64Buffer = btoa(String.fromCharCode(...currentDocumentBuffer));
      
      // Send fix request to server with document buffer
      console.log('🚀 Sending fix request to server:', {
        fixAction: issue.fixAction,
        fixValue: fixValue,
        fixValueType: typeof fixValue,
        bufferSize: base64Buffer.length,
        filename: documentName
      });
      
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
      
      console.log('📡 Server response status:', response.status);
      console.log('📡 Server response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        try {
          const responseText = await response.text();
          console.log('Raw response text:', responseText);
          
          if (contentType && contentType.includes('application/json') && responseText) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: responseText || 'Unknown server error' };
          }
        } catch (parseError) {
          console.error('Error parsing server response:', parseError);
          errorData = { error: 'Failed to parse server error response' };
        }
        
        console.error('❌ Server error response:', errorData);
        console.error('❌ Full response details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Server fix response:', {
        success: result.success,
        fixApplied: result.fixApplied,
        hasDocument: !!result.document,
        hasBuffer: !!result.modifiedDocumentBuffer
      });
      
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
  
  // Set active issue and scroll to it
  setActiveIssue: (issueId) => {
    set({ activeIssueId: issueId });
    
    // Scroll to the issue in the document
    if (issueId) {
      setTimeout(() => {
        const issueElement = document.querySelector(`[data-issue-id="${issueId}"]`);
        if (issueElement) {
          issueElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          console.log(`📍 Scrolled to issue: ${issueId}`);
        } else {
          console.warn(`⚠️ Could not find element for issue: ${issueId}`);
        }
      }, 100); // Small delay to ensure DOM is updated
    }
  },

  // Toggle issue highlighting
  toggleIssueHighlighting: () => {
    set(state => {
      const newState = !state.showIssueHighlighting;
      console.log('🔄 Store: Toggling issue highlighting from', state.showIssueHighlighting, 'to', newState);
      return { showIssueHighlighting: newState };
    });
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

  // Editor management functions
  setEditorContent: (content) => {
    set({ 
      editorContent: content, 
      editorChanged: true 
    });
  },


  // Convert editor content back to text for analysis
  getTextFromEditorContent: (editorContent) => {
    if (!editorContent || !Array.isArray(editorContent)) return '';
    
    return editorContent.map(node => {
      if (node.children) {
        return node.children.map(child => child.text || '').join('');
      }
      return node.text || '';
    }).join('\n');
  },

  // Real-time analysis for editor changes
  analyzeEditorContent: async (editorContent, preservedFormatting = null) => {
    if (!editorContent) return { success: false, error: 'No editor content' };
    
    const { documentHtml, documentFormatting, documentStructure, documentStyles } = get();
    
    // Use preserved formatting if provided, otherwise fall back to stored formatting
    const formattingToUse = preservedFormatting || documentFormatting;
    
    try {
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: true,
          lastError: null,
          stage: 'Analyzing edited content...'
        }
      }));

      // Convert editor content to text
      const text = get().getTextFromEditorContent(editorContent);
      
      if (!text || text.trim().length < 10) {
        set(state => ({
          issues: [],
          analysisScore: 100,
          processingState: {
            ...state.processingState,
            isAnalyzing: false,
            stage: null
          }
        }));
        return { success: true, issueCount: 0 };
      }

      // Create comprehensive document data object
      const documentData = {
        text: text,
        html: documentHtml,
        formatting: formattingToUse, // Use preserved formatting
        structure: documentStructure,
        styles: documentStyles
      };

      console.log('📊 Analysis using formatting data:', {
        hasFormatting: !!formattingToUse,
        formattingSource: preservedFormatting ? 'preserved' : 'stored',
        paragraphCount: formattingToUse?.paragraphs?.length || 0
      });

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

      let analysisScore;
      if (formattingToUse?.compliance?.overall !== undefined) {
        const contentPenalty = criticalCount * 10 + majorCount * 5 + minorCount * 2;
        analysisScore = Math.max(0, Math.min(100, 
          Math.round(formattingToUse.compliance.overall - contentPenalty)
        ));
      } else {
        analysisScore = Math.max(0, Math.min(100, 
          Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))
        ));
      }

      // Update stats from editor content
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      const paragraphs = text.split('\n').filter(p => p.trim().length > 0).length;

      set(state => ({
        // Don't update documentText to avoid triggering editor regeneration
        issues,
        analysisScore,
        documentStats: {
          ...state.documentStats,
          wordCount: words,
          charCount: chars,
          paragraphCount: paragraphs
        },
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          stage: null
        },
        editorChanged: false // Reset change flag
      }));

      console.log(`✅ Editor content analysis complete: ${issues.length} issues`);
      
      return { 
        success: true, 
        issueCount: issues.length,
        score: analysisScore,
        breakdown: { criticalCount, majorCount, minorCount }
      };

    } catch (error) {
      console.error('❌ Error analyzing editor content:', error);
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          lastError: error.message || 'Editor content analysis failed',
          stage: null
        }
      }));

      return { success: false, error: error.message };
    }
  },

  // Helper method: Convert text to title case
  convertToTitleCase: (text) => {
    const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 
                       'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with'];
    
    return text.split(' ').map((word, index, array) => {
      const isFirstOrLast = index === 0 || index === array.length - 1;
      const lowerWord = word.toLowerCase();
      
      if (isFirstOrLast || !smallWords.includes(lowerWord)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return lowerWord;
    }).join(' ');
  },
  
  // Helper method: Convert text to sentence case
  convertToSentenceCase: (text) => {
    // Keep first letter capitalized, rest lowercase except proper nouns/acronyms
    return text.charAt(0).toUpperCase() + 
           text.slice(1).toLowerCase()
               .replace(/\b[A-Z]{2,}\b/g, match => match) // Keep acronyms
               .replace(/:\s*([a-z])/g, (match, letter) => ': ' + letter.toUpperCase()); // Capitalize after colon
  },
  
  // Helper method: Sort references section alphabetically
  sortReferencesSection: (referencesText) => {
    // Parse individual references
    const entries = [];
    const lines = referencesText.split('\n');
    let currentEntry = '';
    
    lines.forEach(line => {
      if (line.trim() && /^[A-Z]/.test(line.trim()) && currentEntry) {
        entries.push(currentEntry.trim());
        currentEntry = line;
      } else if (line.trim()) {
        currentEntry += (currentEntry ? ' ' : '') + line;
      }
    });
    
    if (currentEntry) {
      entries.push(currentEntry.trim());
    }
    
    // Sort alphabetically by first author's surname
    entries.sort((a, b) => {
      const authorA = a.match(/^([A-Z][a-zA-Z'-]+)/)?.[1] || '';
      const authorB = b.match(/^([A-Z][a-zA-Z'-]+)/)?.[1] || '';
      return authorA.localeCompare(authorB);
    });
    
    return entries.join('\n\n');
  },

  // Export document
  exportDocument: async (format) => {
    const { documentHtml, documentName, currentDocumentBuffer } = get();
    
    if (!documentHtml) {
      alert('No document to export');
      return false;
    }
    
    try {
      if (format === 'html') {
        // HTML export
        const fullHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Document Export</title>
            <style>
              body { 
                font-family: "Times New Roman", Times, serif; 
                font-size: 12pt; 
                line-height: 1.5; 
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
      } else if (format === 'docx' && currentDocumentBuffer) {
        // DOCX export - use the modified buffer
        const blob = new Blob([currentDocumentBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = documentName ? 
          documentName.replace('.docx', '_APA_fixed.docx') : 
          'apa_fixed_document.docx';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
      } else {
        throw new Error('Unsupported export format or missing document buffer');
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}));