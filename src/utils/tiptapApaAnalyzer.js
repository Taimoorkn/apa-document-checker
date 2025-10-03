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
      console.error('❌ [TiptapAPAAnalyzer] Invalid editor instance');
      return [];
    }

    const { doc } = editor.state;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔬 [TiptapAPAAnalyzer] ANALYSIS START');
    console.log('═══════════════════════════════════════════════════════');

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

    console.log(`📊 [TiptapAPAAnalyzer] Built paragraph map:`);
    console.log(`   • Total Tiptap paragraphs: ${paragraphPositions.length}`);
    console.log(`   • Document size: ${doc.content.size} positions`);

    // Create document data structure that matches what analyzer expects
    const documentData = {
      text: tiptapParagraphs.join('\n'), // Now indices match!
      html: editor.getHTML(),
      formatting,
      structure,
      styles: null
    };

    console.log(`📝 [TiptapAPAAnalyzer] Created document data for base analyzer`);

    // Run existing analyzer
    const rawIssues = this.baseAnalyzer.analyzeDocument(documentData);

    console.log(`🔍 [TiptapAPAAnalyzer] Base analyzer results:`);
    console.log(`   • Raw issues found: ${rawIssues.length}`);

    console.log(`\n🎯 [TiptapAPAAnalyzer] POSITION ENRICHMENT PHASE`);
    console.log('───────────────────────────────────────────────────────');

    let positionCalculated = 0;
    let paragraphSearchUsed = 0;
    let documentSearchUsed = 0;
    let noPositionFound = 0;

    // Enrich issues with pmPosition using our paragraph mapping
    const enrichedIssues = rawIssues.map((issue, index) => {
      if (!issue.location || issue.location.type === 'document') {
        // Document-level issues don't get positions
        console.log(`⚪ Issue ${index + 1}: "${issue.title.substring(0, 40)}..." - Document-level (no position)`);
        return issue;
      }

      const { paragraphIndex, charOffset, length } = issue.location;
      const searchText = issue.highlightText || issue.text;

      console.log(`\n🔹 Issue ${index + 1}: "${issue.title.substring(0, 40)}..."`);
      console.log(`   Location: paragraphIndex=${paragraphIndex}, charOffset=${charOffset}, length=${length}`);

      // Now paragraphIndex matches Tiptap structure!
      if (paragraphIndex !== undefined && paragraphIndex < paragraphPositions.length) {
        const para = paragraphPositions[paragraphIndex];
        console.log(`   Found paragraph: pos=${para.pos}, nodeSize=${para.nodeSize}, type=${para.nodeType}`);
        console.log(`   Paragraph text: "${para.textContent.substring(0, 50)}${para.textContent.length > 50 ? '...' : ''}"`);

        // IMPORTANT: charOffset from base analyzer is NOT relative to this paragraph!
        // It's accumulated from the joined text, so we MUST use text search instead.

        if (searchText) {
          console.log(`   🔍 Searching within paragraph for: "${searchText.substring(0, 40)}${searchText.length > 40 ? '...' : ''}"`);
          const found = this.findTextInParagraph(doc, para.pos, searchText);
          if (found) {
            console.log(`   ✅ Found via paragraph search: from=${found.from}, to=${found.to}`);
            paragraphSearchUsed++;
            return {
              ...issue,
              pmPosition: found
            };
          } else {
            console.log(`   ⚠️ Text not found in expected paragraph`);
          }
        }
      } else {
        console.log(`   ⚠️ Paragraph index mismatch: index=${paragraphIndex}, totalParagraphs=${paragraphPositions.length}`);
      }

      // Fallback: search entire document
      if (searchText) {
        console.log(`   🔍 Falling back to document-wide search...`);
        const found = this.findTextInDocument(doc, searchText);
        if (found) {
          console.log(`   ✅ Found via document search: from=${found.from}, to=${found.to}`);
          documentSearchUsed++;
          return {
            ...issue,
            pmPosition: found
          };
        } else {
          console.log(`   ❌ Document search failed`);
        }
      }

      console.log(`   ❌ No position found for this issue`);
      noPositionFound++;
      return issue; // No position found
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 [TiptapAPAAnalyzer] ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total issues: ${enrichedIssues.length}`);
    console.log(`✅ Position calculated: ${positionCalculated}`);
    console.log(`🔍 Paragraph search used: ${paragraphSearchUsed}`);
    console.log(`🔍 Document search used: ${documentSearchUsed}`);
    console.log(`❌ No position found: ${noPositionFound}`);
    console.log('═══════════════════════════════════════════════════════\n');

    return enrichedIssues;
  }

  /**
   * Find text within a specific paragraph
   */
  findTextInParagraph(doc, paragraphPos, searchText) {
    if (!searchText) return null;

    const paragraphNode = doc.nodeAt(paragraphPos);
    if (!paragraphNode) return null;

    // Get the full text content of the paragraph
    const fullText = paragraphNode.textContent;
    const index = fullText.indexOf(searchText);

    if (index !== -1) {
      // Found it! Calculate absolute position
      return {
        from: paragraphPos + 1 + index, // +1 to get inside the paragraph node
        to: paragraphPos + 1 + index + searchText.length
      };
    }

    return null;
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
