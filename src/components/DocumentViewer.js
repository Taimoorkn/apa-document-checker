'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { FileText, InfoIcon } from 'lucide-react';

export default function DocumentViewer() {
const { documentText, documentHtml, activeIssueId, issues, setActiveIssue, lastFixAppliedAt, processingState } = useDocumentStore();
  const viewerRef = useRef(null);
  // Use processing state from store instead of local loading state
  const isLoading = processingState.isUploading || processingState.isAnalyzing;
  const [lastContentUpdate, setLastContentUpdate] = useState(null);
  
  // Add a state for showing/hiding issues
  const [showIssues, setShowIssues] = useState(true);
  
  
  // Function to apply highlighting to the document
  const applyHighlighting = useCallback(() => {
    if (!viewerRef.current || !documentHtml || !issues || !showIssues) {
      console.log('Cannot apply highlighting, missing prerequisites');
      return;
    }
    
    console.log('Applying highlighting to document with', issues.length, 'issues');
    
    // First, reset any existing highlighting and remove event listeners to prevent memory leaks
    const existingMarks = viewerRef.current.querySelectorAll('mark[data-issue-id]');
    existingMarks.forEach(mark => {
      // Clone the mark without event listeners to prevent memory leaks
      if (mark.parentNode) {
        const textContent = mark.textContent;
        const textNode = document.createTextNode(textContent);
        mark.parentNode.replaceChild(textNode, mark);
      }
    });
    
    // Track created marks so we can efficiently handle cleanups later
    const createdMarks = [];
    
    // Now apply new highlighting
    for (const issue of issues) {
      if (!issue.text) continue;
      
      // Find all text nodes in the document
      const allTextNodes = [];
      const walker = document.createTreeWalker(
        viewerRef.current,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while ((node = walker.nextNode())) {
        allTextNodes.push(node);
      }
      
      // Look for the issue text in these nodes
      for (const textNode of allTextNodes) {
        const content = textNode.textContent;
        const index = content.indexOf(issue.text);
        
        if (index === -1) continue;
        
        try {
          // Found a match, split the node and highlight
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + issue.text.length);
          
          // Create a mark element
          const mark = document.createElement('mark');
          mark.setAttribute('data-issue-id', issue.id);
          mark.setAttribute('data-issue-title', issue.title);
          mark.setAttribute('data-issue-explanation', issue.explanation || issue.description || 'APA formatting issue detected');
          mark.className = getIssueClass(issue.severity);
          
          // Wrap the text in the mark
          range.surroundContents(mark);
          
          // Use a data attribute instead of direct event listener
          // This makes the DOM element serializable and prevents memory leaks
          mark.setAttribute('data-clickable', 'true');
          
          // Track created marks
          createdMarks.push(mark);
          
          // Only highlight the first occurrence
          break;
        } catch (error) {
          console.error('Error highlighting text:', error);
          // Continue with next node if there's an error
          continue;
        }
      }
    }
    
    // Add delegated event listeners at the container level for better performance
    // and to avoid memory leaks from multiple individual listeners
    if (viewerRef.current) {
      // Remove existing event handlers
      viewerRef.current.removeEventListener('click', handleMarkClick);
      viewerRef.current.removeEventListener('mouseenter', handleMarkHover, true);
      viewerRef.current.removeEventListener('mouseleave', handleMarkLeave, true);
      
      // Add new event handlers
      viewerRef.current.addEventListener('click', handleMarkClick);
      viewerRef.current.addEventListener('mouseenter', handleMarkHover, true);
      viewerRef.current.addEventListener('mouseleave', handleMarkLeave, true);
    }
    
    // Highlight the active issue with a special class
    if (activeIssueId) {
      const activeMark = viewerRef.current.querySelector(`mark[data-issue-id="${activeIssueId}"]`);
      if (activeMark) {
        activeMark.classList.add('active-issue');
        // Scroll to active issue
        activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    return () => {
      // Clean up event listeners when component unmounts or before re-applying
      if (viewerRef.current) {
        viewerRef.current.removeEventListener('click', handleMarkClick);
        viewerRef.current.removeEventListener('mouseenter', handleMarkHover, true);
        viewerRef.current.removeEventListener('mouseleave', handleMarkLeave, true);
      }
    };
  }, [documentHtml, issues, showIssues, activeIssueId]);
  
  // Event handler for mark clicks using event delegation
  const handleMarkClick = useCallback((event) => {
    // Find the closest mark element from the click target
    const mark = event.target.closest('mark[data-issue-id][data-clickable="true"]');
    if (mark) {
      const issueId = mark.getAttribute('data-issue-id');
      if (issueId) {
        setActiveIssue(issueId);
      }
    }
  }, [setActiveIssue]);
  
  // Event handler for mark hover using event delegation
  const handleMarkHover = useCallback((event) => {
    // Tooltip functionality removed - placeholder for potential future functionality
  }, []);
  
  // Event handler for mark leave using event delegation
  const handleMarkLeave = useCallback((event) => {
    // Tooltip functionality removed - placeholder for potential future functionality
  }, []);
  
  // Main useEffect for handling document HTML changes and initial load
  useEffect(() => {
    let mainTimeoutId;
    let highlightTimeoutId;
    
    console.log('DocumentViewer main effect running:', {
      hasDocumentHtml: !!documentHtml,
      htmlLength: documentHtml?.length,
      issuesCount: issues?.length
    });
    
    if (documentHtml) {
      
      // Use a ref to track the current render cycle
      const renderCycleId = Date.now();
      if (viewerRef.current) {
        viewerRef.current.setAttribute('data-render-cycle', renderCycleId.toString());
      
        mainTimeoutId = setTimeout(() => {
          // Check if this is still the current render cycle
          if (viewerRef.current && viewerRef.current.getAttribute('data-render-cycle') === renderCycleId.toString()) {
            console.log('Document HTML ready for highlighting');
            
            // Apply highlighting after a short delay to ensure DOM is ready
            highlightTimeoutId = setTimeout(() => {
              // Double-check that we're still on the same render cycle before highlighting
              if (viewerRef.current && viewerRef.current.getAttribute('data-render-cycle') === renderCycleId.toString()) {
                const cleanup = applyHighlighting();
                // Store cleanup function for later use if needed
                if (cleanup && typeof cleanup === 'function') {
                  viewerRef.current.setAttribute('data-cleanup', 'available');
                }
              }
            }, 100);
          }
          
          // Loading state is now managed by store processing state
        }, 200);
      }
    }
    
    // Cleanup function
    return () => {
      if (mainTimeoutId) clearTimeout(mainTimeoutId);
      if (highlightTimeoutId) clearTimeout(highlightTimeoutId);
    };
  }, [documentHtml, applyHighlighting]);
  
  // Separate effect for handling issue changes (highlighting updates)
  useEffect(() => {
    if (documentHtml && !isLoading && viewerRef.current) {
      console.log('Issues or showIssues changed, updating highlighting');
      const highlightTimeout = setTimeout(() => {
        const cleanup = applyHighlighting();
        if (cleanup && typeof cleanup === 'function') {
          viewerRef.current.setAttribute('data-cleanup', 'available');
        }
      }, 50);
      
      return () => clearTimeout(highlightTimeout);
    }
  }, [issues, showIssues, applyHighlighting, isLoading, documentHtml]);
  
  // Separate effect for handling active issue changes (scrolling)
  useEffect(() => {
    if (activeIssueId && viewerRef.current && !isLoading) {
      console.log('Active issue changed to:', activeIssueId);
      
      // Small delay to ensure highlighting is applied first
      const scrollTimeout = setTimeout(() => {
        if (viewerRef.current) {
          // Remove previous active highlights
          const previousActive = viewerRef.current.querySelectorAll('.active-issue');
          previousActive.forEach(el => el.classList.remove('active-issue'));
          
          // Add active highlight and scroll to the new active issue
          const activeMark = viewerRef.current.querySelector(`mark[data-issue-id="${activeIssueId}"]`);
          if (activeMark) {
            activeMark.classList.add('active-issue');
            activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [activeIssueId, isLoading]);
  
  // Effect for handling fixes applied (content updates)
  useEffect(() => {
    if (lastFixAppliedAt && lastFixAppliedAt !== lastContentUpdate) {
      console.log('Fix was applied at:', lastFixAppliedAt, '- updating content');
      setLastContentUpdate(lastFixAppliedAt);
      
      // Ensure highlighting is reapplied after content changes
      if (viewerRef.current && !isLoading) {
        const updateTimeout = setTimeout(() => {
          const cleanup = applyHighlighting();
          if (cleanup && typeof cleanup === 'function') {
            viewerRef.current.setAttribute('data-cleanup', 'available');
          }
        }, 150);
        
        return () => clearTimeout(updateTimeout);
      }
    }
  }, [lastFixAppliedAt, lastContentUpdate, applyHighlighting, isLoading]);
  
  // Helper function to get issue class based on severity
  const getIssueClass = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-200 border-b-2 border-red-500 cursor-pointer';
      case 'Major':
        return 'bg-orange-200 border-b-2 border-orange-500 cursor-pointer';
      case 'Minor':
        return 'bg-blue-200 border-b-2 border-blue-500 cursor-pointer';
      default:
        return '';
    }
  };
  
  // Add debug output for component state
  console.log('DocumentViewer render - documentText exists:', !!documentText, 'documentHtml:', !!documentHtml, 'isLoading:', isLoading, 'processingState:', processingState);

  return (
    <div className="h-full flex flex-col">
      {documentText ? (
        <>
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col items-center">
                <div className="loading-spinner mb-6"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Document</h3>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  Checking your document against APA 7th edition guidelines...
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Document Controls - Fixed Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">Document Review</h3>
                    {lastFixAppliedAt && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
                        Recently Updated
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => setShowIssues(!showIssues)}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        showIssues 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {showIssues ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Hide Issues
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                          Show Issues
                        </>
                      )}
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="text-xs text-gray-500">
                      {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Content - Scrollable Area */}
              <div className="flex-1 overflow-auto bg-gray-50">
                <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div 
                      ref={viewerRef}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
                      style={{
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: '12pt',
                        lineHeight: '2',
                        color: '#111827'
                      }}
                    >
                      {documentHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
                      ) : (
                        <div className="text-center py-12">
                          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                            <h4 className="text-lg font-medium text-yellow-800 mb-2">Content Display Issue</h4>
                            <p className="text-sm text-yellow-700 mb-4">
                              Document loaded but HTML content could not be displayed.
                            </p>
                            <div className="bg-white p-4 rounded border border-yellow-200 text-left">
                              <p className="text-sm font-medium text-gray-700 mb-2">Raw text preview:</p>
                              <p className="text-xs text-gray-600 font-mono">
                                {documentText ? documentText.substring(0, 500) + (documentText.length > 500 ? '...' : '') : 'No text content available'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <FileText className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Check Your Document</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Upload your academic paper and get instant feedback on APA 7th edition compliance
            </p>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 mb-1">Supported Format</p>
                  <p className="text-sm text-gray-600">
                    Only <span className="font-medium">.docx files</span> are supported. Ensure your document is properly formatted for best results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}