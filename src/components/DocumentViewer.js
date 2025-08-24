'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { FileText, InfoIcon } from 'lucide-react';
import { useTooltip } from '@/components/Tooltip';

export default function DocumentViewer() {
const { documentText, documentHtml, activeIssueId, issues, setActiveIssue, lastFixAppliedAt } = useDocumentStore();
  const viewerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastContentUpdate, setLastContentUpdate] = useState(null);
  
  // Add a state for showing/hiding issues
  const [showIssues, setShowIssues] = useState(true);
  
  // Initialize tooltip functionality
  const { showTooltip, hideTooltip, TooltipComponent } = useTooltip();
  
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
    const mark = event.target.closest('mark[data-issue-id][data-clickable="true"]');
    if (mark) {
      const title = mark.getAttribute('data-issue-title');
      const explanation = mark.getAttribute('data-issue-explanation');
      
      if (explanation) {
        const rect = mark.getBoundingClientRect();
        const content = (
          <div className="text-left">
            <div className="font-semibold mb-1 text-white">{title}</div>
            <div className="text-gray-200 text-xs leading-relaxed">{explanation}</div>
          </div>
        );
        showTooltip(content, rect.left + rect.width / 2, rect.bottom);
      }
    }
  }, [showTooltip]);
  
  // Event handler for mark leave using event delegation
  const handleMarkLeave = useCallback((event) => {
    const mark = event.target.closest('mark[data-issue-id][data-clickable="true"]');
    if (mark) {
      hideTooltip();
    }
  }, [hideTooltip]);
  
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
      setIsLoading(true);
      
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
          
          // Finish loading regardless of success
          setIsLoading(false);
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
  console.log('DocumentViewer render - documentText exists:', !!documentText, 'documentHtml:', !!documentHtml, 'isLoading:', isLoading);

  return (
    <div className="p-8 h-full">
      <TooltipComponent />
      {documentText ? (
        <>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full bg-white shadow-md p-8 rounded-lg">
              <div className="loading-spinner mb-4"></div>
              <p className="text-gray-600 font-medium">Analyzing document...</p>
              <p className="text-sm text-gray-500 mt-1">Checking for APA 7th edition compliance</p>
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-700">Document Content</h3>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setShowIssues(!showIssues)}
                    className={`px-3 py-1 rounded-md text-sm font-medium flex items-center transition-colors ${
                      showIssues 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {showIssues ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        Hide Issues
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                        Show Issues
                      </>
                    )}
                  </button>
                  {lastFixAppliedAt && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Updated
                    </span>
                  )}
                </div>
              </div>
              <div 
                ref={viewerRef}
                className="prose max-w-none bg-white p-4 rounded border border-gray-100"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '12pt',
                  lineHeight: '1.6',
                  color: '#1f2937'
                }}
              >
                {/* Use dangerouslySetInnerHTML without a key prop to avoid unnecessary re-renders */}
                {documentHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
                ) : (
                  <div>
                    <p>Document loaded but HTML content could not be displayed.</p>
                    <p className="text-gray-500 mt-2">Raw text content:</p>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      {documentText ? documentText.substring(0, 500) + (documentText.length > 500 ? '...' : '') : 'No text content available'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-20 bg-gradient-to-b from-white to-blue-50 rounded-lg shadow-sm border border-gray-100 animate-scale-in">
          <div className="bg-blue-50 p-5 rounded-full mb-6 shadow-inner flex items-center justify-center">
            <FileText className="h-20 w-20 text-blue-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Upload a document to begin</h2>
          <p className="text-gray-500 mb-8">Validate your academic paper against APA 7th edition guidelines</p>
          <div className="border-t border-gray-200 pt-6 w-full max-w-md">
            <div className="bg-blue-50 rounded-md p-4 flex items-start hover:bg-blue-100 transition-colors hover-shadow">
              <InfoIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-blue-800">Only .docx files are supported. For best results, ensure your document is properly formatted.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}