// Decoration-based highlighting for Slate editor
// This replaces mark-based highlighting to handle complex document structures better

import { Range, Text, Path, Node } from 'slate';

export class SlateDecorationHighlighter {
  constructor() {
    this.decorations = [];
    this.issueMap = new Map();
  }

  /**
   * Generate decorations for all issues
   * This creates virtual decorations without modifying the document structure
   */
  generateDecorations(editor, issues, documentFormatting, activeIssueId) {
    const decorations = [];
    
    if (!issues || issues.length === 0) {
      return decorations;
    }

    // Process each issue to create decorations
    issues.forEach(issue => {
      try {
        const ranges = this.findIssueRanges(editor, issue, documentFormatting);
        
        ranges.forEach(range => {
          if (Range.isRange(range)) {
            decorations.push({
              ...range,
              issueId: issue.id,
              severity: issue.severity,
              isActive: issue.id === activeIssueId,
              type: 'highlight'
            });
          }
        });
      } catch (error) {
        console.warn(`Failed to create decoration for issue ${issue.id}:`, error);
      }
    });

    return decorations;
  }

  /**
   * Find all ranges where an issue should be highlighted
   */
  findIssueRanges(editor, issue, documentFormatting) {
    const ranges = [];
    
    // Skip document-level issues without specific text
    if (issue.location?.type === 'document' && !issue.highlightText) {
      return ranges;
    }

    // Determine search text
    const searchText = issue.highlightText || issue.text;
    if (!searchText || searchText.length < 2) {
      return ranges;
    }

    // Handle truncated text (ending with "...")
    const isTruncated = searchText.endsWith('...');
    const cleanSearchText = isTruncated ? searchText.slice(0, -3).trim() : searchText;

    // If we have paragraph index, search only in that paragraph
    if (issue.location?.paragraphIndex !== undefined) {
      const paragraphRanges = this.findInParagraph(
        editor,
        cleanSearchText,
        issue.location.paragraphIndex,
        isTruncated
      );
      ranges.push(...paragraphRanges);
    } else {
      // Search across entire document
      const documentRanges = this.findInDocument(editor, cleanSearchText, isTruncated);
      ranges.push(...documentRanges);
    }

    return ranges;
  }

  /**
   * Find text within a specific paragraph
   */
  findInParagraph(editor, searchText, paragraphIndex, isTruncated = false) {
    const ranges = [];
    
    try {
      // Get the paragraph node
      const paragraphPath = [paragraphIndex];
      if (!editor.hasPath(paragraphPath)) {
        return ranges;
      }

      const [paragraphNode] = Node.get(editor, paragraphPath);
      if (!paragraphNode) {
        return ranges;
      }

      // Get full paragraph text
      const fullText = Node.string(paragraphNode);
      
      // Find all occurrences
      let searchIndex = 0;
      while (searchIndex < fullText.length) {
        const index = fullText.indexOf(searchText, searchIndex);
        if (index === -1) break;

        // Calculate the range for this occurrence
        const range = this.calculateRange(
          editor,
          paragraphPath,
          index,
          isTruncated ? Math.min(searchText.length + 20, fullText.length - index) : searchText.length
        );

        if (range) {
          ranges.push(range);
        }

        searchIndex = index + 1;
      }
    } catch (error) {
      console.warn(`Error finding text in paragraph ${paragraphIndex}:`, error);
    }

    return ranges;
  }

  /**
   * Find text across entire document
   */
  findInDocument(editor, searchText, isTruncated = false) {
    const ranges = [];
    
    try {
      // Iterate through all text nodes
      const nodes = Node.nodes(editor, {
        at: [],
        match: n => Text.isText(n)
      });

      for (const [node, path] of nodes) {
        if (!Text.isText(node)) continue;
        
        const nodeText = node.text || '';
        let index = nodeText.indexOf(searchText);
        
        while (index !== -1) {
          const length = isTruncated 
            ? Math.min(searchText.length + 20, nodeText.length - index)
            : searchText.length;

          ranges.push({
            anchor: { path, offset: index },
            focus: { path, offset: index + length }
          });

          index = nodeText.indexOf(searchText, index + 1);
        }
      }
    } catch (error) {
      console.warn('Error finding text in document:', error);
    }

    return ranges;
  }

  /**
   * Calculate a range from a paragraph-relative position
   */
  calculateRange(editor, paragraphPath, startOffset, length) {
    try {
      const [paragraphNode] = Node.get(editor, paragraphPath);
      if (!paragraphNode || !paragraphNode.children) {
        return null;
      }

      let currentOffset = 0;
      
      // Find which child node contains the start position
      for (let i = 0; i < paragraphNode.children.length; i++) {
        const child = paragraphNode.children[i];
        const childText = Text.isText(child) ? child.text : '';
        const childLength = childText.length;
        
        // Check if start position is in this child
        if (startOffset >= currentOffset && startOffset < currentOffset + childLength) {
          const childPath = [...paragraphPath, i];
          const childStartOffset = startOffset - currentOffset;
          
          // Check if the entire range fits in this child
          if (childStartOffset + length <= childLength) {
            return {
              anchor: { path: childPath, offset: childStartOffset },
              focus: { path: childPath, offset: childStartOffset + length }
            };
          } else {
            // Range spans multiple children - create range for just this child
            return {
              anchor: { path: childPath, offset: childStartOffset },
              focus: { path: childPath, offset: childLength }
            };
          }
        }
        
        currentOffset += childLength;
      }
    } catch (error) {
      console.warn('Error calculating range:', error);
    }

    return null;
  }

  /**
   * Get decoration properties for rendering
   */
  getDecorationProps(decoration) {
    const baseClass = 'apa-issue-highlight transition-all duration-200';
    let className = baseClass;
    
    // Add severity-specific styles
    switch (decoration.severity) {
      case 'Critical':
        className += ' bg-red-100 border-b-2 border-red-500';
        if (decoration.isActive) className += ' bg-red-200';
        break;
      case 'Major':
        className += ' bg-orange-100 border-b-2 border-orange-500';
        if (decoration.isActive) className += ' bg-orange-200';
        break;
      case 'Minor':
        className += ' bg-blue-100 border-b-2 border-blue-500';
        if (decoration.isActive) className += ' bg-blue-200';
        break;
      default:
        className += ' bg-gray-100 border-b-2 border-gray-400';
    }

    return {
      className,
      'data-issue-id': decoration.issueId,
      'data-severity': decoration.severity,
      style: {
        cursor: 'pointer'
      }
    };
  }

  /**
   * Clear all decorations
   */
  clearDecorations() {
    this.decorations = [];
    this.issueMap.clear();
  }

  /**
   * Update active issue highlighting
   */
  updateActiveIssue(decorations, activeIssueId) {
    return decorations.map(dec => ({
      ...dec,
      isActive: dec.issueId === activeIssueId
    }));
  }
}

export const decorationHighlighter = new SlateDecorationHighlighter();