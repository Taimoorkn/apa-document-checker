// Custom Tiptap extensions to preserve DOCX formatting
import { Node, Mark, Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

/**
 * Custom Paragraph node that preserves DOCX paragraph formatting
 */
export const FormattedParagraph = Node.create({
  name: 'paragraph', // Use 'paragraph' name to replace default
  
  priority: 1000,
  
  group: 'block',
  
  content: 'inline*',
  
  addAttributes() {
    return {
      // Spacing attributes
      lineHeight: { default: null },
      spaceBefore: { default: null },
      spaceAfter: { default: null },
      
      // Indentation attributes
      firstLineIndent: { default: null },
      leftIndent: { default: null },
      rightIndent: { default: null },
      hangingIndent: { default: null },
      
      // Alignment
      textAlign: { default: null },
      
      // Original style name from DOCX
      styleName: { default: null },
      
      // Store complete original formatting
      originalFormatting: { default: null }
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'p',
        getAttrs: (dom) => {
          const style = dom.getAttribute('style') || '';
          const attrs = {};
          
          // Parse inline styles
          style.split(';').forEach(rule => {
            const [property, value] = rule.split(':').map(s => s.trim());
            if (property && value) {
              switch(property) {
                case 'line-height':
                  attrs.lineHeight = value;
                  break;
                case 'margin-top':
                  attrs.spaceBefore = value;
                  break;
                case 'margin-bottom':
                  attrs.spaceAfter = value;
                  break;
                case 'text-indent':
                  attrs.firstLineIndent = value;
                  break;
                case 'padding-left':
                  attrs.leftIndent = value;
                  break;
                case 'padding-right':
                  attrs.rightIndent = value;
                  break;
                case 'text-align':
                  attrs.textAlign = value;
                  break;
              }
            }
          });
          
          return attrs;
        }
      }
    ];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    const styles = [];
    
    // Apply line height
    if (node.attrs.lineHeight) {
      styles.push(`line-height: ${node.attrs.lineHeight}`);
    }
    
    // Apply spacing
    if (node.attrs.spaceBefore) {
      styles.push(`margin-top: ${node.attrs.spaceBefore}`);
    }
    if (node.attrs.spaceAfter) {
      styles.push(`margin-bottom: ${node.attrs.spaceAfter}`);
    }
    
    // Apply indentation
    if (node.attrs.firstLineIndent) {
      styles.push(`text-indent: ${node.attrs.firstLineIndent}`);
    }
    if (node.attrs.leftIndent) {
      styles.push(`padding-left: ${node.attrs.leftIndent}`);
    }
    if (node.attrs.rightIndent) {
      styles.push(`padding-right: ${node.attrs.rightIndent}`);
    }
    if (node.attrs.hangingIndent) {
      styles.push(`text-indent: -${node.attrs.hangingIndent}`);
      styles.push(`padding-left: ${node.attrs.hangingIndent}`);
    }
    
    // Apply alignment
    if (node.attrs.textAlign) {
      styles.push(`text-align: ${node.attrs.textAlign}`);
    }
    
    return ['p', { 
      ...HTMLAttributes, 
      style: styles.join('; '),
      'data-style-name': node.attrs.styleName
    }, 0];
  }
});

/**
 * Custom Text Style mark that preserves font properties
 */
export const FontFormatting = Mark.create({
  name: 'fontFormatting',
  
  priority: 101,
  
  addAttributes() {
    return {
      fontFamily: { default: null },
      fontSize: { default: null },
      color: { default: null }
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (dom) => {
          const style = dom.getAttribute('style') || '';
          const attrs = {};
          
          style.split(';').forEach(rule => {
            const [property, value] = rule.split(':').map(s => s.trim());
            if (property && value) {
              switch(property) {
                case 'font-family':
                  attrs.fontFamily = value.replace(/['"]/g, '');
                  break;
                case 'font-size':
                  attrs.fontSize = value;
                  break;
                case 'color':
                  attrs.color = value;
                  break;
              }
            }
          });
          
          return Object.keys(attrs).length > 0 ? attrs : null;
        }
      }
    ];
  },
  
  renderHTML({ mark, HTMLAttributes }) {
    const styles = [];
    
    if (mark.attrs.fontFamily) {
      styles.push(`font-family: "${mark.attrs.fontFamily}"`);
    }
    if (mark.attrs.fontSize) {
      styles.push(`font-size: ${mark.attrs.fontSize}`);
    }
    if (mark.attrs.color) {
      styles.push(`color: ${mark.attrs.color}`);
    }
    
    return ['span', { ...HTMLAttributes, style: styles.join('; ') }, 0];
  }
});

/**
 * Extension to apply document-wide default formatting
 */
export const DocumentDefaults = Extension.create({
  name: 'documentDefaults',
  
  addOptions() {
    return {
      defaultFont: 'Times New Roman',
      defaultSize: '12pt',
      defaultLineHeight: 2,
      defaultSpacing: {
        before: 0,
        after: 0
      }
    };
  },
  
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          preserveFormatting: {
            default: true,
            rendered: false
          }
        }
      }
    ];
  },
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: 'documentDefaults',
        props: {
          transformPasted(slice) {
            // Ensure pasted content preserves formatting
            return slice;
          }
        }
      })
    ];
  }
});

/**
 * Create a formatted paragraph node from DOCX data
 */
export function createFormattedParagraph(paraFormatting) {
  const attrs = {};
  
  // Extract spacing
  if (paraFormatting.spacing) {
    if (paraFormatting.spacing.line) {
      attrs.lineHeight = paraFormatting.spacing.line;
    }
    if (paraFormatting.spacing.before) {
      attrs.spaceBefore = `${paraFormatting.spacing.before}pt`;
    }
    if (paraFormatting.spacing.after) {
      attrs.spaceAfter = `${paraFormatting.spacing.after}pt`;
    }
  }
  
  // Extract indentation
  if (paraFormatting.indentation) {
    if (paraFormatting.indentation.firstLine) {
      attrs.firstLineIndent = `${paraFormatting.indentation.firstLine}in`;
    }
    if (paraFormatting.indentation.left) {
      attrs.leftIndent = `${paraFormatting.indentation.left}in`;
    }
    if (paraFormatting.indentation.right) {
      attrs.rightIndent = `${paraFormatting.indentation.right}in`;
    }
    if (paraFormatting.indentation.hanging) {
      attrs.hangingIndent = `${paraFormatting.indentation.hanging}in`;
    }
  }
  
  // Extract alignment
  if (paraFormatting.alignment) {
    attrs.textAlign = paraFormatting.alignment === 'both' ? 'justify' : paraFormatting.alignment;
  }
  
  // Store style name
  if (paraFormatting.style) {
    attrs.styleName = paraFormatting.style;
  }
  
  // Store complete original formatting
  attrs.originalFormatting = paraFormatting;
  
  return {
    type: 'paragraph', // Use 'paragraph' type name
    attrs,
    content: createFormattedContent(paraFormatting)
  };
}

/**
 * Create formatted content (text with marks) from runs
 */
export function createFormattedContent(paraFormatting) {
  const content = [];
  
  if (paraFormatting.runs && paraFormatting.runs.length > 0) {
    // Process all runs but optimize for performance
    const runsToProcess = paraFormatting.runs;
    
    runsToProcess.forEach(run => {
      // Skip completely empty runs
      if (!run.text || run.text.length === 0) return;
      
      const textNode = {
        type: 'text',
        text: run.text
      };
      
      const marks = [];
      
      // Add font formatting mark - always preserve formatting
      const fontAttrs = {};
      if (run.font?.family) {
        fontAttrs.fontFamily = run.font.family;
      }
      if (run.font?.size) {
        fontAttrs.fontSize = `${run.font.size}pt`;
      }
      if (run.color) {
        fontAttrs.color = run.color.startsWith('#') ? run.color : `#${run.color}`;
      }
      
      if (Object.keys(fontAttrs).length > 0) {
        marks.push({
          type: 'fontFormatting',
          attrs: fontAttrs
        });
      }
      
      // Add standard marks
      if (run.font?.bold) {
        marks.push({ type: 'bold' });
      }
      if (run.font?.italic) {
        marks.push({ type: 'italic' });
      }
      if (run.font?.underline) {
        marks.push({ type: 'underline' });
      }
      
      if (marks.length > 0) {
        textNode.marks = marks;
      }
      
      content.push(textNode);
    });
  } else if (paraFormatting.text) {
    // Fallback to plain text
    const textNode = {
      type: 'text',
      text: paraFormatting.text
    };
    
    // Apply paragraph-level font if available
    if (paraFormatting.font) {
      const fontAttrs = {};
      if (paraFormatting.font.family) {
        fontAttrs.fontFamily = paraFormatting.font.family;
      }
      if (paraFormatting.font.size) {
        fontAttrs.fontSize = `${paraFormatting.font.size}pt`;
      }
      
      if (Object.keys(fontAttrs).length > 0) {
        textNode.marks = [{
          type: 'fontFormatting',
          attrs: fontAttrs
        }];
      }
    }
    
    content.push(textNode);
  }
  
  // Ensure no empty text nodes - Tiptap doesn't allow them
  const validContent = content.filter(node => {
    if (node.type === 'text' && (!node.text || node.text.length === 0)) {
      return false;
    }
    return true;
  });
  
  // If no valid content, return a text node with at least a space
  return validContent.length > 0 ? validContent : [{ type: 'text', text: ' ' }];
}