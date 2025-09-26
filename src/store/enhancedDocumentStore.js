'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Import the enhanced APA analyzer
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';
import { getUserFriendlyMessage, handleApiError, formatErrorForLogging } from '@/utils/errorHandler';

// Simple event emitter for internal store communication
class StoreEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return cleanup function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  clear() {
    this.listeners.clear();
  }
}

// Global store event emitter
const storeEvents = new StoreEventEmitter();

// Utility functions for secure data handling
const DataUtils = {
  // Simple compression using browser-native compression
  async compressBuffer(buffer) {
    try {
      if (typeof CompressionStream !== 'undefined') {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        const chunks = [];
        const readPromise = (async () => {
          let result;
          while (!(result = await reader.read()).done) {
            chunks.push(result.value);
          }
        })();

        await writer.write(buffer);
        await writer.close();
        await readPromise;

        // Combine chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const compressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        console.log(`📦 Buffer compressed: ${buffer.length} → ${compressed.length} bytes (${Math.round((1 - compressed.length / buffer.length) * 100)}% reduction)`);
        return compressed;
      } else {
        // Fallback: return original buffer if compression not available
        console.warn('⚠️ Compression not available, storing buffer as-is');
        return buffer;
      }
    } catch (error) {
      console.warn('⚠️ Compression failed, storing buffer as-is:', error);
      return buffer;
    }
  },

  // Decompression
  async decompressBuffer(compressedBuffer) {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        const chunks = [];
        const readPromise = (async () => {
          let result;
          while (!(result = await reader.read()).done) {
            chunks.push(result.value);
          }
        })();

        await writer.write(compressedBuffer);
        await writer.close();
        await readPromise;

        // Combine chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const decompressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return decompressed;
      } else {
        // Assume buffer is not compressed
        return compressedBuffer;
      }
    } catch (error) {
      console.warn('⚠️ Decompression failed, using buffer as-is:', error);
      return compressedBuffer;
    }
  },

  // Clear sensitive data from memory (best effort)
  clearBuffer(buffer) {
    if (buffer && buffer.fill) {
      buffer.fill(0); // Overwrite with zeros
    }
  }
};

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
  isBufferCompressed: false,    // Track if buffers are compressed

  // Fix application state to prevent race conditions
  fixInProgress: false,
  fixQueue: [], // Queue of pending fixes

  // Document history for undo/rollback functionality
  documentHistory: [],
  maxHistorySize: 10, // Keep last 10 states
  canUndo: false,

  // Event emitter for component communication
  events: storeEvents,
  
  // Editor state
  editorContent: null,      // Tiptap editor content (JSON)
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
      
      // Store the original file buffer for fixes with compression
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);

      // Compress buffer for secure storage
      const compressedBuffer = await DataUtils.compressBuffer(uint8Array);

      // Clear original buffer from memory for security
      DataUtils.clearBuffer(uint8Array);
      
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
      
      // Send to server for processing with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000); // 2 minute timeout for document upload/processing

      const response = await fetch(`${SERVER_URL}/api/upload-docx`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header - let browser set it with boundary
      });

      clearTimeout(timeoutId); // Clear timeout on successful response
      
      set({
        processingState: {
          ...get().processingState,
          progress: 60,
          stage: 'Processing document...'
        }
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        const userMessage = getUserFriendlyMessage(errorData);
        console.error('Upload error:', formatErrorForLogging(errorData, 'uploadDocument'));
        throw new Error(userMessage);
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
        originalDocumentBuffer: compressedBuffer, // Store compressed buffer
        currentDocumentBuffer: compressedBuffer,  // Initialize current buffer same as original
        isBufferCompressed: true, // Track compression state
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

      // Handle specific error types
      let errorMessage = error.message || 'Failed to process document';
      if (error.name === 'AbortError') {
        errorMessage = 'Upload timed out after 2 minutes. Please try again with a smaller document or check your internet connection.';
      } else if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      }

      set(state => ({
        processingState: {
          ...state.processingState,
          isUploading: false,
          isAnalyzing: false,         // Also reset analysis state if stuck
          isApplyingFix: false,       // Also reset fix state if stuck
          lastError: errorMessage,
          progress: 0,
          stage: null,
          currentFixId: null
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


      // Use enhanced analyzer with rich document data (with timeout protection)
      const analysisResults = await new Promise((resolve, reject) => {
        // Set up timeout protection (30 seconds for large documents)
        const timeoutId = setTimeout(() => {
          reject(new Error('Document analysis timed out after 30 seconds. Please try again with a smaller document.'));
        }, 30000);

        // Clear timeout on completion
        const cleanup = () => clearTimeout(timeoutId);

        setTimeout(() => {
          try {
            const analyzer = EnhancedAPAAnalyzer.createDefault();
            const results = analyzer.analyzeDocument(documentData);
            cleanup();
            resolve(results);
          } catch (error) {
            cleanup();
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

      // Ensure we always reset the processing state on error
      set(state => ({
        issues: [],
        analysisScore: null,
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          isSchedulingAnalysis: false,
          isUploading: false,       // Also reset upload state if stuck
          isApplyingFix: false,     // Also reset fix state if stuck
          progress: 0,              // Reset progress
          currentFixId: null,       // Clear current fix
          lastError: error.message || 'Document analysis failed',
          stage: null
        }
      }));

      // Clear any fix queue that might be stuck
      set(state => ({
        fixInProgress: false,
        fixQueue: []
      }));

      return { success: false, error: error.message || 'Document analysis failed' };
    } finally {
      // Ensure we always clean up the analyzing state even if error handling fails
      const currentState = get();
      if (currentState.processingState.isAnalyzing) {
        console.warn('⚠️ Forcing cleanup of stuck analysis state');
        set(state => ({
          processingState: {
            ...state.processingState,
            isAnalyzing: false,
            isSchedulingAnalysis: false,
            stage: null
          }
        }));
      }
    }
  },
  
  // Auto-analyze after upload
  analyzeDocumentDebounced: async () => {
    // For server-side processing, we can analyze immediately since processing is faster
    return await get().analyzeDocument();
  },

  // Real-time analysis with debouncing for performance
  _realtimeAnalysisTimeout: null,
  _lastAnalysisContent: null,

  analyzeDocumentRealtime: async (editorContent, options = {}) => {
    const {
      debounceMs = 2000, // 2 second debounce
      minChangeThreshold = 50, // Minimum characters changed
      force = false
    } = options;

    const state = get();

    // Skip if analysis is already in progress
    if (state.processingState.isAnalyzing && !force) {
      console.log('⏳ Analysis already in progress, skipping realtime analysis');
      return;
    }

    // Content-based throttling
    const currentContent = JSON.stringify(editorContent);
    if (!force && state._lastAnalysisContent) {
      const contentDiff = Math.abs(currentContent.length - state._lastAnalysisContent.length);
      if (contentDiff < minChangeThreshold) {
        console.log(`⏭️ Content change too small (${contentDiff} chars), skipping analysis`);
        return;
      }
    }

    // Clear existing timeout
    if (state._realtimeAnalysisTimeout) {
      clearTimeout(state._realtimeAnalysisTimeout);
    }

    // Set new debounced timeout
    const timeoutId = setTimeout(async () => {
      try {
        console.log('🔍 Running debounced real-time analysis...');

        // Update the last analyzed content
        set({ _lastAnalysisContent: currentContent });

        // Run analysis only if content has changed significantly
        const result = await get().analyzeDocument();

        if (result.success) {
          console.log(`✅ Real-time analysis completed: ${result.issueCount} issues found`);
        }
      } catch (error) {
        console.error('❌ Real-time analysis failed:', error);
      }
    }, debounceMs);

    // Store timeout ID for cleanup
    set({ _realtimeAnalysisTimeout: timeoutId });
  },

  // Cancel pending real-time analysis
  cancelRealtimeAnalysis: () => {
    const state = get();
    if (state._realtimeAnalysisTimeout) {
      clearTimeout(state._realtimeAnalysisTimeout);
      set({ _realtimeAnalysisTimeout: null });
      console.log('🚫 Real-time analysis cancelled');
    }
  },
  
  // Enhanced fix application with document regeneration
  applyFix: async (issueId) => {
    const state = get();

    // Check if another fix is in progress (mutex protection)
    if (state.fixInProgress) {
      console.log(`Fix already in progress, queueing fix for issue ${issueId}`);

      // Add to queue and return promise that resolves when processed
      return new Promise((resolve) => {
        set(currentState => ({
          fixQueue: [...currentState.fixQueue, { issueId, resolve }]
        }));
      });
    }

    // Set fix in progress to prevent race conditions
    set(currentState => ({
      fixInProgress: true,
      processingState: {
        ...currentState.processingState,
        isApplyingFix: true,
        currentFixId: issueId,
        stage: `Applying fix: ${issueId}`
      }
    }));

    try {
      return await get()._executeFixInternal(issueId);
    } finally {
      // Process next fix in queue
      await get()._processFixQueue();
    }
  },

  // Internal fix execution (separated for queue processing)
  _executeFixInternal: async (issueId) => {
    const { issues, documentHtml, documentText, documentFormatting } = get();
    const issue = issues.find(i => i.id === issueId);

    if (!issue || !issue.hasFix) {
      return false;
    }

    set(state => ({
      processingState: {
        ...state.processingState,
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

        // Save current state before applying fix for undo functionality
        get().saveDocumentState();

        // Apply fix directly to current editor content (no server involved)
        const success = await get().applyClientSideFix(issue, issueId);
        
        return success;
        
      } else if (serverFormattingFixes.includes(issue.fixAction)) {
        console.log(`🔄 Regenerating document with fix: ${issue.fixAction}`);

        // Save current state before applying fix for undo functionality
        get().saveDocumentState();

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

  // Process queued fixes (called after fix completion)
  _processFixQueue: async () => {
    const { fixQueue } = get();

    // Clear the current fix in progress flag
    set(state => ({
      fixInProgress: false
    }));

    // Process next fix in queue if any
    if (fixQueue.length > 0) {
      const nextFix = fixQueue[0];

      // Remove from queue
      set(state => ({
        fixQueue: state.fixQueue.slice(1)
      }));

      // Execute the queued fix
      try {
        const result = await get().applyFix(nextFix.issueId);
        nextFix.resolve(result);
      } catch (error) {
        console.error('Error processing queued fix:', error);
        nextFix.resolve(false);
      }
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
          // Remove comma before et al. (APA 7th doesn't use comma)
          replacementText = issue.text.replace(/\(([^,)]+),\s+et\s+al\.,\s*(\d{4})\)/g, '($1 et al., $2)');
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
        
        // Signal to DocumentEditor to apply the text replacement using store events
        get().events.emit('applyTextReplacement', {
          originalText: issue.text,
          replacementText: replacementText,
          issueId: issueId
        });
        
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
            // Fix et al. formatting: Remove comma before et al. (APA 7th edition)
            // (Smith, et al., 2021) → (Smith et al., 2021)
            const fixedText = issue.text.replace(
              /\(([^,)]+),\s+et\s+al\.,\s*(\d{4})\)/g, 
              '($1 et al., $2)'
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
    
    const { currentDocumentBuffer, documentName, isBufferCompressed } = get();
    
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
            // Remove comma before et al. per APA 7th edition
            const fixedText = issue.text.replace(/\(([^,)]+),\s+et\s+al\.,\s*(\d{4})\)/g, '($1 et al., $2)');
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
      
      // Decompress buffer if it's compressed before sending to server
      let bufferToProcess = currentDocumentBuffer;
      if (isBufferCompressed) {
        console.log('🗜️ Decompressing buffer before sending to server...');
        try {
          bufferToProcess = await DataUtils.decompressBuffer(currentDocumentBuffer);
          console.log(`✅ Buffer decompressed: ${currentDocumentBuffer.length} -> ${bufferToProcess.length} bytes`);
        } catch (decompError) {
          console.error('❌ Failed to decompress buffer:', decompError);
          throw new Error('Failed to decompress document buffer for processing');
        }
      }

      // Convert Uint8Array to base64 for JSON transport with error handling
      let base64Buffer;
      try {
        // Always use chunked processing to prevent call stack overflow
        // This approach is safe for all buffer sizes
        let binaryString = '';
        const chunkSize = 8192; // 8KB chunks to prevent call stack issues

        for (let i = 0; i < bufferToProcess.length; i += chunkSize) {
          const chunk = bufferToProcess.slice(i, i + chunkSize);
          // Use apply with smaller chunks to avoid call stack overflow
          binaryString += String.fromCharCode.apply(null, chunk);
        }

        base64Buffer = btoa(binaryString);
        console.log(`✅ Buffer conversion successful: ${bufferToProcess.length} bytes processed in chunks`);

      } catch (bufferError) {
        console.error('Error converting buffer to base64:', bufferError);

        // Fallback to even smaller chunks if first attempt fails
        try {
          console.log('Retrying with smaller chunks...');
          let binaryString = '';
          const smallerChunkSize = 1024; // 1KB chunks as fallback

          for (let i = 0; i < bufferToProcess.length; i += smallerChunkSize) {
            const chunk = bufferToProcess.slice(i, i + smallerChunkSize);
            binaryString += String.fromCharCode.apply(null, chunk);
          }

          base64Buffer = btoa(binaryString);
          console.log(`✅ Buffer conversion successful with smaller chunks: ${bufferToProcess.length} bytes`);

        } catch (secondError) {
          console.error('Buffer conversion failed even with small chunks:', secondError);
          throw new Error(`Failed to convert document buffer: ${secondError.message}`);
        }
      }
      
      // Send fix request to server with document buffer
      console.log('🚀 Sending fix request to server:', {
        fixAction: issue.fixAction,
        fixValue: fixValue,
        fixValueType: typeof fixValue,
        bufferSize: base64Buffer.length,
        filename: documentName
      });

      // Add timeout protection for server API calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000); // 60 second timeout for fix operations

      try {
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
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear timeout on successful response

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
        
        const userMessage = getUserFriendlyMessage(errorData);
        console.error('Fix application error:', formatErrorForLogging(errorData, 'applyFormattingFix'));
        throw new Error(userMessage);
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
      
      // Convert the returned buffer back to Uint8Array for next iteration with validation
      let updatedBuffer = null;
      if (result.modifiedDocumentBuffer) {
        try {
          const binaryString = atob(result.modifiedDocumentBuffer);
          if (!binaryString || binaryString.length === 0) {
            throw new Error('Decoded buffer is empty');
          }
          const decodedBuffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            decodedBuffer[i] = binaryString.charCodeAt(i);
          }
          // Validate the buffer is a valid DOCX (starts with PK)
          if (decodedBuffer[0] !== 0x50 || decodedBuffer[1] !== 0x4B) {
            console.warn('Warning: Modified buffer may not be a valid DOCX file');
          }

          // Compress the updated buffer for secure storage
          if (isBufferCompressed) {
            console.log('🗜️ Compressing updated buffer for storage...');
            try {
              updatedBuffer = await DataUtils.compressBuffer(decodedBuffer);
              console.log(`✅ Updated buffer compressed: ${decodedBuffer.length} -> ${updatedBuffer.length} bytes`);

              // Clear the uncompressed buffer from memory
              DataUtils.clearBuffer(decodedBuffer);
            } catch (compError) {
              console.error('❌ Failed to compress updated buffer:', compError);
              // Fall back to uncompressed storage
              updatedBuffer = decodedBuffer;
            }
          } else {
            updatedBuffer = decodedBuffer;
          }
        } catch (decodeError) {
          console.error('Error decoding modified buffer:', decodeError);
          // Use original buffer if decode fails
          updatedBuffer = currentDocumentBuffer;
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

      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Fetch request failed:', fetchError);

        // Handle fetch-specific errors
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 60 seconds. Please try again or contact support if the issue persists.');
        } else {
          throw fetchError; // Re-throw other fetch errors
        }
      }

    } catch (error) {
      console.error('Error applying memory-based formatting fix:', error);

      // Handle specific error types
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out after 60 seconds. Please try again or contact support if the issue persists.';
      } else if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // Document history management for undo/rollback functionality
  saveDocumentState: () => {
    const state = get();

    // Create a snapshot of the current document state
    const snapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      documentHtml: state.documentHtml,
      documentText: state.documentText,
      documentFormatting: state.documentFormatting,
      documentStructure: state.documentStructure,
      documentStyles: state.documentStyles,
      currentDocumentBuffer: state.currentDocumentBuffer,
      issues: [...state.issues], // Deep copy of issues
      analysisScore: state.analysisScore,
      documentStats: { ...state.documentStats },
      complianceDetails: state.complianceDetails ? { ...state.complianceDetails } : null,
      description: `Saved at ${new Date().toLocaleTimeString()}`
    };

    // Add to history and maintain max size
    set(currentState => {
      const newHistory = [...currentState.documentHistory, snapshot];

      // Keep only the last maxHistorySize states
      if (newHistory.length > currentState.maxHistorySize) {
        // Remove the oldest states
        const statesToRemove = newHistory.length - currentState.maxHistorySize;
        newHistory.splice(0, statesToRemove);
      }

      return {
        documentHistory: newHistory,
        canUndo: newHistory.length > 0
      };
    });

    console.log(`📄 Document state saved to history (${state.documentHistory.length + 1}/${state.maxHistorySize})`);
  },

  // Restore document to a previous state
  undoLastChange: () => {
    const state = get();

    if (state.documentHistory.length === 0) {
      console.warn('⚠️ No previous states to undo to');
      return false;
    }

    // Get the most recent state
    const previousState = state.documentHistory[state.documentHistory.length - 1];
    const remainingHistory = state.documentHistory.slice(0, -1);

    console.log(`🔄 Undoing to state: ${previousState.description}`);

    // Restore the document state
    set({
      documentHtml: previousState.documentHtml,
      documentText: previousState.documentText,
      documentFormatting: previousState.documentFormatting,
      documentStructure: previousState.documentStructure,
      documentStyles: previousState.documentStyles,
      currentDocumentBuffer: previousState.currentDocumentBuffer,
      issues: previousState.issues,
      analysisScore: previousState.analysisScore,
      documentStats: previousState.documentStats,
      complianceDetails: previousState.complianceDetails,
      documentHistory: remainingHistory,
      canUndo: remainingHistory.length > 0,
      activeIssueId: null, // Clear active issue
      lastFixAppliedAt: Date.now() // Trigger re-render
    });

    // Emit event for UI components
    get().events.emit('documentRestored', {
      restoredStateId: previousState.id,
      timestamp: previousState.timestamp,
      description: previousState.description
    });

    return true;
  },

  // Clear document history
  clearHistory: () => {
    set({
      documentHistory: [],
      canUndo: false
    });
    console.log('🗑️ Document history cleared');
  },

  // Get history summary for UI
  getHistorySummary: () => {
    const state = get();
    return state.documentHistory.map((snapshot, index) => ({
      id: snapshot.id,
      index: index,
      timestamp: snapshot.timestamp,
      description: snapshot.description,
      issueCount: snapshot.issues.length,
      score: snapshot.analysisScore
    }));
  },

  // Set active issue and trigger re-highlighting
  setActiveIssue: (issueId) => {
    const prevActiveId = get().activeIssueId;
    set({ activeIssueId: issueId });
    
    // If the active issue changed, trigger re-highlighting
    if (prevActiveId !== issueId) {
      console.log(`🎯 Active issue changed from ${prevActiveId} to ${issueId}`);
      
      // Emit event to trigger re-highlighting in DocumentEditor using store events
      get().events.emit('activeIssueChanged', {
        previousId: prevActiveId,
        currentId: issueId
      });
    }
    
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
      }, 200); // Small delay to ensure DOM is updated after highlighting
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


  // Convert Tiptap editor content back to text for analysis
  getTextFromEditorContent: (editorContent) => {
    if (!editorContent) return '';
    
    // Handle Tiptap JSON format
    const extractText = (node) => {
      if (node.type === 'text') {
        return node.text || '';
      }
      
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(child => extractText(child)).join('');
      }
      
      return '';
    };
    
    // If it's a Tiptap document
    if (editorContent.type === 'doc' && editorContent.content) {
      return editorContent.content.map(node => extractText(node)).join('\n');
    }
    
    // Fallback for array format (legacy)
    if (Array.isArray(editorContent)) {
      return editorContent.map(node => extractText(node)).join('\n');
    }
    
    return extractText(editorContent);
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
            const analyzer = EnhancedAPAAnalyzer.createDefault();
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
  },

  // Load document data from database into the store
  loadDocumentFromData: async (documentData) => {
    try {
      if (!documentData) {
        throw new Error('No document data provided');
      }

      console.log('loadDocumentFromData received:', documentData);
      console.log('Document fields:', {
        name: documentData.name,
        hasProcessedContent: !!documentData.processed_content,
        hasOriginalContent: !!documentData.original_content,
        processedContentLength: documentData.processed_content?.length,
        originalContentLength: documentData.original_content?.length,
        hasFormattingData: !!documentData.formatting_data,
        issuesCount: documentData.issues?.length || 0
      });

      const contentText = documentData.processed_content || documentData.original_content || '';

      if (!contentText) {
        console.warn('No document content found!');
      }

      // Set basic document information
      set({
        documentName: documentData.name,
        documentText: contentText,
        documentHtml: contentText, // For now, use same content for HTML
        documentFormatting: documentData.formatting_data || {},
        issues: documentData.issues || [],
        processingState: {
          isUploading: false,
          isAnalyzing: false,
          isApplyingFix: false,
          progress: 100,
          stage: 'Document loaded',
          lastError: null,
          currentFixId: null,
          isSchedulingAnalysis: false
        }
      });

      console.log('Document state updated in store');

      // Verify the state was actually set
      const newState = get();
      console.log('Store state after setting:', {
        hasDocumentText: !!newState.documentText,
        documentTextLength: newState.documentText?.length || 0,
        documentName: newState.documentName,
        firstChars: newState.documentText?.substring(0, 50) || 'No content'
      });

      // Calculate stats if we have text
      const text = documentData.processed_content || documentData.original_content || '';
      if (text) {
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const chars = text.length;
        const paragraphs = text.split(/\n\s*\n/).length;

        set(state => ({
          documentStats: {
            ...state.documentStats,
            wordCount: words,
            charCount: chars,
            paragraphCount: paragraphs
          }
        }));
      }

      console.log('Document loaded from data:', documentData.name);
      return true;

    } catch (error) {
      console.error('Error loading document from data:', error);
      set({
        processingState: {
          isUploading: false,
          isAnalyzing: false,
          isApplyingFix: false,
          progress: 0,
          stage: null,
          lastError: error.message,
          currentFixId: null,
          isSchedulingAnalysis: false
        }
      });
      return false;
    }
  },

  // Cleanup function to clear all event listeners
  clearEventListeners: () => {
    const state = get();
    if (state.events) {
      state.events.clear();
      console.log('🧹 All event listeners cleared');
    }
  },

  // Reset store with proper cleanup
  resetStore: () => {
    const state = get();

    // Clear event listeners first
    if (state.events) {
      state.events.clear();
    }

    // Clear sensitive buffers from memory before reset
    if (state.originalDocumentBuffer) {
      DataUtils.clearBuffer(state.originalDocumentBuffer);
    }
    if (state.currentDocumentBuffer && state.currentDocumentBuffer !== state.originalDocumentBuffer) {
      DataUtils.clearBuffer(state.currentDocumentBuffer);
    }

    // Cancel any pending real-time analysis
    if (state._realtimeAnalysisTimeout) {
      clearTimeout(state._realtimeAnalysisTimeout);
    }

    // Reset all state
    set({
      documentText: null,
      documentHtml: null,
      documentName: null,
      documentFormatting: null,
      documentStructure: null,
      documentStyles: null,
      originalDocumentBuffer: null,
      currentDocumentBuffer: null,
      isBufferCompressed: false,
      documentHistory: [],
      canUndo: false,
      fixInProgress: false,
      fixQueue: [],
      _realtimeAnalysisTimeout: null,
      _lastAnalysisContent: null,
      editorContent: null,
      editorChanged: false,
      documentStats: {
        wordCount: 0,
        charCount: 0,
        paragraphCount: 0,
        processingTime: 0
      },
      issues: [],
      analysisScore: 0,
      activeIssueId: null,
      showIssueHighlighting: true,
      processingState: {
        isUploading: false,
        isAnalyzing: false,
        isApplyingFix: false,
        progress: 0,
        stage: null,
        lastError: null,
        currentFixId: null
      },
      lastFixAppliedAt: null,
      complianceDetails: null,
      events: storeEvents // Preserve the event emitter instance
    });

    console.log('📄 Document store reset complete with event cleanup');
  }
}));