'use client';

import { create } from 'zustand';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

// Import our APA analysis rules
import { analyzeAPAGuidelines } from '@/utils/apaAnalyzer';

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create a debounced analysis function outside the store to maintain the timeout reference
let debouncedAnalysisTimeout;
const createDebouncedAnalysis = (analyzeFunction, delay = 1000) => {
  return () => {
    return new Promise((resolve, reject) => {
      if (debouncedAnalysisTimeout) {
        clearTimeout(debouncedAnalysisTimeout);
      }
      
      debouncedAnalysisTimeout = setTimeout(async () => {
        try {
          const result = await analyzeFunction();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
};

export const useDocumentStore = create((set, get) => ({
  // Document state
  documentText: null,
  documentHtml: null,
  documentName: null,
  documentStats: {
    wordCount: 0,
    charCount: 0
  },
  
  // Issues and analysis state
  issues: [],
  activeIssueId: null,
  analysisScore: null,
  
  // Analysis settings
  analysisSettings: {
    debounceDelay: 1500, // milliseconds
    autoAnalyze: true,   // whether to auto-analyze on document changes
  },
  
  // Export functionality
  exportDocument: async (format = 'html') => {
    const { documentHtml, documentName } = get();
    
    if (!documentHtml) {
      alert('No document to export');
      return false;
    }
    
    try {
      if (format === 'docx') {
        return await get().exportDocx();
      } else {
        return await get().exportHtml();
      }
    } catch (error) {
      console.error('Error exporting document:', error);
      alert('Failed to export document. Please try again.');
      return false;
    }
  },

  // Export as HTML
  exportHtml: () => {
    const { documentHtml, documentName } = get();
    
    try {
      // Create a full HTML document with proper styling
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>APA Formatted Document</title>
          <style>
            body {
              font-family: "Times New Roman", Times, serif;
              font-size: 12pt;
              line-height: 2;
              margin: 1in;
            }
            p {
              text-indent: 0.5in;
              margin-top: 0;
              margin-bottom: 0;
            }
            h1, h2, h3, h4, h5 {
              font-weight: bold;
              margin-top: 1em;
              margin-bottom: 1em;
            }
            .title-page {
              text-align: center;
              margin-bottom: 2em;
            }
            .abstract {
              margin-bottom: 2em;
            }
            .abstract h2 {
              text-align: center;
            }
            .references h2 {
              text-align: center;
            }
            .references p {
              text-indent: 0;
              padding-left: 0.5in;
              text-indent: -0.5in;
              margin-bottom: 1em;
            }
          </style>
        </head>
        <body>
          ${documentHtml}
        </body>
        </html>
      `;
      
      // Create a blob from the HTML
      const blob = new Blob([fullHtml], { type: 'text/html' });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName ? 
        documentName.replace('.docx', '_APA_formatted.html') : 
        'apa_formatted_document.html';
      
      // Append to the body, click and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Release the URL
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting HTML document:', error);
      throw error;
    }
  },

  // Export as DOCX
  exportDocx: async () => {
    const { documentHtml, documentName } = get();
    
    try {
      // Dynamically import html-to-docx
      const { default: HTMLtoDOCX } = await import('html-to-docx');
      
      // Clean up the HTML and prepare for DOCX conversion
      const cleanHtml = documentHtml
        // Remove any existing mark elements (issue highlights)
        .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
        // Clean up any data attributes
        .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
        // Remove any onclick or other event handlers
        .replace(/\s*on[a-z]+="[^"]*"/gi, '');
      
      // Create the full document with APA styling
      const styledHtml = `
        <html>
        <head>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 2.0;
              margin: 1in;
            }
            p {
              text-indent: 0.5in;
              margin-top: 0;
              margin-bottom: 0;
            }
            h1, h2, h3, h4, h5, h6 {
              font-weight: bold;
              margin-top: 12pt;
              margin-bottom: 12pt;
              text-align: left;
            }
            h1 {
              text-align: center;
              font-size: 12pt;
            }
            h2 {
              text-align: center;
              font-size: 12pt;
            }
            .title-page {
              text-align: center;
              margin-bottom: 24pt;
            }
            .abstract {
              margin-bottom: 24pt;
            }
            .abstract h2 {
              text-align: center;
            }
            .references h2 {
              text-align: center;
            }
            .references p {
              text-indent: -0.5in;
              padding-left: 0.5in;
              margin-bottom: 12pt;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 12pt 0;
            }
            td, th {
              border: 1pt solid black;
              padding: 6pt;
              text-align: left;
            }
            th {
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .page-break {
              page-break-before: always;
            }
          </style>
        </head>
        <body>
          ${cleanHtml}
        </body>
        </html>
      `;
      
      // Configure conversion options
      const options = {
        orientation: 'portrait',
        margins: {
          top: 1440, // 1 inch in twips (1440 twips = 1 inch)
          right: 1440,
          bottom: 1440,
          left: 1440
        },
        title: documentName ? documentName.replace('.docx', '') : 'APA Formatted Document',
        creator: 'APA 7th Edition Document Checker',
        description: 'Document formatted according to APA 7th edition guidelines'
      };
      
      // Convert HTML to DOCX
      const docxBuffer = await HTMLtoDOCX(styledHtml, null, options);
      
      // Create a blob from the buffer
      const blob = new Blob([docxBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName ? 
        documentName.replace('.docx', '_APA_formatted.docx') : 
        'apa_formatted_document.docx';
      
      // Append to the body, click and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Release the URL
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting DOCX document:', error);
      throw error;
    }
  },
  
  // Document processing status
  processingState: {
    isUploading: false,
    isAnalyzing: false,
    isApplyingFix: false,
    lastError: null,
    progress: 0,
    currentFixId: null,
    isSchedulingAnalysis: false, // for debounced analysis feedback
    analysisScheduledAt: null    // timestamp when analysis was scheduled
  },
  
  // Upload a document and convert it to HTML
  uploadDocument: async (file) => {
    try {
      // Set processing state
      set({
        processingState: {
          ...get().processingState,
          isUploading: true,
          lastError: null,
          progress: 10
        }
      });
      
      console.log('Upload document started for file:', file.name);
      // Update document name first for better UX feedback
      set({ documentName: file.name });
      
      // Read the file
      const arrayBuffer = await file.arrayBuffer();
      console.log('File read as array buffer');
      
      // Update progress
      set({
        processingState: {
          ...get().processingState,
          progress: 30
        }
      });
      
      // Convert docx to HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      console.log('HTML conversion complete, length:', html?.length);
      
      // Update progress
      set({
        processingState: {
          ...get().processingState,
          progress: 60
        }
      });
      
      // Extract text (for analysis)
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const text = textResult.value;
      console.log('Text extraction complete, length:', text?.length);
      
      // Check that we have valid content before proceeding
      if (!html || !text) {
        throw new Error('Failed to extract content from document');
      }
      
      // Calculate stats
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      
      // Update progress
      set({
        processingState: {
          ...get().processingState,
          progress: 90
        }
      });
      
      // Update state in a single batch for consistency
      console.log('Updating document store state with HTML and text');
      set(state => ({
        documentHtml: html,
        documentText: text,
        documentStats: {
          wordCount: words,
          charCount: chars
        },
        issues: [], // Clear previous issues
        activeIssueId: null,
        processingState: {
          ...state.processingState,
          isUploading: false,
          progress: 100
        }
      }));
      
      console.log('Document store state updated successfully');
      return true;
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Set error state but don't clear existing document if there is one
      set(state => ({
        processingState: {
          ...state.processingState,
          isUploading: false,
          lastError: error.message || 'Failed to process document',
          progress: 0
        }
      }));
      
      return false;
    }
  },
  
  // Analyze the document for APA issues
  analyzeDocument: async () => {
    const { documentText, documentHtml } = get();
    
    if (!documentText) {
      console.warn('Cannot analyze document: No document text available');
      return;
    }
    
    try {
      // Update state to indicate analysis has started
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: true,
          lastError: null
        }
      }));
      
      // Run our APA analysis (wrapped in Promise for better error handling)
      const analysisResults = await new Promise((resolve, reject) => {
        try {
          // Use setTimeout to prevent UI freeze during analysis
          setTimeout(() => {
            try {
              const results = analyzeAPAGuidelines(documentText || '', documentHtml || '');
              resolve(results);
            } catch (error) {
              reject(error);
            }
          }, 0);
        } catch (error) {
          reject(error);
        }
      });
      
      // Map results to our issues format
      const issues = analysisResults.map(issue => ({
        id: uuidv4(),
        title: issue.title,
        description: issue.description,
        text: issue.text,
        severity: issue.severity,
        location: issue.location,
        hasFix: issue.hasFix,
        fixAction: issue.fixAction,
        explanation: issue.explanation || issue.description // Include explanation for tooltips
      }));
      
      // Calculate compliance score (weighted by severity)
      const criticalCount = issues.filter(i => i.severity === 'Critical').length;
      const majorCount = issues.filter(i => i.severity === 'Major').length;
      const minorCount = issues.filter(i => i.severity === 'Minor').length;
      
      const totalIssues = criticalCount + majorCount + minorCount;
      const analysisScore = totalIssues === 0 
        ? 100 
        : Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 5 + majorCount * 3 + minorCount))));
      
      // Update state in a single batch
      set(state => ({
        issues,
        analysisScore,
        processingState: {
          ...state.processingState,
          isAnalyzing: false
        }
      }));
      
      return { success: true, issueCount: issues.length };
    } catch (error) {
      console.error('Error analyzing document:', error);
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          lastError: error.message || 'An error occurred during document analysis'
        }
      }));
      
      return { success: false, error: error.message };
    }
  },
  
  // Debounced version of analyzeDocument for better performance
  analyzeDocumentDebounced: () => {
    const { analysisSettings } = get();
    
    // Clear any existing scheduled analysis
    if (debouncedAnalysisTimeout) {
      clearTimeout(debouncedAnalysisTimeout);
    }
    
    // Update state to show that analysis is scheduled
    set(state => ({
      processingState: {
        ...state.processingState,
        isSchedulingAnalysis: true,
        analysisScheduledAt: Date.now()
      }
    }));
    
    return new Promise((resolve, reject) => {
      debouncedAnalysisTimeout = setTimeout(async () => {
        try {
          // Clear scheduling state
          set(state => ({
            processingState: {
              ...state.processingState,
              isSchedulingAnalysis: false,
              analysisScheduledAt: null
            }
          }));
          
          // Run the actual analysis
          const result = await get().analyzeDocument();
          resolve(result);
        } catch (error) {
          // Clear scheduling state on error
          set(state => ({
            processingState: {
              ...state.processingState,
              isSchedulingAnalysis: false,
              analysisScheduledAt: null
            }
          }));
          reject(error);
        }
      }, analysisSettings.debounceDelay);
    });
  },
  
  // Cancel any pending debounced analysis
  cancelDebouncedAnalysis: () => {
    if (debouncedAnalysisTimeout) {
      clearTimeout(debouncedAnalysisTimeout);
      debouncedAnalysisTimeout = null;
    }
    
    set(state => ({
      processingState: {
        ...state.processingState,
        isSchedulingAnalysis: false,
        analysisScheduledAt: null
      }
    }));
  },
  
  // Update analysis settings
  updateAnalysisSettings: (newSettings) => {
    set(state => ({
      analysisSettings: {
        ...state.analysisSettings,
        ...newSettings
      }
    }));
  },
  
  // Set active issue (for navigation and highlighting)
  setActiveIssue: (issueId) => {
    set({ activeIssueId: issueId });
    
    // Safely handle DOM operations in browser environment
    if (typeof document !== 'undefined') {
      // Scroll to the issue in the document
      const { issues } = get();
      const issue = issues?.find(i => i.id === issueId);
      
      if (issue && issue.location) {
        // Find the element with the issue
        const mark = document.querySelector(`mark[data-issue-id="${issueId}"]`);
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  },
  
// Apply a fix for an issue - REFINED VERSION
applyFix: async (issueId) => {
  const { issues, documentHtml, documentText } = get();
  const issue = issues.find(i => i.id === issueId);
  
  if (!issue || !issue.hasFix || !issue.fixAction) {
    console.warn('Cannot apply fix: issue not found or no fix available');
    return;
  }
  
  console.log('Applying fix for issue:', issue.title, 'Action:', issue.fixAction);
  
  // Set applying fix state
  set(state => ({
    processingState: {
      ...state.processingState,
      isApplyingFix: true,
      currentFixId: issueId
    }
  }));
  
  // Create a small artificial delay for better UX feedback
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let updatedHtml = documentHtml;
  let updatedText = documentText;
  let contentChanged = false;
  
  // Improved text replacement function
  const replaceTextSafely = (originalText, searchText, replacementText) => {
    if (!searchText || !originalText) {
      console.warn('Invalid search or original text');
      return originalText;
    }
    
    try {
      // Try exact match first
      if (originalText.includes(searchText)) {
        console.log('Found exact match for replacement');
        return originalText.replace(searchText, replacementText);
      }
      
      // Try with HTML entities decoded
      const decodedSearchText = searchText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      
      if (originalText.includes(decodedSearchText)) {
        console.log('Found match with HTML entities decoded');
        return originalText.replace(decodedSearchText, replacementText);
      }
      
      // Try with regex escape for special characters
      try {
        const exactMatchRegex = new RegExp(escapeRegExp(searchText), 'g');
        if (exactMatchRegex.test(originalText)) {
          console.log('Found match with regex');
          return originalText.replace(exactMatchRegex, replacementText);
        }
      } catch (regexError) {
        console.warn('Regex replacement failed:', regexError);
      }
      
      console.warn('Could not find text to replace:', searchText.substring(0, 100) + '...');
      return originalText;
    } catch (error) {
      console.error('Error in text replacement:', error);
      return originalText;
    }
  };
  
  try {
    // Apply the fix based on the issue type
    switch (issue.fixAction) {
      case 'addPageNumber':
        if (issue.text) {
          const citationMatch = issue.text.match(/\(([^)]+?),\s*(\d{4})\)/);
          if (citationMatch) {
            const authors = citationMatch[1];
            const year = citationMatch[2];
            const fixedText = issue.text.replace(
              `(${authors}, ${year})`, 
              `(${authors}, ${year}, p. 1)`
            );
            
            const newText = replaceTextSafely(documentText, issue.text, fixedText);
            const newHtml = replaceTextSafely(documentHtml, issue.text, fixedText);
            
            if (newText !== documentText || newHtml !== documentHtml) {
              updatedText = newText;
              updatedHtml = newHtml;
              contentChanged = true;
            }
          }
        }
        break;
        
      case 'fixCitationFormat':
      case 'fixParentheticalConnector':
      case 'addCitationComma':
        if (issue.text) {
          let fixedText = issue.text;
          
          // Fix missing comma between author and year
          const citationMatch = issue.text.match(/\(([^)]+?) (\d{4})\)/);
          if (citationMatch) {
            const authors = citationMatch[1];
            const year = citationMatch[2];
            fixedText = issue.text.replace(`(${authors} ${year})`, `(${authors}, ${year})`);
          }
          
          // Fix ampersand vs 'and' in parenthetical citations
          if (issue.text.includes(' and ') && issue.text.includes('(')) {
            fixedText = fixedText.replace(' and ', ' & ');
          }
          
          if (fixedText !== issue.text) {
            const newText = replaceTextSafely(documentText, issue.text, fixedText);
            const newHtml = replaceTextSafely(documentHtml, issue.text, fixedText);
            
            if (newText !== documentText || newHtml !== documentHtml) {
              updatedText = newText;
              updatedHtml = newHtml;
              contentChanged = true;
            }
          }
        }
        break;
        
      case 'fixNarrativeConnector':
        if (issue.text) {
          const fixedText = issue.text.replace(' & ', ' and ');
          if (fixedText !== issue.text) {
            const newText = replaceTextSafely(documentText, issue.text, fixedText);
            const newHtml = replaceTextSafely(documentHtml, issue.text, fixedText);
            
            if (newText !== documentText || newHtml !== documentHtml) {
              updatedText = newText;
              updatedHtml = newHtml;
              contentChanged = true;
            }
          }
        }
        break;
        
      case 'addReferencesHeader':
        updatedText = documentText + '\n\nReferences\n';
        updatedHtml = documentHtml + '<h2>References</h2>';
        contentChanged = true;
        break;
        
      case 'addTitlePageElements':
      case 'addTitlePage':
        const titlePage = `Title: APA Formatted Document\nAuthor: Student Name\nInstitution: University Name\nCourse: Course Name\nInstructor: Instructor Name\nDate: ${new Date().toLocaleDateString()}\n\n`;
        const titlePageHtml = `<div style="text-align: center; margin-bottom: 2em;"><h1>APA Formatted Document</h1><p>Student Name</p><p>University Name</p><p>Course Name</p><p>Instructor Name</p><p>${new Date().toLocaleDateString()}</p></div>`;
        
        updatedText = titlePage + documentText;
        updatedHtml = titlePageHtml + documentHtml;
        contentChanged = true;
        break;
        
      case 'addAbstract':
        const abstractText = '\n\nAbstract\n\nThis is an abstract placeholder. An abstract should be a brief, comprehensive summary of the contents of the paper, typically 150-250 words.\n\n';
        const abstractHtml = '<h2>Abstract</h2><p>This is an abstract placeholder. An abstract should be a brief, comprehensive summary of the contents of the paper, typically 150-250 words.</p>';
        
        updatedText = abstractText + documentText;
        updatedHtml = abstractHtml + documentHtml;
        contentChanged = true;
        break;
        
      case 'fixFont':
        if (documentHtml.includes('font-family:')) {
          updatedHtml = documentHtml.replace(/font-family:[^;]+;/g, 'font-family: "Times New Roman", Times, serif;');
        } else {
          updatedHtml = `<div style="font-family: 'Times New Roman', Times, serif;">${documentHtml}</div>`;
        }
        contentChanged = updatedHtml !== documentHtml;
        break;
        
      case 'fixFontSize':
        if (documentHtml.includes('font-size:')) {
          updatedHtml = documentHtml.replace(/font-size:[^;]+;/g, 'font-size: 12pt;');
        } else {
          updatedHtml = `<div style="font-size: 12pt;">${documentHtml}</div>`;
        }
        contentChanged = updatedHtml !== documentHtml;
        break;
        
      case 'fixLineSpacing':
        if (documentHtml.includes('line-height:')) {
          updatedHtml = documentHtml.replace(/line-height:[^;]+;/g, 'line-height: 2;');
        } else {
          updatedHtml = `<div style="line-height: 2;">${documentHtml}</div>`;
        }
        contentChanged = updatedHtml !== documentHtml;
        break;
        
      case 'fixMargins':
        if (documentHtml.includes('margin:')) {
          updatedHtml = documentHtml.replace(/margin:[^;]+;/g, 'margin: 1in;');
        } else {
          updatedHtml = `<div style="margin: 1in;">${documentHtml}</div>`;
        }
        contentChanged = updatedHtml !== documentHtml;
        break;
        
      case 'fixIndentation':
        if (documentHtml.includes('text-indent:')) {
          updatedHtml = documentHtml.replace(/text-indent:[^;]+;/g, 'text-indent: 0.5in;');
        } else {
          updatedHtml = documentHtml.replace(/<p(?![^>]*text-indent)/g, '<p style="text-indent: 0.5in;"');
        }
        contentChanged = updatedHtml !== documentHtml;
        break;
        
      case 'addPageNumbers':
        updatedHtml = `<div style="position: relative;">${documentHtml}<div style="position: absolute; top: 0.5in; right: 0.5in; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">1</div></div>`;
        contentChanged = true;
        break;
        
      default:
        console.log('Fix action not implemented:', issue.fixAction);
        // For unimplemented fixes, still remove the issue but don't change content
        contentChanged = false;
        break;
    }
    
    // Remove the fixed issue from issues list
    const updatedIssues = issues.filter(i => i.id !== issueId);
    
    // Calculate new score
    const criticalCount = updatedIssues.filter(i => i.severity === 'Critical').length;
    const majorCount = updatedIssues.filter(i => i.severity === 'Major').length;
    const minorCount = updatedIssues.filter(i => i.severity === 'Minor').length;
    const newScore = updatedIssues.length === 0 
      ? 100 
      : Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 5 + majorCount * 3 + minorCount))));
    
    // Update state
    console.log('Updating state after fix application');
    console.log('Content changed:', contentChanged);
    console.log('Issues before:', issues.length, 'Issues after:', updatedIssues.length);
    
    set(state => ({ 
      documentText: updatedText,
      documentHtml: updatedHtml,
      issues: updatedIssues,
      analysisScore: newScore,
      lastFixAppliedAt: contentChanged ? Date.now() : state.lastFixAppliedAt, // Only update timestamp if content actually changed
      activeIssueId: null, // Clear active issue since it's been fixed
      processingState: {
        ...state.processingState,
        isApplyingFix: false,
        currentFixId: null
      }
    }));
    
    console.log('Fix applied successfully for issue:', issueId);
    
  } catch (error) {
    console.error('Error applying fix:', error);
    
    // Still remove the issue from the list even if fix failed
    const updatedIssues = issues.filter(i => i.id !== issueId);
    const criticalCount = updatedIssues.filter(i => i.severity === 'Critical').length;
    const majorCount = updatedIssues.filter(i => i.severity === 'Major').length;
    const minorCount = updatedIssues.filter(i => i.severity === 'Minor').length;
    const newScore = updatedIssues.length === 0 
      ? 100 
      : Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 5 + majorCount * 3 + minorCount))));
    
    set(state => ({
      issues: updatedIssues,
      analysisScore: newScore,
      activeIssueId: null,
      processingState: {
        ...state.processingState,
        isApplyingFix: false,
        currentFixId: null,
        lastError: `Failed to apply fix for "${issue.title}": ${error.message}`
      }
    }));
  }
  
  // Small delay to ensure state updates are processed
  await new Promise(resolve => setTimeout(resolve, 100));
}
}));
