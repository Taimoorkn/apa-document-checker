// Tiptap Issue Highlighter - Decoration-based highlighting for APA issues
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const highlighterKey = new PluginKey('issueHighlighter');

// Helper functions defined outside the extension
function findTextInNode(text, searchText, basePos, positions, isTruncated, caseSensitive = true) {
  // Normalize text for search
  const searchIn = caseSensitive ? text : text.toLowerCase();
  const searchFor = caseSensitive ? searchText : searchText.toLowerCase();

  let index = searchIn.indexOf(searchFor);

  while (index !== -1) {
    const from = basePos + index;
    const to = from + (isTruncated
      ? Math.min(searchText.length + 20, text.length - index)
      : searchText.length);

    positions.push({ from, to });

    // Look for next occurrence
    index = searchIn.indexOf(searchFor, index + 1);
  }
}

function searchInParagraph(doc, searchText, paragraphIndex, positions, isTruncated, caseSensitive = true) {
  let currentPara = 0;
  let found = false;
  let totalParas = 0;

  // First count total paragraphs
  doc.descendants((node) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      totalParas++;
    }
  });

  doc.descendants((node, pos) => {
    if (found) return false;

    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (currentPara === paragraphIndex) {
        const text = node.textContent;
        findTextInNode(text, searchText, pos + 1, positions, isTruncated, caseSensitive);
        found = true;

        // Debug: log paragraph search results
        if (positions.length === 0 && process.env.NODE_ENV === 'development' && debugLogCount < MAX_DEBUG_LOGS) {
          console.log(`🔍 Paragraph search failed: para ${paragraphIndex}/${totalParas}, text: "${text.substring(0, 60)}", search: "${searchText.substring(0, 40)}"`);
        }

        return false;
      }
      currentPara++;
    }
  });

  // Debug: log if paragraph index out of range
  if (!found && process.env.NODE_ENV === 'development' && debugLogCount < MAX_DEBUG_LOGS) {
    console.log(`🔍 Paragraph ${paragraphIndex} NOT FOUND (document has ${totalParas} paragraphs)`);
  }
}

function searchInDocument(doc, searchText, positions, isTruncated, caseSensitive = true) {
  let checkedNodes = 0;
  let checkedBlocks = 0;
  const searchIn = caseSensitive ? searchText : searchText.toLowerCase();

  doc.descendants((node, pos) => {
    if (node.isText) {
      checkedNodes++;
      const text = node.text;
      findTextInNode(text, searchText, pos, positions, isTruncated, caseSensitive);
    } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      checkedBlocks++;
      // For block nodes, check if their text content matches
      const text = node.textContent;
      const nodeTextSearch = caseSensitive ? text : text.toLowerCase();

      // Only search within this node if it contains the search text
      if (nodeTextSearch.includes(searchIn)) {
        // For single-word headings or exact matches, find the position
        if (text.trim() === searchText || nodeTextSearch.trim() === searchIn) {
          // Exact match - highlight the entire node content
          const from = pos + 1;
          const to = from + text.length;
          positions.push({ from, to });
        } else {
          // Partial match - find specific position within text
          findTextInNode(text, searchText, pos + 1, positions, isTruncated, caseSensitive);
        }
      }
    }
  });

  // Debug: log search attempts for first few issues
  if (process.env.NODE_ENV === 'development' && positions.length === 0 && debugLogCount < MAX_DEBUG_LOGS) {
    console.log(`🔍 Document search failed: "${searchText.substring(0, 30)}", checked ${checkedBlocks} blocks, ${checkedNodes} text nodes`);
  }
}

// Global counter for debug logging (only log first few failures)
let debugLogCount = 0;
const MAX_DEBUG_LOGS = 5;

function findIssuePositions(doc, issue) {
  const positions = [];

  console.log(`\n🎨 [TiptapIssueHighlighter] Finding position for: "${issue.title.substring(0, 40)}..."`);

  // NEW: Use ProseMirror position if available (from position enrichment)
  if (issue.pmPosition) {
    const { from, to } = issue.pmPosition;
    console.log(`   📍 Has pmPosition: from=${from}, to=${to}`);

    // Validate position is within document bounds
    if (from >= 0 && to <= doc.content.size && from < to) {
      const textAtPosition = doc.textBetween(from, to, ' ');
      console.log(`   ✅ pmPosition valid, text: "${textAtPosition.substring(0, 30)}..."`);
      positions.push({ from, to });
      return positions;
    } else {
      console.warn(`   ⚠️ [TiptapIssueHighlighter] Invalid pmPosition:`);
      console.warn(`      from=${from}, to=${to}, docSize=${doc.content.size}`);
      console.warn(`      Falling back to legacy search...`);
      // Fall through to legacy search
    }
  } else {
    console.log(`   ⚪ No pmPosition, using legacy search`);
  }

  // LEGACY FALLBACK: Search-based positioning (for old issues or when pmPosition failed)

  // Skip document-level issues without specific text
  if (issue.location?.type === 'document' && !issue.highlightText && !issue.text) {
    console.log(`   ⚪ Document-level issue, no text to highlight`);
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

  // For multi-line search text, try first line only (common for headings with extra context)
  const hasNewlines = searchText.includes('\n');
  const firstLineText = hasNewlines ? searchText.split('\n')[0].trim() : searchText;

  // Try case-sensitive search first
  if (issue.location?.paragraphIndex !== undefined) {
    searchInParagraph(doc, searchText, issue.location.paragraphIndex, positions, isTruncated, true);
  } else {
    searchInDocument(doc, searchText, positions, isTruncated, true);
  }

  // If no results and text has newlines, try first line only
  if (positions.length === 0 && hasNewlines && firstLineText.length >= 2) {
    if (issue.location?.paragraphIndex !== undefined) {
      searchInParagraph(doc, firstLineText, issue.location.paragraphIndex, positions, false, true);
    } else {
      searchInDocument(doc, firstLineText, positions, false, true);
    }
  }

  // If still no results, try case-insensitive search
  if (positions.length === 0) {
    const textToSearch = hasNewlines && firstLineText.length >= 2 ? firstLineText : searchText;
    if (issue.location?.paragraphIndex !== undefined) {
      searchInParagraph(doc, textToSearch, issue.location.paragraphIndex, positions, isTruncated, false);
    } else {
      searchInDocument(doc, textToSearch, positions, isTruncated, false);
    }
  }

  // FALLBACK: If paragraph search failed (wrong index or text not in that paragraph),
  // try document-wide search as last resort
  if (positions.length === 0 && issue.location?.paragraphIndex !== undefined) {
    const textToSearch = hasNewlines && firstLineText.length >= 2 ? firstLineText : searchText;

    // Try case-sensitive first
    searchInDocument(doc, textToSearch, positions, isTruncated, true);

    // Then case-insensitive
    if (positions.length === 0) {
      searchInDocument(doc, textToSearch, positions, isTruncated, false);
    }
  }

  // Debug logging for first few failures
  if (positions.length === 0 && process.env.NODE_ENV === 'development' && debugLogCount < MAX_DEBUG_LOGS && searchText.length > 2) {
    debugLogCount++;

    // Get sample of document content
    let documentBlocks = [];
    doc.descendants((node) => {
      if ((node.type.name === 'paragraph' || node.type.name === 'heading') && documentBlocks.length < 10) {
        documentBlocks.push({
          type: node.type.name,
          text: node.textContent.substring(0, 50)
        });
      }
    });

    console.log(`🔍 DEBUG: Failed to find text for issue "${issue.title}"`, {
      searchText: searchText.substring(0, 60),
      firstLineText: firstLineText.substring(0, 60),
      hasNewlines,
      paragraphIndex: issue.location?.paragraphIndex,
      documentSampleBlocks: documentBlocks
    });
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

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   🎨 [TiptapIssueHighlighter] CREATING DECORATIONS   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Total issues to highlight: ${issues.length}`);
  console.log(`Active issue ID: ${activeIssueId || 'none'}`);

  // Reset debug counter for each decoration cycle
  debugLogCount = 0;

  const decorations = [];
  let issuesWithPositions = 0;
  let issuesWithoutPositions = 0;

  issues.forEach(issue => {
    try {
      const positions = findIssuePositions(doc, issue);

      if (positions.length === 0) {
        issuesWithoutPositions++;
        if (process.env.NODE_ENV === 'development') {
          // Sample document text to see what we're searching in
          let documentSample = '';
          if (issue.highlightText || issue.text) {
            const searchText = (issue.highlightText || issue.text).substring(0, 30);
            // Get first 200 chars of document for context
            let fullText = '';
            doc.descendants((node) => {
              if (node.isText && fullText.length < 200) {
                fullText += node.text + ' ';
              }
            });
            documentSample = fullText.substring(0, 200);
          }

          console.log(`⚠️ No position found for issue:`, {
            id: issue.id,
            title: issue.title,
            category: issue.category,
            highlightText: issue.highlightText?.substring(0, 50),
            text: issue.text?.substring(0, 50),
            locationType: issue.location?.type,
            paragraphIndex: issue.location?.paragraphIndex,
            documentSample: documentSample ? documentSample.substring(0, 100) : 'N/A'
          });
        }
      } else {
        issuesWithPositions++;
      }

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
      console.warn(`   ❌ [TiptapIssueHighlighter] Failed to highlight issue ${issue.id}:`, error);
    }
  });

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  📊 [TiptapIssueHighlighter] DECORATION SUMMARY      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`✅ Issues with positions: ${issuesWithPositions}`);
  console.log(`❌ Issues without positions: ${issuesWithoutPositions}`);
  console.log(`🎨 Total decorations created: ${decorations.length}`);
  console.log('═══════════════════════════════════════════════════════\n');

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