// src/store/documentStore.js - UNIFIED VERSION
'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Basic APA analyzer function (no complex imports)
function analyzeAPADocument(documentData) {
  const issues = [];
  const { text = '', html = '', formatting = null } = documentData || {};
  
  if (!text) return issues;
  
  // Basic citation analysis
  const citationPattern = /\(([^)]+),\s*(\d{4})[^)]*\)/g;
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const fullCitation = match[0];
    const authorPart = match[1];
    
    // Check for missing comma
    if (!fullCitation.includes(', ' + match[2])) {
      issues.push({
        title: "Missing comma in citation",
        description: "Citations must have a comma between author and year",
        text: fullCitation,
        severity: "Minor",
        category: "citations",
        hasFix: true,
        fixAction: "addCitationComma",
        explanation: "APA format requires a comma between author name(s) and year."
      });
    }
    
    // Check for incorrect ampersand usage
    if (authorPart.includes(' and ') && fullCitation.includes('(')) {
      issues.push({
        title: "Incorrect connector in parenthetical citation",
        description: "Use '&' instead of 'and' in parenthetical citations",
        text: fullCitation,
        severity: "Minor",
        category: "citations",
        hasFix: true,
        fixAction: "fixParentheticalConnector",
        explanation: "In parenthetical citations, use & to connect author names."
      });
    }
  }
  
  // Check for references section
  if (!text.toLowerCase().includes('references')) {
    issues.push({
      title: "Missing References section",
      description: "Document should include a References section",
      severity: "Critical",
      category: "structure",
      hasFix: true,
      fixAction: "addReferencesHeader",
      explanation: "All APA papers must include a References section."
    });
  }
  
  // Basic formatting checks
  if (formatting) {
    const font = formatting.document?.font;
    if (font?.family && !font.family.toLowerCase().includes('times new roman')) {
      issues.push({
        title: "Incorrect font family",
        description: `Document uses "${font.family}" instead of Times New Roman`,
        severity: "Major",
        category: "formatting",
        hasFix: true,
        fixAction: "fixFont",
        explanation: "APA requires Times New Roman 12pt font."
      });
    }
    
    if (font?.size && Math.abs(font.size - 12) > 0.5) {
      issues.push({
        title: "Incorrect font size", 
        description: `Font size is ${font.size}pt instead of 12pt`,
        severity: "Major",
        category: "formatting",
        hasFix: true,
        fixAction: "fixFontSize",
        explanation: "APA requires 12-point font size."
      });
    }
  }
  
  return issues;
}

export const useDocumentStore = create((set, get) => ({
  // Document state
  documentText: null,
  documentHtml: null,
  documentName: null,
  documentFormatting: null,
  documentStructure: null,
  documentStats: {
    wordCount: 0,
    charCount: 0,
    processingTime: 0
  },
  
  // Analysis state
  issues: [],
  activeIssueId: null,
  analysisScore: null,
  
  // Processing state
  processingState: {
    isUploading: false,
    isAnalyzing: false,
    isApplyingFix: false,
    lastError: null,
    progress: 0,
    currentFixId: null,
    stage: null
  },
  
  // Upload document
  uploadDocument: async (file) => {
    const SERVER_URL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : '';
    
    try {
      console.log('🚀 Starting document upload...', file.name);
      
      set({
        processingState: {
          ...get().processingState,
          isUploading: true,
          lastError: null,
          progress: 10,
          stage: 'Uploading document...'
        }
      });
      
      // Validate file
      if (!file.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Please upload a .docx file only');
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }
      
      // Create FormData
      const formData = new FormData();
      formData.append('document', file);
      
      set({
        documentName: file.name,
        processingState: {
          ...get().processingState,
          progress: 30,
          stage: 'Processing document...'
        }
      });
      
      console.log('📤 Sending request to server...');
      
      // Send to server
      const response = await fetch(`${SERVER_URL}/api/upload-docx`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📥 Server response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Processing result:', result.success);
      
      if (!result.success) {
        throw new Error(result.error || 'Server processing failed');
      }
      
      const { document: documentData } = result;
      
      // Validate response
      if (!documentData.html || !documentData.text) {
        throw new Error('Server returned incomplete document data');
      }
      
      console.log('✅ Document data received successfully');
      
      // Calculate stats
      const words = documentData.text.trim().split(/\s+/).filter(Boolean).length;
      const chars = documentData.text.length;
      
      // Store document data
      set(state => ({
        documentHtml: documentData.html,
        documentText: documentData.text,
        documentFormatting: documentData.formatting,
        documentStructure: documentData.structure,
        documentStats: {
          wordCount: words,
          charCount: chars,
          processingTime: documentData.processingInfo?.processingTime || 0
        },
        issues: [], // Clear previous issues
        activeIssueId: null,
        processingState: {
          ...state.processingState,
          progress: 100,
          isUploading: false,
          stage: 'Upload complete'
        }
      }));
      
      console.log('✅ Document uploaded successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isUploading: false,
          lastError: error.message,
          progress: 0,
          stage: null
        }
      }));
      
      return false;
    }
  },
  
  // Analyze document
  analyzeDocument: async () => {
    const { documentText, documentHtml, documentFormatting, documentStructure } = get();
    
    if (!documentText) {
      console.warn('⚠️ No document to analyze');
      return { success: false, error: 'No document available' };
    }
    
    try {
      console.log('🔍 Starting APA analysis...');
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: true,
          lastError: null,
          stage: 'Analyzing APA compliance...'
        }
      }));
      
      // Create document data for analysis
      const documentData = {
        text: documentText,
        html: documentHtml,
        formatting: documentFormatting,
        structure: documentStructure
      };
      
      // Run analysis
      const analysisResults = await new Promise((resolve) => {
        setTimeout(() => {
          const results = analyzeAPADocument(documentData);
          resolve(results);
        }, 500);
      });
      
      // Add IDs to issues
      const issues = analysisResults.map(issue => ({
        id: uuidv4(),
        ...issue
      }));
      
      // Calculate score
      const criticalCount = issues.filter(i => i.severity === 'Critical').length;
      const majorCount = issues.filter(i => i.severity === 'Major').length;
      const minorCount = issues.filter(i => i.severity === 'Minor').length;
      
      const analysisScore = Math.max(0, Math.min(100, 
        Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))
      ));
      
      set(state => ({
        issues,
        analysisScore,
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          stage: null
        }
      }));
      
      console.log(`✅ Analysis complete: ${issues.length} issues found, score: ${analysisScore}%`);
      
      return { 
        success: true, 
        issueCount: issues.length,
        score: analysisScore
      };
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      
      set(state => ({
        processingState: {
          ...state.processingState,
          isAnalyzing: false,
          lastError: error.message,
          stage: null
        }
      }));
      
      return { success: false, error: error.message };
    }
  },
  
  // Auto-analyze (no debouncing for simplicity)
  analyzeDocumentDebounced: async () => {
    return await get().analyzeDocument();
  },
  
  // Apply fix
  applyFix: async (issueId) => {
    const { issues, documentHtml, documentText } = get();
    const issue = issues.find(i => i.id === issueId);
    
    if (!issue || !issue.hasFix) {
      console.warn('Cannot apply fix: issue not found or no fix available');
      return false;
    }
    
    console.log('🔧 Applying fix for:', issue.title);
    
    set(state => ({
      processingState: {
        ...state.processingState,
        isApplyingFix: true,
        currentFixId: issueId,
        stage: `Applying fix: ${issue.title}`
      }
    }));
    
    // Simulate fix application
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      let updatedHtml = documentHtml;
      let updatedText = documentText;
      let contentChanged = false;
      
      // Apply specific fixes
      switch (issue.fixAction) {
        case 'addCitationComma':
          if (issue.text) {
            const fixedText = issue.text.replace(
              /\(([^,)]+)\s+(\d{4})\)/g, 
              '($1, $2)'
            );
            updatedText = documentText.replace(issue.text, fixedText);
            updatedHtml = documentHtml.replace(issue.text, fixedText);
            contentChanged = updatedText !== documentText;
          }
          break;
          
        case 'fixParentheticalConnector':
          if (issue.text) {
            const fixedText = issue.text.replace(' and ', ' & ');
            updatedText = documentText.replace(issue.text, fixedText);
            updatedHtml = documentHtml.replace(issue.text, fixedText);
            contentChanged = updatedText !== documentText;
          }
          break;
          
        case 'fixFont':
          updatedHtml = documentHtml.replace(
            /font-family:[^;]+;?/gi, 
            'font-family: "Times New Roman", Times, serif;'
          );
          contentChanged = updatedHtml !== documentHtml;
          break;
          
        default:
          console.log('Fix action not implemented:', issue.fixAction);
          break;
      }
      
      // Remove fixed issue and update state
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
      
      console.log('✅ Fix applied successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Fix application failed:', error);
      
      // Still remove the issue
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
  
  // Set active issue
  setActiveIssue: (issueId) => {
    set({ activeIssueId: issueId });
  },
  
  // Export placeholder (for Header component)
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