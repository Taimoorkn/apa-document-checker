'use client';

/**
 * Tiptap-Native APA Analyzer
 *
 * Analyzes Tiptap document structure directly (not text split by newlines)
 * Generates issues with accurate ProseMirror positions from the start
 *
 * This is the CORRECT architecture - single source of truth (Tiptap)
 */

import { EnhancedAPAAnalyzer } from './enhancedApaAnalyzer';

export class TiptapAPAAnalyzer {
  constructor() {
    // Use existing validators from EnhancedAPAAnalyzer
    this.baseAnalyzer = new EnhancedAPAAnalyzer();
  }

  /**
   * Analyze document using Tiptap editor instance
   * Returns issues with pmPosition already calculated
   *
   * @param {Editor} editor - Tiptap editor instance
   * @param {Object} formatting - Document formatting metadata (from DocumentModel)
   * @param {Object} structure - Document structure metadata (from DocumentModel)
   * @returns {Array} Issues with pmPosition
   */
  analyzeDocument(editor, formatting = null, structure = null) {
    if (!editor || !editor.state) {
      console.error('❌ TiptapAPAAnalyzer: Invalid editor instance');
      return [];
    }

    const { doc } = editor.state;

    // Build paragraph array that matches Tiptap structure
    const tiptapParagraphs = [];
    const paragraphPositions = [];

    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        tiptapParagraphs.push(node.textContent);
        paragraphPositions.push({
          pos,
          nodeSize: node.nodeSize,
          textContent: node.textContent,
          nodeType: node.type.name
        });
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 TiptapAPAAnalyzer: Found ${paragraphPositions.length} Tiptap paragraphs`);
    }

    // Create document data structure that matches what analyzer expects
    const documentData = {
      text: tiptapParagraphs.join('\n'), // Now indices match!
      html: editor.getHTML(),
      formatting,
      structure,
      styles: null
    };

    // Run existing analyzer
    const rawIssues = this.baseAnalyzer.analyzeDocument(documentData);

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 TiptapAPAAnalyzer: Base analyzer found ${rawIssues.length} raw issues`);
    }

    // Enrich issues with pmPosition using our paragraph mapping
    const enrichedIssues = rawIssues.map(issue => {
      if (!issue.location || issue.location.type === 'document') {
        // Document-level issues don't get positions
        return issue;
      }

      const { paragraphIndex, charOffset, length } = issue.location;

      // Now paragraphIndex matches Tiptap structure!
      if (paragraphIndex !== undefined && paragraphIndex < paragraphPositions.length) {
        const para = paragraphPositions[paragraphIndex];
        const searchText = issue.highlightText || issue.text;

        // Calculate ProseMirror position
        const from = para.pos + 1 + (charOffset || 0);
        const to = from + (length || searchText?.length || 0);

        // Validate position
        const maxPosition = para.pos + para.nodeSize;
        if (to <= maxPosition && from < to) {
          // Verify text at position matches
          const textAtPosition = doc.textBetween(from, to, ' ');
          if (textAtPosition === searchText || textAtPosition.includes(searchText?.substring(0, 10))) {
            return {
              ...issue,
              pmPosition: { from, to }
            };
          }
        }

        // If position invalid or text mismatch, try text search within paragraph
        if (searchText) {
          const found = this.findTextInParagraph(doc, para.pos, searchText);
          if (found) {
            return {
              ...issue,
              pmPosition: found
            };
          }
        }
      }

      // Fallback: search entire document
      const searchText = issue.highlightText || issue.text;
      if (searchText) {
        const found = this.findTextInDocument(doc, searchText);
        if (found) {
          return {
            ...issue,
            pmPosition: found
          };
        }
      }

      return issue; // No position found
    });

    const withPositions = enrichedIssues.filter(i => i.pmPosition).length;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ TiptapAPAAnalyzer: ${withPositions}/${enrichedIssues.length} issues have pmPosition`);
    }

    return enrichedIssues;
  }

  /**
   * Find text within a specific paragraph
   */
  findTextInParagraph(doc, paragraphPos, searchText) {
    if (!searchText) return null;

    let foundPosition = null;

    doc.nodeAt(paragraphPos)?.descendants((node, pos) => {
      if (foundPosition) return false;

      if (node.isText) {
        const index = node.text.indexOf(searchText);
        if (index !== -1) {
          foundPosition = {
            from: paragraphPos + pos + index + 1,
            to: paragraphPos + pos + index + searchText.length + 1
          };
          return false;
        }
      }
    });

    return foundPosition;
  }

  /**
   * Find text anywhere in document (fallback)
   */
  findTextInDocument(doc, searchText) {
    if (!searchText) return null;

    let foundPosition = null;

    doc.descendants((node, pos) => {
      if (foundPosition) return false;

      if (node.isText) {
        const index = node.text.indexOf(searchText);
        if (index !== -1) {
          foundPosition = {
            from: pos + index,
            to: pos + index + searchText.length
          };
          return false;
        }
      } else if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        const text = node.textContent;
        const index = text.indexOf(searchText);
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
}
