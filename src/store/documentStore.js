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
  
  // Export functionality
  exportDocument: () => {
    const { documentHtml, documentName } = get();
    
    if (!documentHtml) {
      alert('No document to export');
      return;
    }
    
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
      console.error('Error exporting document:', error);
      alert('Failed to export document. Please try again.');
      return false;
    }
  },
  
  // Document processing status
  processingState: {
    isUploading: false,
    isAnalyzing: false,
    isApplyingFix: false,
    lastError: null,
    progress: 0,
    currentFixId: null
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
        fixAction: issue.fixAction
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
  
  // Apply a fix for an issue
  applyFix: async (issueId) => {
    const { issues, documentHtml, documentText } = get();
    const issue = issues.find(i => i.id === issueId);
    
    if (!issue || !issue.hasFix || !issue.fixAction) return;
    
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
    
    // Apply the fix based on the issue type
    switch (issue.fixAction) {
      case 'addPageNumber':
        // Add page number to direct quote citation
        if (issue.text) {
          const citationMatch = issue.text.match(/\(([^)]+?),\s*(\d{4})\)/);
          if (citationMatch) {
            // Add page number to citation
            const authors = citationMatch[1];
            const year = citationMatch[2];
            const fixedText = issue.text.replace(
              `(${authors}, ${year})`, 
              `(${authors}, ${year}, p. 1)` // Default to p. 1, would be customizable in a real app
            );
            
            // Use safer replacements with exact matches only
            try {
              // Create a RegExp that matches the exact text (without global flag)
              const exactMatchRegex = new RegExp(escapeRegExp(issue.text));
              updatedText = documentText.replace(exactMatchRegex, fixedText);
              updatedHtml = documentHtml.replace(exactMatchRegex, fixedText);
            } catch (error) {
              console.error('Error replacing text:', error);
              // Fallback to simple replace if regex fails
              updatedText = documentText.replace(issue.text, fixedText);
              updatedHtml = documentHtml.replace(issue.text, fixedText);
            }
          }
        }
        break;
        
      case 'fixCitationFormat':
        // Fix citation format issues
        if (issue.text) {
          const citationMatch = issue.text.match(/\(([^)]+?) (\d{4})\)/);
          if (citationMatch) {
            // Add comma between author and year
            const authors = citationMatch[1];
            const year = citationMatch[2];
            const fixedText = issue.text.replace(
              `(${authors} ${year})`, 
              `(${authors}, ${year})`
            );
            
            // Use safer replacements with exact matches only
            try {
              // Create a RegExp that matches the exact text (without global flag)
              const exactMatchRegex = new RegExp(escapeRegExp(issue.text));
              updatedText = documentText.replace(exactMatchRegex, fixedText);
              updatedHtml = documentHtml.replace(exactMatchRegex, fixedText);
            } catch (error) {
              console.error('Error replacing text:', error);
              // Fallback to simple replace if regex fails
              updatedText = documentText.replace(issue.text, fixedText);
              updatedHtml = documentHtml.replace(issue.text, fixedText);
            }
          }
        }
        break;
        
      case 'fixAmpersand':
        // Fix ampersand vs. 'and' in citations
        if (issue.text) {
          // For narrative citations, 'and' is correct
          if (issue.text.includes(' and ')) {
            // This is already correct, but if we need to fix parenthetical citation:
            const fixedText = issue.text.replace(' and ', ' & ');
            // Use safer replacements with exact matches only
            try {
              // Create a RegExp that matches the exact text (without global flag)
              const exactMatchRegex = new RegExp(escapeRegExp(issue.text));
              updatedText = documentText.replace(exactMatchRegex, fixedText);
              updatedHtml = documentHtml.replace(exactMatchRegex, fixedText);
            } catch (error) {
              console.error('Error replacing text:', error);
              // Fallback to simple replace if regex fails
              updatedText = documentText.replace(issue.text, fixedText);
              updatedHtml = documentHtml.replace(issue.text, fixedText);
            }
          }
        }
        break;
        
      case 'addReferencesHeader':
        // Add References header
        updatedText = documentText + '\n\nReferences\n';
        updatedHtml = documentHtml + '<h2>References</h2>';
        break;
        
      case 'reorderReferences':
        // For demo purposes, just mark as fixed
        // In real implementation, this would reorder the references alphabetically
        break;
        
      case 'addTitlePage':
        // Add title page template
        const titlePage = 'Title: APA Formatted Document\nAuthor: Student Name\nInstitution: University Name\nCourse: Course Name\nInstructor: Instructor Name\nDate: ' + new Date().toLocaleDateString();
        updatedText = titlePage + '\n\n' + documentText;
        updatedHtml = '<div style="text-align: center; margin-bottom: 2em;">' +
          '<h1>APA Formatted Document</h1>' +
          '<p>Student Name</p>' +
          '<p>University Name</p>' +
          '<p>Course Name</p>' +
          '<p>Instructor Name</p>' +
          '<p>' + new Date().toLocaleDateString() + '</p>' +
          '</div>' + documentHtml;
        break;
        
      case 'addAbstract':
        // Add abstract template after title page (if exists) or at beginning
        const abstractText = '\n\nAbstract\n\nThis is an abstract placeholder. An abstract should be a brief, comprehensive summary of the contents of the paper, typically 150-250 words.\n\n';
        const abstractHtml = '<h2>Abstract</h2><p>This is an abstract placeholder. An abstract should be a brief, comprehensive summary of the contents of the paper, typically 150-250 words.</p>';
        
        if (documentText.includes('Title:') && documentText.includes('Author:')) {
          // If there's a title page, add after it
          const titlePageEnd = documentText.indexOf('Date:');
          if (titlePageEnd !== -1) {
            const endIndex = documentText.indexOf('\n', titlePageEnd);
            updatedText = documentText.substring(0, endIndex + 1) + abstractText + documentText.substring(endIndex + 1);
            
            // For HTML, add after the first div (assuming first div is title page)
            const firstDivEnd = documentHtml.indexOf('</div>');
            if (firstDivEnd !== -1) {
              updatedHtml = documentHtml.substring(0, firstDivEnd + 6) + abstractHtml + documentHtml.substring(firstDivEnd + 6);
            }
          }
        } else {
          // Add at beginning
          updatedText = abstractText + documentText;
          updatedHtml = abstractHtml + documentHtml;
        }
        break;
        
      case 'fixHeadingLevel':
        // For demo purposes, just mark as fixed
        // In a real implementation, this would fix heading hierarchy
        break;
        
      case 'fixFont':
        // Update the document to use Times New Roman
        updatedHtml = documentHtml.replace(/font-family:[^;]+;/g, 'font-family: "Times New Roman", Times, serif;');
        if (!documentHtml.includes('font-family:')) {
          updatedHtml = updatedHtml.replace(/<body/, '<body style="font-family: \'Times New Roman\', Times, serif;"');
        }
        break;
        
      case 'fixFontSize':
        // Update font size to 12pt
        updatedHtml = documentHtml.replace(/font-size:[^;]+;/g, 'font-size: 12pt;');
        if (!documentHtml.includes('font-size:')) {
          updatedHtml = updatedHtml.replace(/<body/, '<body style="font-size: 12pt;"');
        }
        break;
        
      case 'fixLineSpacing':
        // Update line spacing to double
        updatedHtml = documentHtml.replace(/line-height:[^;]+;/g, 'line-height: 2;');
        if (!documentHtml.includes('line-height:')) {
          updatedHtml = updatedHtml.replace(/<body/, '<body style="line-height: 2;"');
        }
        break;
        
      case 'fixMargins':
        // Set 1-inch margins
        updatedHtml = documentHtml.replace(/margin:[^;]+;/g, 'margin: 1in;');
        if (!documentHtml.includes('margin:')) {
          updatedHtml = updatedHtml.replace(/<body/, '<body style="margin: 1in;"');
        }
        break;
        
      case 'fixIndentation':
        // Set 0.5-inch paragraph indentation
        updatedHtml = documentHtml.replace(/text-indent:[^;]+;/g, 'text-indent: 0.5in;');
        if (!documentHtml.includes('text-indent:')) {
          // Add text-indent to all paragraphs
          updatedHtml = updatedHtml.replace(/<p/g, '<p style="text-indent: 0.5in;"');
        }
        break;
        
      case 'addPageNumbers':
        // Add page numbers - for HTML export, we'll add it in the header
        updatedHtml = documentHtml.replace(/<body/, '<body style="position: relative;"');
        updatedHtml = updatedHtml.replace(/<body([^>]*)>/, 
          '<body$1><div style="position: absolute; top: 0.5in; right: 0.5in; font-family: \'Times New Roman\', Times, serif; font-size: 12pt;">1</div>');
        break;
        
      default:
        // For any other fix actions, just mark as fixed without changing content
        break;
    }
    
    // Remove the fixed issue from issues list
    const updatedIssues = issues.filter(i => i.id !== issueId);
    
    // Update state with modified document and recalculated score
    set(state => ({ 
      documentText: updatedText,
      documentHtml: updatedHtml,
      issues: updatedIssues,
      // Recalculate compliance score
      analysisScore: updatedIssues.length === 0 
        ? 100 
        : Math.max(0, Math.min(100, Math.round(100 - (
            updatedIssues.filter(i => i.severity === 'Critical').length * 5 + 
            updatedIssues.filter(i => i.severity === 'Major').length * 3 + 
            updatedIssues.filter(i => i.severity === 'Minor').length
          )))),
      // Reset the applying fix state
      processingState: {
        ...state.processingState,
        isApplyingFix: false,
        currentFixId: null
      }
    }));
  }
}));
