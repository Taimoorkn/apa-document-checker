'use client';

import { DocumentModel } from '@/models/DocumentModel';
import { ParagraphModel } from '@/models/ParagraphModel';
import { IncrementalAPAAnalyzer } from '@/utils/IncrementalAPAAnalyzer';
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';
import { FEATURES } from '@/config/features';

/**
 * DocumentService - CRUD operations and business logic for DocumentModel
 * Replaces fragmented store operations with unified document operations
 */
export class DocumentService {
  constructor() {
    // Use incremental analyzer for 90% performance improvement
    this.apaAnalyzer = FEATURES.INCREMENTAL_ANALYSIS ?
      new IncrementalAPAAnalyzer() :
      new EnhancedAPAAnalyzer();

    this.compressionUtils = new CompressionUtils();
    this.serverBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 DocumentService initialized with ${FEATURES.INCREMENTAL_ANALYSIS ? 'Incremental' : 'Enhanced'} APA Analyzer`);
    }
  }

  /**
   * Load document from server upload response
   */
  async loadDocument(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file
    if (!file.name.toLowerCase().endsWith('.docx')) {
      throw new Error('Please upload a .docx file only');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('File size must be less than 10MB');
    }

    // Prepare file buffer for compression
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    const compressedBuffer = await this.compressionUtils.compressBuffer(uint8Array);

    // Upload and process on server
    const formData = new FormData();
    formData.append('document', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const response = await fetch(`${this.serverBaseUrl}/api/upload-docx`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this._handleApiError(response);
        throw new Error(errorData.message || 'Server processing failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server processing failed');
      }

      // Validate server response
      const { document: documentData } = result;
      if (!documentData.html || !documentData.text) {
        throw new Error('Server returned incomplete document data');
      }

      // Create DocumentModel from server data
      const documentModel = DocumentModel.fromServerData(documentData, compressedBuffer);

      return {
        success: true,
        documentModel,
        stats: documentModel.getStatistics(),
        metadata: {
          originalName: file.name,
          fileSize: file.size,
          uploadedAt: new Date(),
          processingTime: documentData.processingInfo?.processingTime || 0
        }
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Upload timeout - please try with a smaller file');
      }

      throw error;
    }
  }

  /**
   * Perform incremental APA analysis on document
   */
  async analyzeDocument(documentModel, options = {}) {
    const {
      force = false,
      changedParagraphs = null,
      preserveUnchanged = true
    } = options;

    if (!documentModel) {
      throw new Error('No document model provided');
    }

    const startTime = Date.now();
    let analysisResults;

    if (changedParagraphs && changedParagraphs.length > 0 && preserveUnchanged) {
      // Incremental analysis - only analyze changed paragraphs
      analysisResults = await this._performIncrementalAnalysis(documentModel, changedParagraphs);
    } else {
      // Full analysis
      analysisResults = await this._performFullAnalysis(documentModel);
    }

    const analysisTime = Date.now() - startTime;

    // Update document model with new issues
    this._updateDocumentIssues(documentModel, analysisResults);

    // Calculate compliance score
    const score = this._calculateComplianceScore(analysisResults.issues);

    return {
      success: true,
      issues: analysisResults.issues,
      issueCount: analysisResults.issues.length,
      analysisScore: score,
      analysisTime,
      analysisType: changedParagraphs ? 'incremental' : 'full',
      affectedParagraphs: changedParagraphs ? changedParagraphs.map(p => p.id) : documentModel.paragraphOrder
    };
  }

  /**
   * Apply fix to document
   */
  async applyFix(documentModel, issueId) {
    if (!documentModel || !issueId) {
      throw new Error('Document model and issue ID required');
    }

    const issue = documentModel.issues.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    if (!issue.hasFix) {
      throw new Error(`Issue ${issueId} cannot be automatically fixed`);
    }

    // Create snapshot for undo
    const snapshot = documentModel.createSnapshot();

    try {
      let fixResult;

      // Determine fix strategy based on fix action
      if (this._isServerFormattingFix(issue.fixAction)) {
        fixResult = await this._applyServerFormattingFix(documentModel, issue);
      } else if (this._isClientContentFix(issue.fixAction)) {
        fixResult = await this._applyClientContentFix(documentModel, issue);
      } else {
        throw new Error(`Unknown fix action: ${issue.fixAction}`);
      }

      if (fixResult.success) {
        // Remove fixed issue
        documentModel.issues.removeIssue(issueId);

        // Record fix application
        documentModel.changeLog.recordChange({
          type: 'fix-applied',
          fixAction: issue.fixAction,
          issueId,
          timestamp: Date.now(),
          snapshotId: snapshot.id
        });

        return {
          success: true,
          fixedIssueId: issueId,
          fixAction: issue.fixAction,
          updatedDocument: fixResult.updatedDocument || false,
          snapshotId: snapshot.id
        };
      }

      throw new Error(fixResult.error || 'Fix application failed');

    } catch (error) {
      // Restore from snapshot on error
      documentModel.restoreFromSnapshot(snapshot);
      throw error;
    }
  }

  /**
   * Update paragraph content (maintains sync with editor)
   */
  updateParagraphContent(documentModel, paragraphId, newContent) {
    if (!documentModel || !paragraphId || newContent === undefined) {
      throw new Error('Document model, paragraph ID, and new content required');
    }

    const paragraph = documentModel.paragraphs.get(paragraphId);
    if (!paragraph) {
      throw new Error(`Paragraph not found: ${paragraphId}`);
    }

    const oldText = paragraph.text;
    const updated = paragraph.update({
      text: newContent.text || newContent,
      runs: newContent.runs || null
    });

    if (updated) {
      // Invalidate issues for this paragraph
      documentModel.issues.invalidateParagraphIssues(paragraphId);

      return {
        success: true,
        paragraphId,
        oldText,
        newText: paragraph.text,
        changeSequence: paragraph.changeSequence,
        needsReanalysis: true
      };
    }

    return {
      success: false,
      reason: 'No changes detected'
    };
  }

  /**
   * Sync document with editor state (bidirectional)
   */
  syncWithEditor(documentModel, tiptapDocument, changesMeta = {}) {
    if (!documentModel || !tiptapDocument) {
      throw new Error('Document model and Tiptap document required');
    }

    const hasChanges = documentModel.applyEditorChanges(tiptapDocument, changesMeta);

    if (hasChanges) {
      // Get changed paragraphs for incremental analysis
      const changedParagraphs = documentModel.getChangedParagraphs(Date.now() - 10000); // Last 10 seconds

      return {
        success: true,
        hasChanges: true,
        changedParagraphs,
        needsReanalysis: changedParagraphs.length > 0,
        documentVersion: documentModel.version
      };
    }

    return {
      success: true,
      hasChanges: false,
      needsReanalysis: false
    };
  }

  /**
   * Export document in specified format
   */
  async exportDocument(documentModel, format = 'html') {
    if (!documentModel) {
      throw new Error('Document model required');
    }

    switch (format.toLowerCase()) {
      case 'html':
        return {
          success: true,
          format: 'html',
          content: this._generateHtmlExport(documentModel),
          filename: `${documentModel.metadata.name || 'document'}.html`
        };

      case 'docx':
        if (!documentModel.currentBuffer) {
          throw new Error('No DOCX buffer available for export');
        }

        const decompressedBuffer = await this.compressionUtils.decompressBuffer(documentModel.currentBuffer);

        return {
          success: true,
          format: 'docx',
          content: decompressedBuffer,
          filename: `${documentModel.metadata.name || 'document'}.docx`
        };

      case 'text':
        return {
          success: true,
          format: 'text',
          content: documentModel.getPlainText(),
          filename: `${documentModel.metadata.name || 'document'}.txt`
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get document statistics and compliance info
   */
  getDocumentInfo(documentModel) {
    if (!documentModel) {
      throw new Error('Document model required');
    }

    const stats = documentModel.getStatistics();
    const issueStats = documentModel.issues.getIssueStats();

    return {
      metadata: documentModel.metadata,
      statistics: stats,
      issues: issueStats,
      compliance: {
        score: this._calculateComplianceScore(documentModel.issues.getAllIssues()),
        lastAnalysis: documentModel.issues.lastAnalysisTimestamp,
        totalParagraphs: documentModel.paragraphOrder.length,
        analysisVersion: documentModel.version
      },
      version: documentModel.version,
      lastModified: documentModel.lastModified
    };
  }

  // Private methods

  async _performFullAnalysis(documentModel) {
    // Convert document model to format expected by analyzer
    const documentData = {
      text: documentModel.getPlainText(),
      html: documentModel.getFormattedHtml(),
      formatting: this._extractFormattingForAnalysis(documentModel),
      structure: this._extractStructureForAnalysis(documentModel),
      styles: this._extractStylesForAnalysis(documentModel)
    };

    console.log('🔍 Full analysis document data:', {
      textLength: documentData.text?.length || 0,
      htmlLength: documentData.html?.length || 0,
      hasFormatting: !!documentData.formatting,
      hasStructure: !!documentData.structure,
      hasStyles: !!documentData.styles,
      stylesKeys: documentData.styles ? Object.keys(documentData.styles) : []
    });

    const analysisOptions = {
      force: true,
      changedParagraphs: null,
      preserveUnchanged: false
    };

    const issues = this.apaAnalyzer.analyzeDocument(documentData, analysisOptions);

    console.log('📊 Analysis results:', {
      totalIssues: issues.length,
      bySeverity: {
        Critical: issues.filter(i => i.severity === 'Critical').length,
        Major: issues.filter(i => i.severity === 'Major').length,
        Minor: issues.filter(i => i.severity === 'Minor').length
      }
    });

    return {
      issues,
      analysisType: 'full'
    };
  }

  async _performIncrementalAnalysis(documentModel, changedParagraphs) {
    // Get existing issues
    const existingIssues = documentModel.issues.getAllIssues();

    // Invalidate issues for changed paragraphs
    const invalidatedIssueIds = new Set();
    changedParagraphs.forEach(paragraph => {
      const paragraphIssues = documentModel.issues.getIssuesForParagraph(paragraph.id);
      paragraphIssues.forEach(issue => invalidatedIssueIds.add(issue.id));
    });

    // Extract text content for analysis
    const changedText = changedParagraphs.map(p => p.text).join('\n');
    const fullText = documentModel.getPlainText();

    // Analyze only changed content but with full document context
    const documentData = {
      text: fullText,
      html: documentModel.getFormattedHtml(),
      formatting: this._extractFormattingForAnalysis(documentModel),
      structure: this._extractStructureForAnalysis(documentModel),
      styles: this._extractStylesForAnalysis(documentModel),
      changedParagraphs: changedParagraphs.map(p => ({
        id: p.id,
        index: p.index,
        text: p.text
      }))
    };

    const newIssues = this.apaAnalyzer.analyzeDocument(documentData);

    // Merge with existing issues (remove invalidated, add new)
    const mergedIssues = existingIssues
      .filter(issue => !invalidatedIssueIds.has(issue.id))
      .concat(newIssues);

    return {
      issues: mergedIssues,
      analysisType: 'incremental',
      invalidatedIssueIds: Array.from(invalidatedIssueIds),
      newIssueCount: newIssues.length
    };
  }

  _updateDocumentIssues(documentModel, analysisResults) {
    // Clear existing issues
    documentModel.issues = new (documentModel.issues.constructor)();

    console.log('📝 Updating document issues:', {
      totalIssues: analysisResults.issues.length,
      sampleIssue: analysisResults.issues[0]
    });

    // Add new issues with unique IDs
    analysisResults.issues.forEach((issue, index) => {
      // Ensure each issue has a unique ID
      const issueWithId = {
        ...issue,
        id: issue.id || `${issue.category || 'general'}-${issue.severity || 'Minor'}-${index}`
      };

      // Find paragraph association based on issue location
      let paragraphId = null;
      if (issueWithId.location && issueWithId.location.paragraphIndex !== undefined) {
        const paragraphIndex = issueWithId.location.paragraphIndex;
        if (paragraphIndex < documentModel.paragraphOrder.length) {
          paragraphId = documentModel.paragraphOrder[paragraphIndex];
        }
      }

      documentModel.issues.addIssue(issueWithId, paragraphId);
    });

    console.log('✅ Document issues updated:', {
      storedIssues: documentModel.issues.getAllIssues().length
    });

    documentModel.issues.lastAnalysisTimestamp = Date.now();
  }

  _calculateComplianceScore(issues) {
    if (!issues || issues.length === 0) return 100;

    const criticalCount = issues.filter(i => i.severity === 'Critical').length;
    const majorCount = issues.filter(i => i.severity === 'Major').length;
    const minorCount = issues.filter(i => i.severity === 'Minor').length;

    return Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))));
  }

  _isServerFormattingFix(fixAction) {
    const serverFormattingFixes = [
      'fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins', 'fixIndentation'
    ];
    return serverFormattingFixes.includes(fixAction);
  }

  _isClientContentFix(fixAction) {
    const clientContentFixes = [
      'addCitationComma', 'fixParentheticalConnector', 'fixEtAlFormatting',
      'fixReferenceConnector', 'fixAllCapsHeading', 'addPageNumber',
      'sortReferences', 'fixTableTitleCase', 'fixFigureCaptionCase',
      'fixTableNoteFormat', 'removeRetrievedFrom', 'formatDOI',
      'addReferencePeriod', 'fixReferenceIndent', 'addSerialComma',
      'fixListNumbering', 'fixComplexSeries', 'replaceLatinAbbr',
      'fixPluralAbbr', 'capitalizeSubtitle', 'fixBlockQuote',
      'fixStatSymbol', 'fixNumberFormat', 'replaceBiasedTerm'
    ];
    return clientContentFixes.includes(fixAction);
  }

  async _applyServerFormattingFix(documentModel, issue) {
    if (!documentModel.currentBuffer) {
      throw new Error('No document buffer available for server fix');
    }

    const decompressedBuffer = await this.compressionUtils.decompressBuffer(documentModel.currentBuffer);
    const base64Buffer = this._bufferToBase64(decompressedBuffer);

    const response = await fetch(`${this.serverBaseUrl}/api/apply-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentBuffer: base64Buffer,
        fixAction: issue.fixAction,
        fixValue: issue.fixValue,
        originalFilename: documentModel.metadata.name
      })
    });

    if (!response.ok) {
      const errorData = await this._handleApiError(response);
      throw new Error(errorData.message || 'Server fix failed');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Server fix failed');
    }

    // Update document model with server response
    if (result.document) {
      // Update formatting from server
      if (result.document.formatting) {
        documentModel.formatting.initializeFromServer(result.document.formatting);
      }

      // Update document buffer
      if (result.modifiedDocumentBuffer) {
        const newBuffer = this._base64ToBuffer(result.modifiedDocumentBuffer);
        documentModel.currentBuffer = await this.compressionUtils.compressBuffer(newBuffer);
      }
    }

    return {
      success: true,
      updatedDocument: true,
      serverResponse: result
    };
  }

  async _applyClientContentFix(documentModel, issue) {
    // Find the paragraph containing the issue
    const paragraphId = this._findIssueLocation(documentModel, issue);
    if (!paragraphId) {
      throw new Error('Could not locate issue in document');
    }

    const paragraph = documentModel.paragraphs.get(paragraphId);
    if (!paragraph) {
      throw new Error('Paragraph not found');
    }

    // Apply fix based on fix action
    let fixedText;
    switch (issue.fixAction) {
      case 'addCitationComma':
        fixedText = this._applyAddCitationComma(paragraph.text, issue);
        break;
      case 'fixParentheticalConnector':
        fixedText = this._applyFixParentheticalConnector(paragraph.text, issue);
        break;
      case 'fixEtAlFormatting':
        fixedText = this._applyFixEtAlFormatting(paragraph.text, issue);
        break;
      // Add more fix implementations as needed
      default:
        throw new Error(`Client fix not implemented: ${issue.fixAction}`);
    }

    if (fixedText !== paragraph.text) {
      paragraph.update({ text: fixedText });
      return {
        success: true,
        updatedDocument: false,
        paragraphId,
        oldText: paragraph.text,
        newText: fixedText
      };
    }

    return {
      success: false,
      error: 'No changes applied'
    };
  }

  _extractFormattingForAnalysis(documentModel) {
    return {
      document: documentModel.formatting.document,
      paragraphs: documentModel.paragraphOrder.map(id => {
        const paragraph = documentModel.paragraphs.get(id);
        return paragraph ? {
          index: paragraph.index,
          text: paragraph.text,
          font: paragraph.formatting.font,
          spacing: paragraph.formatting.spacing,
          indentation: paragraph.formatting.indentation,
          alignment: paragraph.formatting.alignment,
          style: paragraph.formatting.styleName,
          runs: Array.from(paragraph.runs.values()).map(run => ({
            index: run.index,
            text: run.text,
            font: run.font,
            color: run.color
          }))
        } : null;
      }).filter(Boolean),
      compliance: documentModel.formatting.compliance
    };
  }

  _extractStructureForAnalysis(documentModel) {
    return {
      headings: documentModel.structure.headings,
      sections: documentModel.structure.sections,
      citations: documentModel.structure.citations,
      references: documentModel.structure.references,
      tables: documentModel.structure.tables,
      italicizedText: documentModel.structure.italicizedText,
      headersFooters: documentModel.structure.headersFooters
    };
  }

  _extractStylesForAnalysis(documentModel) {
    // Extract styles data from document model for APA analysis
    if (!documentModel.styles) {
      return {};
    }

    return {
      paragraphStyles: documentModel.styles.paragraphStyles || {},
      characterStyles: documentModel.styles.characterStyles || {},
      tableStyles: documentModel.styles.tableStyles || {},
      numberingStyles: documentModel.styles.numberingStyles || {},
      defaults: documentModel.styles.defaults || {}
    };
  }

  _generateHtmlExport(documentModel) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentModel.metadata.name || 'Document'}</title>
  <style>
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 2;
      margin: 1in;
      background: white;
    }
    .docx-document {
      max-width: 100%;
    }
  </style>
</head>
<body>
${documentModel.getFormattedHtml()}
</body>
</html>`;
  }

  _findIssueLocation(documentModel, issue) {
    // Find paragraph containing issue text
    for (const paragraphId of documentModel.paragraphOrder) {
      const paragraph = documentModel.paragraphs.get(paragraphId);
      if (paragraph && paragraph.text.includes(issue.text || issue.highlightText || '')) {
        return paragraphId;
      }
    }
    return null;
  }

  _applyAddCitationComma(text, issue) {
    const originalText = issue.text || issue.highlightText;
    if (!originalText) return text;

    // Pattern to match citations missing comma (Author YEAR)
    const pattern = /\(([A-Za-z][A-Za-z\s&.]+(?<!et\s+al))\s+(\d{4})\)/g;
    return text.replace(pattern, (match, author, year) => {
      if (match === originalText) {
        return `(${author}, ${year})`;
      }
      return match;
    });
  }

  _applyFixParentheticalConnector(text, issue) {
    const originalText = issue.text || issue.highlightText;
    if (!originalText) return text;

    return text.replace(originalText, originalText.replace(' and ', ' & '));
  }

  _applyFixEtAlFormatting(text, issue) {
    const originalText = issue.text || issue.highlightText;
    if (!originalText) return text;

    return text.replace(originalText, originalText.replace(', et al.', ' et al.'));
  }

  async _handleApiError(response) {
    try {
      return await response.json();
    } catch {
      return { message: `HTTP ${response.status}: ${response.statusText}` };
    }
  }

  _bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Compression utilities (matches current implementation)
 */
class CompressionUtils {
  async compressBuffer(buffer) {
    try {
      if (typeof CompressionStream !== 'undefined') {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        const chunks = [];
        const readPromise = (async () => {
          let result;
          while (!(result = await reader.read()).done) {
            chunks.push(result.value);
          }
        })();

        await writer.write(buffer);
        await writer.close();
        await readPromise;

        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const compressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        return compressed;
      } else {
        return buffer; // No compression available
      }
    } catch (error) {
      console.warn('Compression failed:', error);
      return buffer;
    }
  }

  async decompressBuffer(compressedBuffer) {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        const chunks = [];
        const readPromise = (async () => {
          let result;
          while (!(result = await reader.read()).done) {
            chunks.push(result.value);
          }
        })();

        await writer.write(compressedBuffer);
        await writer.close();
        await readPromise;

        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const decompressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return decompressed;
      } else {
        return compressedBuffer; // Assume not compressed
      }
    } catch (error) {
      console.warn('Decompression failed:', error);
      return compressedBuffer;
    }
  }
}