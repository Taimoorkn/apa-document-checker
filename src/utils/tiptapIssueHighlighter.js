// Tiptap Issue Highlighter - Decoration-based highlighting for APA issues
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const highlighterKey = new PluginKey('issueHighlighter');

// Helper functions defined outside the extension
function findTextInNode(text, searchText, basePos, positions, isTruncated) {
  let index = text.indexOf(searchText);
  
  while (index !== -1) {
    const from = basePos + index;
    const to = from + (isTruncated 
      ? Math.min(searchText.length + 20, text.length - index)
      : searchText.length);
    
    positions.push({ from, to });
    
    // Look for next occurrence
    index = text.indexOf(searchText, index + 1);
  }
}

function searchInParagraph(doc, searchText, paragraphIndex, positions, isTruncated) {
  let currentPara = 0;
  let found = false;
  
  doc.descendants((node, pos) => {
    if (found) return false;
    
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (currentPara === paragraphIndex) {
        const text = node.textContent;
        findTextInNode(text, searchText, pos + 1, positions, isTruncated);
        found = true;
        return false;
      }
      currentPara++;
    }
  });
}

function searchInDocument(doc, searchText, positions, isTruncated) {
  doc.descendants((node, pos) => {
    if (node.isText) {
      const text = node.text;
      findTextInNode(text, searchText, pos, positions, isTruncated);
    } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      // For block nodes, search their text content
      const text = node.textContent;
      if (text.includes(searchText)) {
        findTextInNode(text, searchText, pos + 1, positions, isTruncated);
      }
    }
  });
}

function findIssuePositions(doc, issue) {
  const positions = [];
  
  // Skip document-level issues without specific text
  if (issue.location?.type === 'document' && !issue.highlightText && !issue.text) {
    return positions;
  }
  
  // Determine search text
  let searchText = issue.highlightText || issue.text || '';
  if (!searchText || searchText.length < 2) {
    return positions;
  }
  
  // Handle truncated text
  const isTruncated = searchText.endsWith('...');
  if (isTruncated) {
    searchText = searchText.slice(0, -3).trim();
  }
  
  // Search strategy based on location
  if (issue.location?.paragraphIndex !== undefined) {
    // Search in specific paragraph
    searchInParagraph(doc, searchText, issue.location.paragraphIndex, positions, isTruncated);
  } else {
    // Search entire document
    searchInDocument(doc, searchText, positions, isTruncated);
  }
  
  return positions;
}

function getHighlightClass(severity, isActive) {
  const classes = ['apa-issue'];
  
  switch (severity) {
    case 'Critical':
      classes.push('apa-critical');
      if (isActive) classes.push('apa-active');
      break;
    case 'Major':
      classes.push('apa-major');
      if (isActive) classes.push('apa-active');
      break;
    case 'Minor':
      classes.push('apa-minor');
      if (isActive) classes.push('apa-active');
      break;
    default:
      classes.push('apa-default');
  }
  
  return classes.join(' ');
}

function createDecorations(doc, issues, activeIssueId, showHighlighting) {
  if (!showHighlighting || !issues || issues.length === 0) {
    return DecorationSet.empty;
  }

  const decorations = [];
  
  issues.forEach(issue => {
    try {
      const positions = findIssuePositions(doc, issue);
      
      positions.forEach(({ from, to }) => {
        const isActive = issue.id === activeIssueId;
        const className = getHighlightClass(issue.severity, isActive);
        
        const decoration = Decoration.inline(from, to, {
          class: className,
          nodeName: 'span',
          'data-issue-id': issue.id,
          'data-severity': issue.severity,
          'title': `${issue.severity} issue: ${issue.title || 'APA compliance issue'} • Ctrl+click to select`
        }, {
          issueId: issue.id,
          severity: issue.severity,
          inclusiveStart: false,
          inclusiveEnd: false
        });
        
        decorations.push(decoration);
      });
    } catch (error) {
      console.warn(`Failed to highlight issue ${issue.id}:`, error);
    }
  });
  
  // Sort decorations by position to avoid conflicts
  decorations.sort((a, b) => a.from - b.from);
  
  return DecorationSet.create(doc, decorations);
}

export const IssueHighlighter = Extension.create({
  name: 'issueHighlighter',

  addOptions() {
    return {
      issues: [],
      activeIssueId: null,
      showHighlighting: true,
      onIssueClick: null
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: highlighterKey,
        
        state: {
          init(_, state) {
            return {
              decorations: DecorationSet.empty,
              issues: extension.options.issues || []
            };
          },
          
          apply(tr, value, oldState, newState) {
            // Check for meta updates
            const meta = tr.getMeta(highlighterKey);
            
            if (meta?.updateHighlights) {
              // Rebuild decorations with new issues
              const decorations = createDecorations(
                newState.doc,
                meta.issues || extension.options.issues,
                meta.activeIssueId !== undefined ? meta.activeIssueId : extension.options.activeIssueId,
                meta.showHighlighting !== undefined ? meta.showHighlighting : extension.options.showHighlighting
              );
              return {
                decorations,
                issues: meta.issues || value.issues
              };
            }
            
            // Map decorations through document changes
            if (tr.docChanged) {
              return {
                decorations: value.decorations.map(tr.mapping, tr.doc),
                issues: value.issues
              };
            }
            
            return value;
          }
        },
        
        props: {
          decorations(state) {
            return this.getState(state)?.decorations || DecorationSet.empty;
          },
          
          handleClick(view, pos, event) {
            const target = event.target;

            // Check if clicked on a highlighted issue
            if (target && target.classList && target.classList.contains('apa-issue')) {
              const issueId = target.getAttribute('data-issue-id');

              // Only handle issue click if Ctrl/Cmd key is pressed
              // This allows normal editing when clicking without modifier keys
              if (issueId && extension.options.onIssueClick && (event.ctrlKey || event.metaKey)) {
                extension.options.onIssueClick(issueId);
                return true; // Consume the event only for Ctrl+click
              }

              // For normal clicks, let the editor handle it normally (return false/undefined)
              // This allows text selection and editing within highlighted text
            }
            
            // Check decorations at position
            const state = highlighterKey.getState(view.state);
            if (state?.decorations) {
              const decorations = state.decorations.find(pos, pos);
              if (decorations.length > 0) {
                const decoration = decorations[0];
                const issueId = decoration.spec?.issueId;

                // Only handle issue click if Ctrl/Cmd key is pressed
                if (issueId && extension.options.onIssueClick && (event.ctrlKey || event.metaKey)) {
                  extension.options.onIssueClick(issueId);
                  return true; // Consume the event only for Ctrl+click
                }

                // For normal clicks, allow normal editing behavior
              }
            }
            
            return false;
          }
        }
      })
    ];
  },

  addCommands() {
    return {
      updateIssueHighlights: (options = {}) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(highlighterKey, {
            updateHighlights: true,
            ...options
          });
        }
        return true;
      },
      
      clearIssueHighlights: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(highlighterKey, {
            updateHighlights: true,
            issues: [],
            showHighlighting: false
          });
        }
        return true;
      },
      
      setActiveIssue: (issueId) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(highlighterKey, {
            updateHighlights: true,
            activeIssueId: issueId
          });
        }
        return true;
      }
    };
  }
});