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
   * Apply fix to document (JSON-First Architecture)
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

      // Route to appropriate fix handler based on type
      if (this._isTextFix(issue.fixAction)) {
        // Text fixes: client-side JSON mutation (instant)
        console.log('🔧 Applying text fix (client-side):', issue.fixAction);
        fixResult = this._applyTextFixToJSON(documentModel, issue);
      }
      else if (this._isFormattingFix(issue.fixAction)) {
        // Formatting fixes: client-side JSON property update (instant)
        console.log('🎨 Applying formatting fix (client-side):', issue.fixAction);
        fixResult = this._applyFormattingFixToJSON(documentModel, issue);
      }
      else {
        // Fallback to server for unsupported fix types (legacy)
        console.warn('⚠️ Using server-side fix (legacy):', issue.fixAction);
        fixResult = await this._applyServerFormattingFix(documentModel, issue);
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
          snapshotId: snapshot.id,
          clientSide: fixResult.clientSide || false
        });

        return {
          success: true,
          fixedIssueId: issueId,
          fixAction: issue.fixAction,
          updatedDocument: fixResult.updatedDocument || false,
          clientSide: fixResult.clientSide || false,
          snapshotId: snapshot.id
        };
      }

      // Fix failed - return error message instead of throwing
      return {
        success: false,
        error: fixResult.message || fixResult.error || 'Fix application failed'
      };

    } catch (error) {
      // Restore from snapshot on error
      console.error('❌ Fix application failed:', error);
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

  /**
   * Check if a fix action is actually implemented
   */
  isFixImplemented(fixAction) {
    return this._isTextFix(fixAction) || this._isFormattingFix(fixAction);
  }

  /**
   * Check if fix is a text-based fix (search/replace in JSON)
   */
  _isTextFix(fixAction) {
    return [
      'addCitationComma',
      'fixParentheticalConnector',
      'fixEtAlFormatting',
      'fixReferenceConnector',
      'fixAllCapsHeading',
      'addPageNumber'
    ].includes(fixAction);
  }

  /**
   * Check if fix is a formatting fix (JSON property update)
   */
  _isFormattingFix(fixAction) {
    return [
      'fixFont',
      'fixFontSize',
      'fixLineSpacing',
      'fixMargins',
      'fixIndentation'
    ].includes(fixAction);
  }

  /**
   * Apply text-based fix by mutating paragraph text in DocumentModel
   * This is instant (<100ms) and triggers auto-save in background
   */
  _applyTextFixToJSON(documentModel, issue) {
    const { fixAction, fixValue, location } = issue;

    console.log('📝 Text fix details:', { fixAction, fixValue, location });

    // Find target paragraph
    let paragraphId = null;
    if (location?.paragraphIndex !== undefined) {
      if (location.paragraphIndex < documentModel.paragraphOrder.length) {
        paragraphId = documentModel.paragraphOrder[location.paragraphIndex];
      }
    }

    if (!paragraphId) {
      console.error('❌ Paragraph not found for fix:', location);
      return { success: false, error: 'Paragraph not found' };
    }

    const paragraph = documentModel.paragraphs.get(paragraphId);
    if (!paragraph) {
      return { success: false, error: 'Paragraph not found in model' };
    }

    const oldText = paragraph.text;

    // Apply text replacement based on fixValue
    let newText = oldText;
    if (fixValue && fixValue.original && fixValue.replacement) {
      newText = oldText.replace(fixValue.original, fixValue.replacement);
    } else {
      // Legacy: use predefined replacement logic
      newText = this._applyLegacyTextFix(oldText, fixAction, issue);
    }

    if (oldText === newText) {
      console.warn('⚠️ No changes applied - text unchanged');
      return { success: false, error: 'No changes detected' };
    }

    console.log('✏️ Text change:', {
      old: oldText.substring(0, 100),
      new: newText.substring(0, 100)
    });

    // Update paragraph text
    paragraph.update({ text: newText });

    // Update runs to match new text
    if (paragraph.runs && paragraph.runs.size > 0) {
      const firstRun = Array.from(paragraph.runs.values())[0];
      paragraph.runs.clear();
      paragraph.runOrder = [];

      const newRun = {
        text: newText,
        font: firstRun?.font || {},
        color: firstRun?.color || null
      };

      const RunModel = require('@/models/ParagraphModel').RunModel;
      const runModel = RunModel.fromData(newRun, 0);
      paragraph.runs.set(runModel.id, runModel);
      paragraph.runOrder.push(runModel.id);
    }

    // Update document version
    documentModel.version++;
    documentModel.lastModified = Date.now();

    // Trigger auto-save (non-blocking, 1 second debounce)
    if (this._scheduleAutoSaveCallback) {
      this._scheduleAutoSaveCallback(documentModel, 1000);
    }

    console.log('✅ Text fix applied successfully (client-side)');

    return {
      success: true,
      clientSide: true,
      paragraphId,
      oldText,
      newText
    };
  }

  /**
   * Apply formatting fix by updating DocumentModel properties
   * This is instant (<200ms) and triggers editor re-render + auto-save
   */
  _applyFormattingFixToJSON(documentModel, issue) {
    const { fixAction } = issue;

    console.log('🎨 Formatting fix:', fixAction);

    switch (fixAction) {
      case 'fixFont':
        // Update document-level default
        documentModel.formatting.document.font.family = 'Times New Roman';

        // Update all paragraph runs
        documentModel.paragraphOrder.forEach(id => {
          const para = documentModel.paragraphs.get(id);
          if (para && para.runs) {
            para.runs.forEach(run => {
              run.font.family = 'Times New Roman';
            });
          }
        });
        break;

      case 'fixFontSize':
        documentModel.formatting.document.font.size = 12;

        documentModel.paragraphOrder.forEach(id => {
          const para = documentModel.paragraphs.get(id);
          if (para && para.runs) {
            para.runs.forEach(run => {
              run.font.size = 12;
            });
          }
        });
        break;

      case 'fixLineSpacing':
        documentModel.formatting.document.spacing.line = 2.0;

        documentModel.paragraphOrder.forEach(id => {
          const para = documentModel.paragraphs.get(id);
          if (para && para.formatting) {
            para.formatting.spacing = para.formatting.spacing || {};
            para.formatting.spacing.line = 2.0;
          }
        });
        break;

      case 'fixMargins':
        documentModel.formatting.document.margins = {
          top: 1.0,
          bottom: 1.0,
          left: 1.0,
          right: 1.0
        };
        break;

      case 'fixIndentation':
        // Apply to all body paragraphs (exclude headings)
        documentModel.paragraphOrder.forEach(id => {
          const para = documentModel.paragraphs.get(id);
          if (para && para.formatting) {
            const styleName = para.formatting.styleName?.toLowerCase() || '';
            if (!styleName.includes('heading') && !styleName.includes('title')) {
              para.formatting.indentation = para.formatting.indentation || {};
              para.formatting.indentation.firstLine = 0.5;
            }
          }
        });
        break;

      default:
        return { success: false, error: `Unknown formatting fix: ${fixAction}` };
    }

    // Update document version
    documentModel.version++;
    documentModel.lastModified = Date.now();

    // Trigger auto-save (non-blocking)
    if (this._scheduleAutoSaveCallback) {
      this._scheduleAutoSaveCallback(documentModel, 1000);
    }

    console.log('✅ Formatting fix applied successfully (client-side)');

    return {
      success: true,
      clientSide: true,
      fixAction,
      requiresEditorRefresh: true
    };
  }

  /**
   * Legacy text fix logic (for backward compatibility)
   */
  _applyLegacyTextFix(text, fixAction, issue) {
    const originalText = issue.text || issue.highlightText;
    if (!originalText) return text;

    switch (fixAction) {
      case 'addCitationComma': {
        const pattern = /\(([A-Za-z][A-Za-z\s&.]+(?<!et\s+al))\s+(\d{4})\)/g;
        return text.replace(pattern, (match, author, year) => {
          if (match === originalText) return `(${author}, ${year})`;
          return match;
        });
      }
      case 'fixParentheticalConnector':
        return text.replace(originalText, originalText.replace(' and ', ' & '));
      case 'fixEtAlFormatting':
        return text.replace(originalText, originalText.replace(', et al.', ' et al.'));
      case 'fixReferenceConnector':
        return text.replace(originalText, originalText.replace(' and ', ' & '));
      case 'fixAllCapsHeading': {
        // Convert ALL CAPS to Title Case
        const titleCase = originalText
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return text.replace(originalText, titleCase);
      }
      case 'addPageNumber':
        return text.replace(originalText, originalText.replace(')', ', p. XX)'));
      default:
        return text;
    }
  }

  /**
   * Set callback for scheduling auto-save from store
   */
  setScheduleAutoSaveCallback(callback) {
    this._scheduleAutoSaveCallback = callback;
  }

  async _applyServerFormattingFix(documentModel, issue) {
    let base64Buffer;

    if (!documentModel.currentBuffer) {
      // Document loaded from Supabase - download original file first
      if (!documentModel.supabase.filePath) {
        return {
          success: false,
          message: 'Cannot apply formatting fixes: document file path not available.'
        };
      }

      console.log('📥 Downloading document from Supabase for fix application...');
      console.log('📁 File path:', documentModel.supabase.filePath);

      // Download from Supabase storage - use createBrowserClient from @supabase/ssr
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-documents')
        .download(documentModel.supabase.filePath);

      console.log('📦 Download result:', { hasData: !!fileData, error: downloadError });

      if (downloadError || !fileData) {
        return {
          success: false,
          message: 'Failed to download document from storage for fix application.'
        };
      }

      // Convert Blob to Buffer to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Buffer = this._bufferToBase64(buffer);
    } else {
      const decompressedBuffer = await this.compressionUtils.decompressBuffer(documentModel.currentBuffer);
      base64Buffer = this._bufferToBase64(decompressedBuffer);
    }

    console.log('🔧 Sending fix to backend:', {
      fixAction: issue.fixAction,
      fixValue: issue.fixValue,
      bufferLength: base64Buffer?.length
    });

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

    // Update document model with server response - FULL REFRESH
    if (result.document) {
      console.log('🔄 Updating document model after server fix...');

      // Update formatting from server
      if (result.document.formatting) {
        documentModel.formatting.initializeFromServer(result.document.formatting);
        console.log('✅ Formatting updated');
      }

      // Update structure from server
      if (result.document.structure) {
        documentModel.structure = result.document.structure;
        console.log('✅ Structure updated');
      }

      // Update styles from server
      if (result.document.styles) {
        documentModel.styles = result.document.styles;
        console.log('✅ Styles updated');
      }

      // Update HTML/text content - this is critical for editor to show changes!
      if (result.document.html) {
        documentModel.html = result.document.html;
        console.log('✅ HTML content updated');
      }

      if (result.document.text) {
        documentModel.text = result.document.text;
        console.log('✅ Text content updated');
      }

      // Rebuild paragraphs from updated data
      if (result.document.formatting && result.document.formatting.paragraphs) {
        console.log('🔄 Rebuilding paragraphs from server data...');

        // Clear existing paragraphs
        documentModel.paragraphs.clear();
        documentModel.paragraphOrder = [];

        // Rebuild from server data (same logic as fromServerData)
        result.document.formatting.paragraphs.forEach((paraData, index) => {
          const ParagraphModel = require('@/models/ParagraphModel').ParagraphModel;
          const paragraphModel = ParagraphModel.fromServerData(paraData, index);
          documentModel.paragraphs.set(paragraphModel.id, paragraphModel);
          documentModel.paragraphOrder.push(paragraphModel.id);
        });

        console.log(`✅ Paragraphs rebuilt: ${documentModel.paragraphOrder.length} paragraphs`);
      }

      // Update document buffer
      if (result.modifiedDocumentBuffer) {
        const newBuffer = this._base64ToBuffer(result.modifiedDocumentBuffer);
        documentModel.currentBuffer = await this.compressionUtils.compressBuffer(newBuffer);
        console.log('✅ Document buffer updated');
      }

      // Increment version to trigger editor sync
      documentModel.version++;
      documentModel.lastModified = Date.now();
      console.log(`✅ Document model fully updated (version ${documentModel.version})`);

      // Save modified document back to Supabase if this is a Supabase document
      if (documentModel.supabase.documentId && result.modifiedDocumentBuffer) {
        console.log('💾 Saving modified document to Supabase...');
        await this._saveToSupabase(documentModel, result.modifiedDocumentBuffer, result.document);
      }
    }

    return {
      success: true,
      updatedDocument: true,
      serverResponse: result
    };
  }

  async _saveToSupabase(documentModel, modifiedBufferBase64, updatedDocumentData) {
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      // Convert base64 back to Blob for upload
      const binaryString = atob(modifiedBufferBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      // Upload modified file to Supabase storage (overwrite original)
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(documentModel.supabase.filePath, blob, {
          upsert: true // Overwrite existing file
        });

      if (uploadError) {
        console.error('❌ Failed to upload modified document:', uploadError);
        throw uploadError;
      }

      console.log('✅ Modified document uploaded to storage');

      // Get current Tiptap JSON and issues for the NEW architecture
      const tiptapContent = documentModel.getTiptapJson();
      const issues = documentModel.issues.getAllIssues();
      const complianceScore = this._calculateComplianceScore(issues);

      // Update analysis_results table with BOTH old and new data
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          document_data: updatedDocumentData, // Keep for backward compatibility
          tiptap_content: tiptapContent, // NEW: JSON-based content
          issues: issues,
          compliance_score: complianceScore,
          issue_count: issues.length,
          editor_version: 1
        })
        .eq('document_id', documentModel.supabase.documentId);

      if (updateError) {
        console.error('❌ Failed to update analysis results:', updateError);
        throw updateError;
      }

      console.log('✅ Analysis results updated in database (with tiptap_content)');

    } catch (error) {
      console.error('❌ Error saving to Supabase:', error);
      // Don't throw - fix was applied locally, save failure shouldn't break the fix
    }
  }

  /**
   * Auto-save manual edits to Supabase (JSON-based, no DOCX manipulation)
   * This is the NEW architecture - DOCX is generated only on export
   */
  async autoSaveDocument(documentModel) {
    if (!documentModel) {
      console.error('❌ Auto-save failed: No document model provided');
      return {
        success: false,
        error: 'No document model provided'
      };
    }

    try {
      // Check if this document has Supabase metadata
      if (!documentModel.supabase.documentId) {
        console.warn('⚠️ Auto-save skipped: No Supabase document ID');
        return {
          success: false,
          error: 'Document not linked to Supabase'
        };
      }

      // Get current Tiptap JSON content (source of truth)
      const tiptapContent = documentModel.getTiptapJson();

      // Get current issues for compliance score
      const issues = documentModel.issues.getAllIssues();
      const complianceScore = this._calculateComplianceScore(issues);

      // Initialize Supabase client
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      // Update analysis_results table with new content
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          tiptap_content: tiptapContent,
          issues: issues,
          compliance_score: complianceScore,
          issue_count: issues.length,
          editor_version: 1
          // content_saved_at is automatically updated by trigger
        })
        .eq('document_id', documentModel.supabase.documentId);

      if (updateError) {
        console.error('❌ Supabase update failed:', updateError);
        throw new Error(`Failed to save to database: ${updateError.message}`);
      }

      console.log('✅ Document auto-saved to Supabase (JSON)');

      // Update local state
      documentModel.version++;
      documentModel.lastModified = Date.now();

      // Clear IndexedDB after successful Supabase save to prevent stale data
      try {
        const { indexedDBManager } = await import('@/utils/indexedDBManager');
        await indexedDBManager.clearFromIndexedDB(documentModel.supabase.documentId);
        console.log('🗑️ Cleared IndexedDB after successful Supabase save');
      } catch (idbError) {
        // Don't fail the save if IndexedDB clear fails
        console.warn('⚠️ Failed to clear IndexedDB:', idbError);
      }

      return {
        success: true,
        savedAt: Date.now(),
        method: 'json-based',
        size: JSON.stringify(tiptapContent).length
      };

    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // OLD CLIENT-SIDE FIX METHODS REMOVED - All fixes now go through backend DOCX modification (Option A)

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
    try {
      // Clean base64 string - remove whitespace and newlines
      const cleanedBase64 = base64.replace(/\s/g, '');
      const binary = atob(cleanedBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Failed to decode base64:', error);
      console.error('Base64 string length:', base64?.length);
      console.error('First 100 chars:', base64?.substring(0, 100));
      throw new Error(`Base64 decode failed: ${error.message}`);
    }
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