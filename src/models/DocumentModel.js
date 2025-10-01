'use client';

import { v4 as uuidv4 } from 'uuid';
import { ParagraphModel } from './ParagraphModel';

/**
 * Single source of truth for document state
 * Replaces fragmented state (documentText, documentHtml, editorContent, etc.)
 */
export class DocumentModel {
  constructor(originalDocx = null) {
    this.id = uuidv4();
    this.created = Date.now();
    this.lastModified = Date.now();
    this.version = 1;

    // Document buffers (compressed)
    this.originalBuffer = originalDocx;
    this.currentBuffer = originalDocx;
    this.isBufferCompressed = false;

    // Document metadata
    this.metadata = new DocumentMetadata();

    // Supabase integration metadata
    this.supabase = {
      documentId: null,
      filePath: null,
      userId: null
    };

    // Paragraph-based document structure (single source of truth)
    this.paragraphs = new Map(); // paragraph-id -> ParagraphModel
    this.paragraphOrder = []; // Maintains document order

    // Document-level formatting
    this.formatting = new FormattingModel();

    // Structure analysis (derived from paragraphs)
    this.structure = new StructureModel();

    // Document styles
    this.styles = new StylesModel();

    // Issue tracking
    this.issues = new IssueTracker();

    // Change tracking
    this.changeLog = new ChangeLog();

    // Statistics (derived)
    this._statsCache = null;
    this._statsCacheVersion = 0;
  }

  /**
   * Initialize from server document data (current upload response)
   */
  static fromServerData(documentData, originalBuffer = null) {
    const model = new DocumentModel(originalBuffer);

    // Set metadata
    model.metadata.name = documentData.processingInfo?.originalName || 'Document';
    model.metadata.fileSize = documentData.processingInfo?.fileSize || 0;
    model.metadata.processedAt = new Date(documentData.processingInfo?.timestamp || Date.now());
    model.metadata.processor = documentData.processingInfo?.processor || 'Unknown';

    // Set document-level formatting
    if (documentData.formatting) {
      model.formatting.initializeFromServer(documentData.formatting);
    }

    // Initialize paragraphs from server formatting data
    if (documentData.formatting?.paragraphs) {
      documentData.formatting.paragraphs.forEach((paraData, index) => {
        const paragraphModel = ParagraphModel.fromServerData(paraData, index);
        model.paragraphs.set(paragraphModel.id, paragraphModel);
        model.paragraphOrder.push(paragraphModel.id);
      });
    } else {
      // Fallback: create paragraphs from text
      const text = documentData.text || '';
      const paragraphs = text.split('\n');
      paragraphs.forEach((paraText, index) => {
        if (paraText.trim()) {
          const paragraphModel = ParagraphModel.fromText(paraText.trim(), index);
          model.paragraphs.set(paragraphModel.id, paragraphModel);
          model.paragraphOrder.push(paragraphModel.id);
        }
      });
    }

    // Set structure data
    if (documentData.structure) {
      model.structure.initializeFromServer(documentData.structure);
    }

    // Set styles
    if (documentData.styles) {
      model.styles.initializeFromServer(documentData.styles);
    }

    // Record creation in change log
    model.changeLog.recordChange({
      type: 'document-created',
      timestamp: Date.now(),
      description: 'Document initialized from server data',
      affectedParagraphs: model.paragraphOrder
    });

    return model;
  }

  /**
   * Get document as plain text (derived from paragraphs)
   */
  getPlainText() {
    return this.paragraphOrder
      .map(id => this.paragraphs.get(id))
      .filter(para => para && para.text)
      .map(para => para.text)
      .join('\n');
  }

  /**
   * Get document as HTML (derived from paragraphs with formatting)
   */
  getFormattedHtml() {
    let html = '<div class="docx-document">';

    this.paragraphOrder.forEach(id => {
      const paragraph = this.paragraphs.get(id);
      if (paragraph) {
        html += paragraph.toHtml();
      }
    });

    html += '</div>';
    return html;
  }

  /**
   * Get document as Tiptap JSON (for editor)
   */
  getTiptapJson() {
    const content = [];

    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 getTiptapJson: Converting ${this.paragraphOrder.length} paragraphs to Tiptap JSON`);
    }

    this.paragraphOrder.forEach((id, index) => {
      const paragraph = this.paragraphs.get(id);
      if (paragraph) {
        const node = paragraph.toTiptapNode();
        content.push(node);

        // Log first paragraph for debugging
        if (index === 0 && process.env.NODE_ENV === 'development') {
          console.log('📋 First paragraph node:', {
            text: paragraph.text.substring(0, 50),
            hasFormatting: !!node.attrs,
            fontFamily: paragraph.formatting?.font?.family,
            fontSize: paragraph.formatting?.font?.size
          });
        }
      }
    });

    return {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }]
    };
  }

  /**
   * Update paragraph content (maintains single source of truth)
   */
  updateParagraph(paragraphId, changes) {
    const paragraph = this.paragraphs.get(paragraphId);
    if (!paragraph) {
      throw new Error(`Paragraph not found: ${paragraphId}`);
    }

    const oldText = paragraph.text;
    const updated = paragraph.update(changes);

    if (updated) {
      this.lastModified = Date.now();
      this.version++;
      this._invalidateStatsCache();

      // Record change
      this.changeLog.recordChange({
        type: 'paragraph-updated',
        paragraphId,
        timestamp: Date.now(),
        oldText,
        newText: paragraph.text,
        changes
      });

      // Update any issues affecting this paragraph
      this.issues.invalidateParagraphIssues(paragraphId);
    }

    return updated;
  }

  /**
   * Apply editor changes from Tiptap JSON
   */
  applyEditorChanges(tiptapDoc, changesMeta = {}) {
    if (!tiptapDoc || !tiptapDoc.content) {
      return false;
    }

    let hasChanges = false;
    const affectedParagraphs = new Set();

    // Process each paragraph in editor content
    tiptapDoc.content.forEach((node, index) => {
      if (node.type === 'paragraph') {
        // Find corresponding paragraph by position
        const paragraphId = this.paragraphOrder[index];

        if (paragraphId) {
          const paragraph = this.paragraphs.get(paragraphId);
          if (paragraph) {
            // Extract text from Tiptap node
            const editorText = this._extractTextFromTiptapNode(node);

            // Check if text has changed
            if (paragraph.text !== editorText) {
              paragraph.update({
                text: editorText,
                runs: this._extractRunsFromTiptapNode(node)
              });

              affectedParagraphs.add(paragraphId);
              hasChanges = true;
            }
          }
        } else {
          // New paragraph added in editor
          const newParagraph = ParagraphModel.fromTiptapNode(node, this.paragraphOrder.length);
          this.paragraphs.set(newParagraph.id, newParagraph);
          this.paragraphOrder.push(newParagraph.id);
          affectedParagraphs.add(newParagraph.id);
          hasChanges = true;
        }
      }
    });

    // Handle deleted paragraphs
    if (tiptapDoc.content.length < this.paragraphOrder.length) {
      const paragraphsToDelete = this.paragraphOrder.slice(tiptapDoc.content.length);
      paragraphsToDelete.forEach(id => {
        this.paragraphs.delete(id);
        affectedParagraphs.add(id);
      });
      this.paragraphOrder = this.paragraphOrder.slice(0, tiptapDoc.content.length);
      hasChanges = true;
    }

    if (hasChanges) {
      this.lastModified = Date.now();
      this.version++;
      this._invalidateStatsCache();

      // Record editor changes
      this.changeLog.recordChange({
        type: 'editor-sync',
        timestamp: Date.now(),
        affectedParagraphs: Array.from(affectedParagraphs),
        changesMeta
      });

      // Invalidate issues for affected paragraphs
      affectedParagraphs.forEach(id => {
        this.issues.invalidateParagraphIssues(id);
      });
    }

    return hasChanges;
  }

  /**
   * Get document statistics (cached)
   */
  getStatistics() {
    if (this._statsCache && this._statsCacheVersion === this.version) {
      return this._statsCache;
    }

    let wordCount = 0;
    let charCount = 0;
    let paragraphCount = 0;

    this.paragraphOrder.forEach(id => {
      const paragraph = this.paragraphs.get(id);
      if (paragraph && paragraph.text.trim()) {
        const words = paragraph.text.trim().split(/\s+/).filter(Boolean);
        wordCount += words.length;
        charCount += paragraph.text.length;
        paragraphCount++;
      }
    });

    this._statsCache = {
      wordCount,
      charCount,
      paragraphCount,
      lastModified: this.lastModified,
      version: this.version
    };
    this._statsCacheVersion = this.version;

    return this._statsCache;
  }

  /**
   * Get paragraphs that have changed since last analysis
   */
  getChangedParagraphs(sinceTimestamp = 0) {
    return this.paragraphOrder
      .map(id => this.paragraphs.get(id))
      .filter(para => para && para.lastModified > sinceTimestamp);
  }

  /**
   * Create a snapshot for undo functionality
   */
  createSnapshot() {
    return {
      id: uuidv4(),
      timestamp: Date.now(),
      version: this.version,
      paragraphs: new Map(this.paragraphs), // Shallow copy of paragraphs map
      paragraphOrder: [...this.paragraphOrder],
      formatting: this.formatting.clone(),
      issues: this.issues.clone(),
      description: `Snapshot at version ${this.version}`
    };
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot) {
    this.paragraphs = new Map(snapshot.paragraphs);
    this.paragraphOrder = [...snapshot.paragraphOrder];
    this.formatting = snapshot.formatting.clone();
    this.issues = snapshot.issues.clone();
    this.version = snapshot.version + 1; // Increment version for restore
    this.lastModified = Date.now();
    this._invalidateStatsCache();

    this.changeLog.recordChange({
      type: 'snapshot-restored',
      timestamp: Date.now(),
      snapshotId: snapshot.id,
      description: snapshot.description
    });
  }

  // Private helper methods
  _extractTextFromTiptapNode(node) {
    if (!node.content) return '';
    return node.content.map(child => child.text || '').join('');
  }

  _extractRunsFromTiptapNode(node) {
    if (!node.content) return [];

    return node.content.map((textNode, index) => {
      const run = {
        index,
        text: textNode.text || '',
        font: {}
      };

      if (textNode.marks) {
        textNode.marks.forEach(mark => {
          switch (mark.type) {
            case 'bold':
              run.font.bold = true;
              break;
            case 'italic':
              run.font.italic = true;
              break;
            case 'underline':
              run.font.underline = true;
              break;
            case 'fontFormatting':
              if (mark.attrs.fontFamily) run.font.family = mark.attrs.fontFamily;
              if (mark.attrs.fontSize) run.font.size = parseFloat(mark.attrs.fontSize);
              if (mark.attrs.color) run.color = mark.attrs.color;
              break;
          }
        });
      }

      return run;
    });
  }

  _invalidateStatsCache() {
    this._statsCache = null;
    this._statsCacheVersion = 0;
  }
}

/**
 * Document metadata
 */
export class DocumentMetadata {
  constructor() {
    this.name = '';
    this.fileSize = 0;
    this.uploadedAt = null;
    this.processedAt = null;
    this.processor = '';
    this.originalFormat = 'docx';
  }
}

/**
 * Document-level formatting model
 */
export class FormattingModel {
  constructor() {
    this.document = {
      font: { family: null, size: null },
      spacing: { line: null, paragraph: null },
      margins: { top: null, bottom: null, left: null, right: null },
      indentation: { firstLine: null, hanging: null }
    };
    this.compliance = null;
  }

  initializeFromServer(serverFormatting) {
    if (serverFormatting.document) {
      this.document = {
        font: serverFormatting.document.font || this.document.font,
        spacing: serverFormatting.document.spacing || this.document.spacing,
        margins: serverFormatting.document.margins || this.document.margins,
        indentation: serverFormatting.document.indentation || this.document.indentation
      };
    }

    if (serverFormatting.compliance) {
      this.compliance = serverFormatting.compliance;
    }
  }

  clone() {
    const cloned = new FormattingModel();
    cloned.document = JSON.parse(JSON.stringify(this.document));
    cloned.compliance = this.compliance ? JSON.parse(JSON.stringify(this.compliance)) : null;
    return cloned;
  }
}

/**
 * Document structure model
 */
export class StructureModel {
  constructor() {
    this.headings = [];
    this.sections = [];
    this.citations = [];
    this.references = [];
    this.tables = [];
    this.italicizedText = [];
    this.headersFooters = null;
  }

  initializeFromServer(serverStructure) {
    this.headings = serverStructure.headings || [];
    this.sections = serverStructure.sections || [];
    this.citations = serverStructure.citations || [];
    this.references = serverStructure.references || [];
    this.tables = serverStructure.tables || [];
    this.italicizedText = serverStructure.italicizedText || [];
    this.headersFooters = serverStructure.headersFooters || null;
  }
}

/**
 * Document styles model
 */
export class StylesModel {
  constructor() {
    this.styles = [];
    this.defaultStyle = null;
  }

  initializeFromServer(serverStyles) {
    this.styles = serverStyles.styles || [];
    this.defaultStyle = serverStyles.defaultStyle || null;
  }
}

/**
 * Change log for tracking document modifications
 */
export class ChangeLog {
  constructor() {
    this.changes = [];
    this.maxEntries = 100; // Keep last 100 changes
  }

  recordChange(change) {
    this.changes.unshift({
      id: uuidv4(),
      ...change
    });

    // Trim to max entries
    if (this.changes.length > this.maxEntries) {
      this.changes = this.changes.slice(0, this.maxEntries);
    }
  }

  getChanges(sinceTimestamp = 0) {
    return this.changes.filter(change => change.timestamp > sinceTimestamp);
  }

  getLastChange() {
    return this.changes[0] || null;
  }
}

/**
 * Issue tracking with paragraph association
 */
export class IssueTracker {
  constructor() {
    this.issues = new Map(); // issue-id -> Issue
    this.paragraphIssues = new Map(); // paragraph-id -> Set<issue-id>
    this.lastAnalysisTimestamp = 0;
  }

  addIssue(issue, paragraphId = null) {
    this.issues.set(issue.id, issue);

    if (paragraphId) {
      if (!this.paragraphIssues.has(paragraphId)) {
        this.paragraphIssues.set(paragraphId, new Set());
      }
      this.paragraphIssues.get(paragraphId).add(issue.id);
    }
  }

  removeIssue(issueId) {
    const issue = this.issues.get(issueId);
    if (issue) {
      this.issues.delete(issueId);

      // Remove from paragraph associations
      for (const [paragraphId, issueSet] of this.paragraphIssues) {
        issueSet.delete(issueId);
        if (issueSet.size === 0) {
          this.paragraphIssues.delete(paragraphId);
        }
      }
    }
  }

  getIssuesForParagraph(paragraphId) {
    const issueIds = this.paragraphIssues.get(paragraphId) || new Set();
    return Array.from(issueIds).map(id => this.issues.get(id)).filter(Boolean);
  }

  invalidateParagraphIssues(paragraphId) {
    const issueIds = this.paragraphIssues.get(paragraphId) || new Set();
    Array.from(issueIds).forEach(issueId => {
      const issue = this.issues.get(issueId);
      if (issue) {
        issue.needsReanalysis = true;
      }
    });
  }

  getAllIssues() {
    return Array.from(this.issues.values());
  }

  getIssueStats() {
    const allIssues = this.getAllIssues();
    return {
      total: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'Critical').length,
      major: allIssues.filter(i => i.severity === 'Major').length,
      minor: allIssues.filter(i => i.severity === 'Minor').length
    };
  }

  clone() {
    const cloned = new IssueTracker();
    cloned.issues = new Map(this.issues);
    cloned.paragraphIssues = new Map();

    // Deep clone paragraph issues
    for (const [paragraphId, issueSet] of this.paragraphIssues) {
      cloned.paragraphIssues.set(paragraphId, new Set(issueSet));
    }

    cloned.lastAnalysisTimestamp = this.lastAnalysisTimestamp;
    return cloned;
  }
}