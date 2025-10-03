'use client';

/**
 * Position Calculator - Converts text-based positions to ProseMirror positions
 *
 * This utility bridges the gap between text-based analysis (which uses paragraph indices
 * and character offsets) and ProseMirror's absolute position system.
 *
 * Key Concepts:
 * - Text-based: paragraphIndex + charOffset (how analyzers find issues)
 * - ProseMirror: absolute position from document start (how editor locates content)
 */

export class PositionCalculator {
  /**
   * Build a position map from editor document structure
   * This creates a mapping between text paragraph indices and ProseMirror positions
   *
   * Maps both getText() newline-based indices AND actual Tiptap paragraph indices
   *
   * @param {Editor} editor - Tiptap editor instance
   * @returns {Object} Position map with paragraph metadata
   */
  static buildPositionMap(editor) {
    if (!editor || !editor.state) {
      console.error('❌ PositionCalculator: Invalid editor instance');
      return null;
    }

    const { doc } = editor.state;
    const paragraphMap = [];
    let tiptapParagraphIndex = 0;

    // Build mapping from Tiptap paragraphs
    doc.descendants((node, pos) => {
      // Only track block-level content nodes (paragraphs and headings)
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        paragraphMap.push({
          tiptapIndex: tiptapParagraphIndex,
          pmPosition: pos,
          nodeSize: node.nodeSize,
          textContent: node.textContent,
          textLength: node.textContent.length,
          nodeType: node.type.name
        });
        tiptapParagraphIndex++;
      }
    });

    return {
      paragraphs: paragraphMap,
      totalParagraphs: paragraphMap.length,
      buildTime: Date.now()
    };
  }

  /**
   * Convert text-based position to ProseMirror position
   *
   * @param {Object} location - Text-based location { paragraphIndex, charOffset, length }
   * @param {Object} positionMap - Map built from buildPositionMap()
   * @param {string} searchText - Optional text to search for (fallback if position is wrong)
   * @param {Editor} editor - Editor instance for fallback search
   * @returns {Object|null} ProseMirror position { from, to } or null if not found
   */
  static textToProseMirrorPosition(location, positionMap, searchText = null, editor = null) {
    if (!location || !positionMap) {
      return null;
    }

    // SIMPLIFIED APPROACH: Given the mismatch between text-based indices (from getText().split('\n'))
    // and Tiptap's actual paragraph structure, the most reliable approach is to use text search.
    // The paragraph index is unreliable, so prioritize searchText.

    if (searchText && editor) {
      // Primary: Use text search (reliable)
      const found = this.findTextInDocument(editor, searchText);
      if (found) {
        return found;
      }
    }

    // Fallback: Try paragraph-based calculation (may fail due to index mismatch)
    const { paragraphIndex, charOffset, length } = location;

    // Try to find paragraph by index (knowing it may be wrong)
    const paragraph = positionMap.paragraphs.find(p => p.tiptapIndex === paragraphIndex);

    if (!paragraph) {
      // Index mismatch expected - this is normal
      return null;
    }

    // Calculate ProseMirror positions
    const from = paragraph.pmPosition + 1 + (charOffset || 0);
    const to = from + (length || searchText?.length || 0);

    // Validate positions
    const maxPosition = paragraph.pmPosition + paragraph.nodeSize;
    if (to > maxPosition) {
      // Position calculation failed
      return null;
    }

    return { from, to };
  }

  /**
   * Find text in document (fallback when position calculation fails)
   *
   * @param {Editor} editor - Tiptap editor instance
   * @param {string} searchText - Text to find
   * @param {boolean} caseSensitive - Whether search is case-sensitive
   * @returns {Object|null} First found position { from, to } or null
   */
  static findTextInDocument(editor, searchText, caseSensitive = true) {
    if (!editor || !searchText) {
      return null;
    }

    const { doc } = editor.state;
    const searchLower = caseSensitive ? searchText : searchText.toLowerCase();
    let foundPosition = null;

    doc.descendants((node, pos) => {
      if (foundPosition) return false; // Already found

      if (node.isText) {
        const text = node.text;
        const textToSearch = caseSensitive ? text : text.toLowerCase();
        const index = textToSearch.indexOf(searchLower);

        if (index !== -1) {
          foundPosition = {
            from: pos + index,
            to: pos + index + searchText.length
          };
          return false;
        }
      } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        const text = node.textContent;
        const textToSearch = caseSensitive ? text : text.toLowerCase();
        const index = textToSearch.indexOf(searchLower);

        if (index !== -1) {
          foundPosition = {
            from: pos + 1 + index,
            to: pos + 1 + index + searchText.length
          };
          return false;
        }
      }
    });

    return foundPosition;
  }

  /**
   * Convert multiple text-based locations to ProseMirror positions
   * Useful for batch processing issues
   *
   * @param {Array} issues - Issues with location property
   * @param {Object} positionMap - Map from buildPositionMap()
   * @param {Editor} editor - Editor instance for fallback searches
   * @returns {Array} Issues with added pmPosition property
   */
  static enrichIssuesWithPositions(issues, positionMap, editor) {
    if (!Array.isArray(issues) || !positionMap) {
      return issues;
    }

    return issues.map(issue => {
      if (!issue.location) {
        return issue;
      }

      const searchText = issue.highlightText || issue.text;
      const pmPosition = this.textToProseMirrorPosition(
        issue.location,
        positionMap,
        searchText,
        editor
      );

      return {
        ...issue,
        pmPosition // Add ProseMirror position alongside text-based location
      };
    });
  }

  /**
   * Validate that a position is still accurate after document changes
   * Checks if the text at the position still matches expected content
   *
   * @param {Editor} editor - Tiptap editor instance
   * @param {Object} position - ProseMirror position { from, to }
   * @param {string} expectedText - Text that should be at this position
   * @returns {boolean} True if position is still valid
   */
  static validatePosition(editor, position, expectedText) {
    if (!editor || !position || !expectedText) {
      return false;
    }

    try {
      const { doc } = editor.state;
      const { from, to } = position;

      // Check bounds
      if (from < 0 || to > doc.content.size || from >= to) {
        return false;
      }

      // Get text at position
      const actualText = doc.textBetween(from, to, ' ');

      // Compare (case-sensitive)
      return actualText === expectedText;
    } catch (error) {
      console.error('❌ Position validation failed:', error);
      return false;
    }
  }
}
