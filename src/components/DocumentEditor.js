'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { FileText, AlertCircle, Loader2, Highlighter } from 'lucide-react';

export default function DocumentEditor() {
  const { 
    displayData, 
    analysisData, 
    documentId,
    activeIssueId, 
    setActiveIssue,
    issues 
  } = useDocumentStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const editorRef = useRef(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Apply highlights directly to the HTML content
  const applyHighlightsToHTML = useCallback((html) => {
    if (!showHighlights || !issues || issues.length === 0) return html;
    
    let highlightedHTML = html;
    
    // Sort issues by text length (longest first) to avoid nested highlighting issues
    const sortedIssues = [...issues].sort((a, b) => 
      (b.text?.length || 0) - (a.text?.length || 0)
    );
    
    sortedIssues.forEach(issue => {
      if (!issue.text) return;
      
      // Escape special regex characters in the issue text
      const escapedText = issue.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create a regex to find the text (case insensitive)
      const regex = new RegExp(`(${escapedText})`, 'gi');
      
      // Determine highlight color based on severity
      const color = getSeverityColor(issue.severity);
      const borderColor = getSeverityBorderColor(issue.severity);
      
      // Replace with highlighted version
      highlightedHTML = highlightedHTML.replace(regex, 
        `<mark class="apa-issue-highlight" data-issue-id="${issue.id}" style="background-color: ${color}; border-bottom: 2px solid ${borderColor}; padding: 0 2px; border-radius: 2px; cursor: pointer;" title="${issue.title}">$1</mark>`
      );
    });
    
    return highlightedHTML;
  }, [issues, showHighlights]);

  // Get color based on severity
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#ffcdd2';
      case 'major': return '#ffe0b2';
      case 'minor': return '#bbdefb';
      default: return '#fff9c4';
    }
  };

  const getSeverityBorderColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#f44336';
      case 'major': return '#ff9800';
      case 'minor': return '#2196f3';
      default: return '#ffeb3b';
    }
  };

  // Handle click on highlighted issues
  useEffect(() => {
    if (!isContentLoaded || !editorRef.current) return;
    
    const handleHighlightClick = (e) => {
      const mark = e.target.closest('mark[data-issue-id]');
      if (mark) {
        const issueId = mark.getAttribute('data-issue-id');
        if (issueId) {
          setActiveIssue(issueId);
        }
      }
    };
    
    editorRef.current.addEventListener('click', handleHighlightClick);
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('click', handleHighlightClick);
      }
    };
  }, [isContentLoaded, setActiveIssue]);

  // Scroll to active issue
  useEffect(() => {
    if (!activeIssueId || !editorRef.current) return;
    
    const mark = editorRef.current.querySelector(`mark[data-issue-id="${activeIssueId}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add temporary highlight effect
      mark.style.transition = 'all 0.3s ease';
      const originalBg = mark.style.backgroundColor;
      mark.style.backgroundColor = '#ffd54f';
      setTimeout(() => {
        mark.style.backgroundColor = originalBg;
      }, 500);
    }
  }, [activeIssueId]);

  // Add document CSS styles
  useEffect(() => {
    if (!displayData?.css) return;
    
    const styleId = 'document-css-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // Add CSS to preserve document formatting
    const additionalCSS = `
      .document-html-content {
        /* Preserve all original styles */
      }
      .document-html-content * {
        /* Don't override any inline styles */
      }
    `;
    
    styleElement.textContent = displayData.css + additionalCSS;
    
    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [displayData?.css]);

  // Process HTML content
  const processedHTML = displayData?.html ? applyHighlightsToHTML(displayData.html) : '';

  // Set content loaded flag
  useEffect(() => {
    if (displayData?.html) {
      setIsContentLoaded(true);
    }
  }, [displayData?.html]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Document Viewer
          </h3>
          {documentId && (
            <span className="text-sm text-gray-500">
              ID: {documentId.substring(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Show/Hide Highlights Toggle */}
          {issues && issues.length > 0 && (
            <button
              onClick={() => setShowHighlights(!showHighlights)}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm font-medium transition-all duration-200 ${
                showHighlights
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              <Highlighter className="h-4 w-4" />
              <span>{showHighlights ? 'Hide' : 'Show'} Highlights</span>
              {issues.length > 0 && (
                <span className="ml-1 text-xs">({issues.length})</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {!displayData?.html && !analysisData?.text ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <FileText className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Check Your Document
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Upload your academic paper to start checking against APA 7th edition guidelines
              </p>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 mb-1">
                      Document Features
                    </p>
                    <p className="text-sm text-gray-600">
                      • Original formatting preserved<br />
                      • Real-time APA validation<br />
                      • In-line issue highlighting<br />
                      • Click highlights to see details
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Document Display with Original HTML
          <div className="h-full overflow-auto bg-white p-8">
            <div 
              ref={editorRef}
              className="document-html-content max-w-4xl mx-auto"
              dangerouslySetInnerHTML={{ __html: processedHTML }}
              style={{
                // Apply document-specific formatting if available
                fontFamily: analysisData?.formatting?.document?.font?.family ? 
                  `"${analysisData.formatting.document.font.family}", serif` : 'inherit',
                fontSize: analysisData?.formatting?.document?.font?.size ? 
                  `${analysisData.formatting.document.font.size}pt` : 'inherit',
                lineHeight: analysisData?.formatting?.document?.spacing?.line || 'inherit'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}