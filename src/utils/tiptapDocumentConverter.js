// Tiptap document converter - converts server formatting to Tiptap JSON
import { createFormattedParagraph, createFormattedContent } from './tiptapFormattingExtensions';

export class TiptapDocumentConverter {
  constructor() {
    this.memoryMonitor = {
      enabled: typeof performance !== 'undefined' && performance.memory,
      initialMemory: 0,
      peakMemory: 0
    };
  }

  /**
   * Yield control back to the UI thread
   */
  async yieldToUI() {
    return new Promise(resolve => {
      // Use MessageChannel for proper yielding if available, otherwise setTimeout
      if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        channel.port2.onmessage = () => resolve();
        channel.port1.postMessage(null);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Monitor memory usage during processing
   */
  checkMemoryUsage() {
    if (this.memoryMonitor.enabled) {
      const currentMemory = performance.memory.usedJSHeapSize;
      this.memoryMonitor.peakMemory = Math.max(this.memoryMonitor.peakMemory, currentMemory);

      // Warn if memory usage is high
      if (currentMemory > 100 * 1024 * 1024) { // 100MB threshold
        console.warn(`⚠️ High memory usage detected: ${Math.round(currentMemory / 1024 / 1024)}MB`);
      }

      return {
        current: currentMemory,
        peak: this.memoryMonitor.peakMemory,
        initial: this.memoryMonitor.initialMemory
      };
    }
    return null;
  }

  /**
   * Convert server document formatting to Tiptap JSON format (async with UI yielding)
   */
  async convertToTiptapDocument(documentText, documentFormatting) {
    // Initialize memory monitoring
    if (this.memoryMonitor.enabled) {
      this.memoryMonitor.initialMemory = performance.memory.usedJSHeapSize;
      this.memoryMonitor.peakMemory = this.memoryMonitor.initialMemory;
    }

    if (!documentFormatting?.paragraphs?.length) {
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: documentText || ' ' // Ensure non-empty text
          }]
        }]
      };
    }

    const content = [];
    const paragraphsToProcess = documentFormatting.paragraphs;

    // Dynamic batch sizing based on document size
    const batchSize = paragraphsToProcess.length > 1000 ? 50 : 100;
    const yieldInterval = 10; // Yield to UI every 10 batches
    let processedBatches = 0;
    const startTime = performance.now();

    console.log(`📄 Processing ${paragraphsToProcess.length} paragraphs in batches of ${batchSize}...`);

    // Log initial memory usage
    const initialMemory = this.checkMemoryUsage();
    if (initialMemory) {
      console.log(`💾 Initial memory usage: ${Math.round(initialMemory.current / 1024 / 1024)}MB`);
    }

    for (let i = 0; i < paragraphsToProcess.length; i += batchSize) {
      const batch = paragraphsToProcess.slice(i, Math.min(i + batchSize, paragraphsToProcess.length));

      // Process batch synchronously but yield to UI between batches
      batch.forEach((paraFormatting, batchIndex) => {
        const index = i + batchIndex;
        try {
          const paragraph = this.createParagraphNode(paraFormatting);
          if (paragraph) {
            content.push(paragraph);
          }
        } catch (error) {
          console.warn(`Failed to create paragraph ${index}:`, error);
          // Add a simple fallback paragraph - ensure text is not empty
          const fallbackText = paraFormatting.text || ' '; // Use space if empty
          content.push({
            type: 'paragraph',
            content: [{
              type: 'text',
              text: fallbackText
            }]
          });
        }
      });

      processedBatches++;

      // Yield to UI thread every few batches for large documents
      if (processedBatches % yieldInterval === 0) {
        await this.yieldToUI();

        // Check memory usage
        const memoryInfo = this.checkMemoryUsage();

        // Log progress for large documents
        if (paragraphsToProcess.length > 500) {
          const processed = Math.min(i + batchSize, paragraphsToProcess.length);
          const percent = Math.round((processed / paragraphsToProcess.length) * 100);
          const memoryText = memoryInfo ? ` | Memory: ${Math.round(memoryInfo.current / 1024 / 1024)}MB` : '';
          console.log(`📊 Processed ${processed} of ${paragraphsToProcess.length} paragraphs (${percent}%)${memoryText}`);
        }
      }
    }

    // Log completion statistics
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    const finalMemory = this.checkMemoryUsage();

    console.log(`✅ Document conversion completed in ${Math.round(processingTime)}ms`);
    if (finalMemory) {
      const memoryUsed = Math.round((finalMemory.peak - finalMemory.initial) / 1024 / 1024);
      console.log(`💾 Peak memory usage: ${Math.round(finalMemory.peak / 1024 / 1024)}MB (+${memoryUsed}MB)`);
    }

    // Ensure at least one paragraph with non-empty text
    if (content.length === 0) {
      content.push({
        type: 'paragraph',
        content: [{
          type: 'text',
          text: ' ' // Use space instead of empty string
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