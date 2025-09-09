// Tiptap document converter - converts server formatting to Tiptap JSON
import { createFormattedParagraph, createFormattedContent } from './tiptapFormattingExtensions';

export class TiptapDocumentConverter {
  /**
   * Convert server document formatting to Tiptap JSON format
   */
  convertToTiptapDocument(documentText, documentFormatting) {
    if (!documentFormatting?.paragraphs?.length) {
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: documentText || ''
          }]
        }]
      };
    }

    const content = [];
    
    documentFormatting.paragraphs.forEach((paraFormatting) => {
      const paragraph = this.createParagraphNode(paraFormatting);
      if (paragraph) {
        content.push(paragraph);
      }
    });

    // Ensure at least one paragraph
    if (content.length === 0) {
      content.push({
        type: 'paragraph',
        content: [{
          type: 'text',
          text: ''
        }]
      });
    }

    return {
      type: 'doc',
      content
    };
  }

  /**
   * Create a Tiptap paragraph node from server formatting
   */
  createParagraphNode(paraFormatting) {
    // Check if it's a heading or regular paragraph
    const nodeType = this.determineNodeType(paraFormatting);
    
    if (nodeType === 'heading') {
      // Create heading with formatting
      return {
        type: 'heading',
        attrs: {
          level: this.getHeadingLevel(paraFormatting.style || ''),
          originalFormatting: paraFormatting
        },
        content: createFormattedContent(paraFormatting)
      };
    } else {
      // Use the formatted paragraph creator for regular paragraphs
      return createFormattedParagraph(paraFormatting);
    }
  }

  /**
   * Determine node type from paragraph style
   */
  determineNodeType(paraFormatting) {
    if (paraFormatting?.style) {
      const style = paraFormatting.style.toLowerCase();
      if (style.includes('title')) return 'heading';
      if (style.includes('heading')) {
        return 'heading';
      }
    }
    return 'paragraph';
  }

  /**
   * Get heading level from style
   */
  getHeadingLevel(style) {
    const match = style.match(/heading\s*(\d+)/i);
    if (match) {
      return Math.min(6, Math.max(1, parseInt(match[1])));
    }
    return 1;
  }

  /**
   * Create content nodes from runs or text
   */
  createContentNodes(paraFormatting) {
    const content = [];
    
    if (paraFormatting.runs && paraFormatting.runs.length > 0) {
      // Process each run
      paraFormatting.runs.forEach(run => {
        if (run.text) {
          const textNode = this.createTextNode(run);
          if (textNode) {
            content.push(textNode);
          }
        }
      });
    } else if (paraFormatting.text) {
      // Fallback to paragraph text
      content.push({
        type: 'text',
        text: paraFormatting.text,
        marks: this.extractTextMarks({
          font: paraFormatting.font
        })
      });
    }

    return content;
  }

  /**
   * Create a text node with marks
   */
  createTextNode(run) {
    const node = {
      type: 'text',
      text: run.text
    };

    const marks = this.extractTextMarks(run);
    if (marks.length > 0) {
      node.marks = marks;
    }

    return node;
  }

  /**
   * Extract marks (formatting) for text
   */
  extractTextMarks(run) {
    const marks = [];
    
    if (run.font?.bold) {
      marks.push({ type: 'bold' });
    }
    
    if (run.font?.italic) {
      marks.push({ type: 'italic' });
    }
    
    if (run.font?.underline) {
      marks.push({ type: 'underline' });
    }
    
    // Font family
    if (run.font?.family) {
      marks.push({
        type: 'textStyle',
        attrs: {
          fontFamily: run.font.family
        }
      });
    }
    
    // Font size
    if (run.font?.size) {
      marks.push({
        type: 'textStyle',
        attrs: {
          fontSize: `${run.font.size}pt`
        }
      });
    }
    
    // Color
    if (run.color) {
      marks.push({
        type: 'textStyle',
        attrs: {
          color: run.color.startsWith('#') ? run.color : `#${run.color}`
        }
      });
    }

    return marks;
  }

  /**
   * Extract paragraph-level attributes
   */
  extractParagraphAttributes(paraFormatting) {
    const attrs = {};
    
    // For headings, set the level
    if (paraFormatting?.style?.toLowerCase().includes('heading')) {
      attrs.level = this.getHeadingLevel(paraFormatting.style);
    }
    
    // Text alignment
    if (paraFormatting.alignment && paraFormatting.alignment !== 'left') {
      attrs.textAlign = paraFormatting.alignment;
    }
    
    // Store original formatting data for reference
    attrs.originalFormatting = {
      spacing: paraFormatting.spacing,
      indentation: paraFormatting.indentation,
      font: paraFormatting.font,
      style: paraFormatting.style
    };

    return attrs;
  }

  /**
   * Apply custom CSS styles based on original formatting
   */
  getCustomStyles(formatting) {
    const styles = {};
    
    // Line spacing
    if (formatting?.spacing?.line) {
      styles.lineHeight = formatting.spacing.line;
    }
    
    // Paragraph spacing
    if (formatting?.spacing?.before) {
      styles.marginTop = `${formatting.spacing.before}pt`;
    }
    if (formatting?.spacing?.after) {
      styles.marginBottom = `${formatting.spacing.after}pt`;
    }
    
    // Indentation
    if (formatting?.indentation?.firstLine) {
      styles.textIndent = `${formatting.indentation.firstLine}in`;
    }
    if (formatting?.indentation?.left) {
      styles.paddingLeft = `${formatting.indentation.left}in`;
    }
    if (formatting?.indentation?.right) {
      styles.paddingRight = `${formatting.indentation.right}in`;
    }
    
    return styles;
  }

  /**
   * Create decorations for issue highlighting
   */
  createIssueDecorations(editor, issues, documentFormatting) {
    const decorations = [];
    
    issues.forEach(issue => {
      try {
        const positions = this.findIssuePositions(editor, issue, documentFormatting);
        
        positions.forEach(pos => {
          decorations.push({
            from: pos.from,
            to: pos.to,
            class: this.getIssueHighlightClass(issue.severity),
            attrs: {
              'data-issue-id': issue.id,
              'data-severity': issue.severity
            }
          });
        });
      } catch (error) {
        console.warn(`Failed to create decoration for issue ${issue.id}:`, error);
      }
    });
    
    return decorations;
  }

  /**
   * Find positions for issue highlighting in Tiptap document
   */
  findIssuePositions(editor, issue, documentFormatting) {
    const positions = [];
    const { state } = editor;
    const { doc } = state;
    
    // Get search text
    const searchText = issue.highlightText || issue.text;
    if (!searchText || searchText.length < 2) {
      return positions;
    }
    
    const cleanSearchText = searchText.endsWith('...') 
      ? searchText.slice(0, -3).trim() 
      : searchText;
    
    // Search in document
    let from = 0;
    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text;
        let index = text.indexOf(cleanSearchText);
        
        while (index !== -1) {
          positions.push({
            from: pos + index,
            to: pos + index + cleanSearchText.length
          });
          index = text.indexOf(cleanSearchText, index + 1);
        }
      }
    });
    
    return positions;
  }

  /**
   * Get CSS class for issue severity
   */
  getIssueHighlightClass(severity) {
    const baseClass = 'apa-issue-highlight';
    switch (severity) {
      case 'Critical':
        return `${baseClass} bg-red-100 border-b-2 border-red-500 hover:bg-red-200`;
      case 'Major':
        return `${baseClass} bg-orange-100 border-b-2 border-orange-500 hover:bg-orange-200`;
      case 'Minor':
        return `${baseClass} bg-blue-100 border-b-2 border-blue-500 hover:bg-blue-200`;
      default:
        return `${baseClass} bg-gray-100 border-b-2 border-gray-400`;
    }
  }
}

export const tiptapConverter = new TiptapDocumentConverter();