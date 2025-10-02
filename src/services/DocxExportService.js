'use client';

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * DOCX Export Service - Generate DOCX from DocumentModel JSON
 * This is the JSON-first architecture: JSON is source of truth, DOCX generated on-demand
 */
export class DocxExportService {

  /**
   * Convert DocumentModel to DOCX buffer
   * @param {DocumentModel} documentModel
   * @returns {Promise<Uint8Array>} DOCX file buffer
   */
  async exportToDocx(documentModel) {
    if (!documentModel) {
      throw new Error('No document model provided');
    }

    console.log('📄 Generating DOCX from JSON...');
    const startTime = Date.now();

    // Build DOCX sections
    const sections = [{
      properties: {
        page: {
          margin: {
            top: this._inchesToTwip(documentModel.formatting.document.margins.top || 1.0),
            bottom: this._inchesToTwip(documentModel.formatting.document.margins.bottom || 1.0),
            left: this._inchesToTwip(documentModel.formatting.document.margins.left || 1.0),
            right: this._inchesToTwip(documentModel.formatting.document.margins.right || 1.0)
          }
        }
      },
      children: this._buildParagraphs(documentModel)
    }];

    // Create document
    const doc = new Document({
      sections,
      styles: {
        default: {
          document: {
            run: {
              font: documentModel.formatting.document.font.family || 'Times New Roman',
              size: (documentModel.formatting.document.font.size || 12) * 2 // Convert to half-points
            },
            paragraph: {
              spacing: {
                line: (documentModel.formatting.document.spacing.line || 2.0) * 240,
                before: 0,
                after: 0
              }
            }
          }
        }
      }
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    const exportTime = Date.now() - startTime;
    console.log(`✅ DOCX generated in ${exportTime}ms`);

    return buffer;
  }

  /**
   * Build paragraphs from DocumentModel
   */
  _buildParagraphs(documentModel) {
    const paragraphs = [];

    documentModel.paragraphOrder.forEach(id => {
      const para = documentModel.paragraphs.get(id);
      if (!para) return;

      // Determine if heading or paragraph
      const styleName = para.formatting?.styleName || para.style || '';
      const isHeading = styleName.toLowerCase().includes('heading');
      const headingLevel = this._extractHeadingLevel(styleName);

      // Build text runs
      const children = this._buildTextRuns(para);

      // Create paragraph
      const paragraphConfig = {
        children,
        spacing: {
          line: (para.formatting?.spacing?.line || 2.0) * 240,
          before: 0,
          after: 0
        }
      };

      // Add indentation if present
      if (para.formatting?.indentation?.firstLine) {
        paragraphConfig.indent = {
          firstLine: this._inchesToTwip(para.formatting.indentation.firstLine)
        };
      }

      // Add alignment if present
      if (para.formatting?.alignment) {
        paragraphConfig.alignment = this._convertAlignment(para.formatting.alignment);
      }

      // Create heading or paragraph
      if (isHeading && headingLevel) {
        paragraphConfig.heading = this._convertHeadingLevel(headingLevel);
        paragraphs.push(new Paragraph(paragraphConfig));
      } else {
        paragraphs.push(new Paragraph(paragraphConfig));
      }
    });

    return paragraphs;
  }

  /**
   * Build text runs from paragraph
   */
  _buildTextRuns(paragraph) {
    const runs = [];

    // paragraph.runs is a Map, so use .size instead of .length
    if (paragraph.runs && paragraph.runs.size > 0) {
      // Iterate runs in order
      paragraph.runOrder.forEach(runId => {
        const run = paragraph.runs.get(runId);
        if (!run || !run.text) return;

        runs.push(new TextRun({
          text: run.text,
          font: run.font?.family || 'Times New Roman',
          size: (run.font?.size || 12) * 2,
          bold: run.font?.bold || false,
          italics: run.font?.italic || false,
          underline: run.font?.underline ? {} : undefined,
          color: run.color ? run.color.replace('#', '') : undefined
        }));
      });
    } else if (paragraph.text) {
      // Fallback to plain text
      runs.push(new TextRun({
        text: paragraph.text,
        font: 'Times New Roman',
        size: 24 // 12pt
      }));
    }

    return runs;
  }

  // Helper methods
  _inchesToTwip(inches) {
    return Math.round(inches * 1440);
  }

  _extractHeadingLevel(style) {
    if (!style) return null;
    const match = style.match(/heading\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  _convertHeadingLevel(level) {
    const mapping = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6
    };
    return mapping[level] || HeadingLevel.HEADING_1;
  }

  _convertAlignment(align) {
    const mapping = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      both: AlignmentType.JUSTIFIED,
      justify: AlignmentType.JUSTIFIED
    };
    return mapping[align] || AlignmentType.LEFT;
  }
}
