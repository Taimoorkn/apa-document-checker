// Custom Tiptap extensions for APA document formatting
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Custom extension for APA issue highlighting using decorations
 */
export const IssueHighlighter = Extension.create({
  name: 'issueHighlighter',

  addOptions() {
    return {
      issues: [],
      activeIssueId: null,
      showHighlighting: true,
      onIssueClick: null,
      documentFormatting: null
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    // Define createDecorations as a method
    const createDecorations = (doc) => {
      const decorations = [];
      const { issues, activeIssueId, showHighlighting } = extension.options;
      
      if (!showHighlighting || !issues || issues.length === 0) {
        return DecorationSet.empty;
      }
      
      issues.forEach(issue => {
        try {
          const positions = extension.findIssuePositions(doc, issue);
          
          positions.forEach(({ from, to }) => {
            const isActive = issue.id === activeIssueId;
            const className = extension.getHighlightClass(issue.severity, isActive);
            
            const decoration = Decoration.inline(from, to, {
              class: className,
              'data-issue-id': issue.id,
              'data-severity': issue.severity,
              style: 'cursor: pointer; transition: all 0.2s;'
            });
            
            decorations.push(decoration);
          });
        } catch (error) {
          console.warn(`Failed to highlight issue ${issue.id}:`, error);
        }
      });
      
      return DecorationSet.create(doc, decorations);
    };
    
    return [
      new Plugin({
        key: 'issueHighlighter',
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          
          apply(tr, oldDecorations) {
            // Clear old decorations on document change
            if (tr.docChanged) {
              return DecorationSet.empty;
            }
            
            // Check if we should update decorations
            const meta = tr.getMeta('issueHighlighter');
            if (meta?.updateDecorations) {
              return createDecorations(tr.doc);
            }
            
            // Map decorations through document changes
            return oldDecorations.map(tr.mapping, tr.doc);
          }
        },
        
        props: {
          decorations(state) {
            return this.getState(state);
          },
          
          handleClick: (view, pos, event) => {
            const { target } = event;
            if (target && target.classList?.contains('apa-issue-highlight')) {
              const issueId = target.getAttribute('data-issue-id');
              if (issueId && extension.options.onIssueClick) {
                extension.options.onIssueClick(issueId);
                return true;
              }
            }
            return false;
          }
        }
      })
    ];
  },

  // Helper method moved outside of plugin context

  findIssuePositions(doc, issue) {
    const positions = [];
    
    // Get search text
    let searchText = issue.highlightText || issue.text;
    if (!searchText || searchText.length < 2) {
      return positions;
    }
    
    // Handle truncated text
    const isTruncated = searchText.endsWith('...');
    if (isTruncated) {
      searchText = searchText.slice(0, -3).trim();
    }
    
    // Handle paragraph-specific search
    if (issue.location?.paragraphIndex !== undefined) {
      const targetPara = issue.location.paragraphIndex;
      let currentPara = 0;
      
      doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          if (currentPara === targetPara) {
            const text = node.textContent;
            let index = text.indexOf(searchText);
            
            while (index !== -1) {
              positions.push({
                from: pos + index + 1, // +1 to account for node boundary
                to: pos + index + 1 + (isTruncated ? Math.min(searchText.length + 20, text.length - index) : searchText.length)
              });
              index = text.indexOf(searchText, index + 1);
            }
            return false; // Stop searching after finding the target paragraph
          }
          currentPara++;
        }
      });
    } else {
      // Search entire document
      doc.descendants((node, pos) => {
        if (node.isText) {
          const text = node.text;
          let index = text.indexOf(searchText);
          
          while (index !== -1) {
            positions.push({
              from: pos + index,
              to: pos + index + (isTruncated ? Math.min(searchText.length + 20, text.length - index) : searchText.length)
            });
            index = text.indexOf(searchText, index + 1);
          }
        }
      });
    }
    
    return positions;
  },

  getHighlightClass(severity, isActive) {
    const base = 'apa-issue-highlight';
    let className = base;
    
    switch (severity) {
      case 'Critical':
        className += ' bg-red-100 border-b-2 border-red-500';
        if (isActive) className += ' bg-red-200';
        break;
      case 'Major':
        className += ' bg-orange-100 border-b-2 border-orange-500';
        if (isActive) className += ' bg-orange-200';
        break;
      case 'Minor':
        className += ' bg-blue-100 border-b-2 border-blue-500';
        if (isActive) className += ' bg-blue-200';
        break;
      default:
        className += ' bg-gray-100 border-b-2 border-gray-400';
    }
    
    return className;
  },

  addCommands() {
    return {
      updateIssueHighlights: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('issueHighlighter', { updateDecorations: true });
          dispatch(tr);
        }
        return true;
      },
      
      setHighlightOptions: (options) => ({ tr, dispatch }) => {
        Object.assign(this.options, options);
        if (dispatch) {
          tr.setMeta('issueHighlighter', { updateDecorations: true });
          dispatch(tr);
        }
        return true;
      }
    };
  }
});

/**
 * Custom extension for preserving document formatting
 */
export const DocumentFormatting = Extension.create({
  name: 'documentFormatting',

  addOptions() {
    return {
      documentFormatting: null
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          originalFormatting: {
            default: null,
            renderHTML: attributes => {
              if (!attributes.originalFormatting) return {};
              
              const styles = [];
              const formatting = attributes.originalFormatting;
              
              // Line spacing
              if (formatting.spacing?.line) {
                styles.push(`line-height: ${formatting.spacing.line}`);
              }
              
              // Paragraph spacing
              if (formatting.spacing?.before) {
                styles.push(`margin-top: ${formatting.spacing.before}pt`);
              }
              if (formatting.spacing?.after) {
                styles.push(`margin-bottom: ${formatting.spacing.after}pt`);
              }
              
              // Indentation
              if (formatting.indentation?.firstLine) {
                styles.push(`text-indent: ${formatting.indentation.firstLine}in`);
              }
              if (formatting.indentation?.left) {
                styles.push(`padding-left: ${formatting.indentation.left}in`);
              }
              
              return {
                style: styles.join('; ')
              };
            }
          }
        }
      }
    ];
  }
});