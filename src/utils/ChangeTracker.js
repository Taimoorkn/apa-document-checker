'use client';

import { v4 as uuidv4 } from 'uuid';

/**
 * ChangeTracker - Efficient diff and change detection system
 * Enables incremental analysis and precise undo/redo functionality
 */
export class ChangeTracker {
  constructor() {
    this.changeThreshold = 50; // Minimum characters for significant change
    this.diffCache = new Map(); // Cache diff results for performance
    this.maxCacheSize = 100;
  }

  /**
   * Detect changes between two document states
   */
  detectChanges(oldContent, newContent) {
    if (!oldContent || !newContent) {
      return {
        hasChanges: true,
        type: 'complete-replacement',
        operations: [{
          type: 'replace-all',
          oldContent,
          newContent,
          timestamp: Date.now()
        }]
      };
    }

    // Check cache first
    const cacheKey = this._getCacheKey(oldContent, newContent);
    if (this.diffCache.has(cacheKey)) {
      return this.diffCache.get(cacheKey);
    }

    const operations = [];

    // Handle different content types
    if (this._isTiptapDocument(oldContent) && this._isTiptapDocument(newContent)) {
      const docChanges = this._detectTiptapDocumentChanges(oldContent, newContent);
      operations.push(...docChanges);
    } else if (typeof oldContent === 'string' && typeof newContent === 'string') {
      const textChanges = this._detectTextChanges(oldContent, newContent);
      operations.push(...textChanges);
    } else {
      // Generic object comparison
      const objectChanges = this._detectObjectChanges(oldContent, newContent);
      operations.push(...objectChanges);
    }

    const result = {
      hasChanges: operations.length > 0,
      type: this._classifyChangeType(operations),
      operations,
      timestamp: Date.now()
    };

    // Cache result
    this._cacheResult(cacheKey, result);

    return result;
  }

  /**
   * Apply change operations to content
   */
  applyChanges(baseContent, changes) {
    if (!changes.operations || changes.operations.length === 0) {
      return baseContent;
    }

    let result = this._cloneContent(baseContent);

    // Apply operations in sequence
    for (const operation of changes.operations) {
      result = this._applyOperation(result, operation);
    }

    return result;
  }

  /**
   * Create reverse operations for undo functionality
   */
  createReverseOperations(changes) {
    if (!changes.operations) {
      return { operations: [] };
    }

    const reverseOps = changes.operations.map(op => this._reverseOperation(op)).reverse();

    return {
      hasChanges: reverseOps.length > 0,
      type: 'reverse',
      operations: reverseOps,
      timestamp: Date.now()
    };
  }

  /**
   * Detect paragraph-level changes for incremental analysis
   */
  detectParagraphChanges(oldParagraphs, newParagraphs) {
    const changes = {
      added: [],
      removed: [],
      modified: [],
      moved: [],
      unchanged: []
    };

    // Convert to maps for efficient lookup
    const oldMap = new Map();
    const newMap = new Map();

    if (Array.isArray(oldParagraphs)) {
      oldParagraphs.forEach((para, index) => {
        const id = para.id || `temp-${index}`;
        oldMap.set(id, { ...para, index });
      });
    }

    if (Array.isArray(newParagraphs)) {
      newParagraphs.forEach((para, index) => {
        const id = para.id || `temp-${index}`;
        newMap.set(id, { ...para, index });
      });
    }

    // Find removed paragraphs
    for (const [id, oldPara] of oldMap) {
      if (!newMap.has(id)) {
        changes.removed.push({
          id,
          paragraph: oldPara,
          oldIndex: oldPara.index
        });
      }
    }

    // Find added and modified paragraphs
    for (const [id, newPara] of newMap) {
      const oldPara = oldMap.get(id);

      if (!oldPara) {
        // New paragraph
        changes.added.push({
          id,
          paragraph: newPara,
          newIndex: newPara.index
        });
      } else {
        // Check for modifications
        const paraChanges = this._compareParagraphs(oldPara, newPara);

        if (paraChanges.hasChanges) {
          changes.modified.push({
            id,
            oldParagraph: oldPara,
            newParagraph: newPara,
            changes: paraChanges,
            oldIndex: oldPara.index,
            newIndex: newPara.index
          });
        } else if (oldPara.index !== newPara.index) {
          // Moved paragraph
          changes.moved.push({
            id,
            paragraph: newPara,
            oldIndex: oldPara.index,
            newIndex: newPara.index
          });
        } else {
          // Unchanged paragraph
          changes.unchanged.push({
            id,
            paragraph: newPara,
            index: newPara.index
          });
        }
      }
    }

    return changes;
  }

  /**
   * Calculate change significance for analysis prioritization
   */
  calculateChangeSignificance(changes) {
    if (!changes.operations) {
      return 0;
    }

    let score = 0;

    changes.operations.forEach(op => {
      switch (op.type) {
        case 'paragraph-add':
        case 'paragraph-remove':
          score += 10;
          break;
        case 'text-replace':
          const textLength = (op.newText || '').length;
          score += Math.min(textLength / 10, 5);
          break;
        case 'formatting-change':
          score += 2;
          break;
        case 'move':
          score += 3;
          break;
        default:
          score += 1;
      }
    });

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Merge multiple change sets for batch processing
   */
  mergeChanges(changesList) {
    if (!changesList || changesList.length === 0) {
      return { operations: [], hasChanges: false };
    }

    if (changesList.length === 1) {
      return changesList[0];
    }

    const mergedOperations = [];
    let hasChanges = false;

    changesList.forEach(changes => {
      if (changes.operations) {
        mergedOperations.push(...changes.operations);
        hasChanges = hasChanges || changes.hasChanges;
      }
    });

    // Remove duplicate operations
    const uniqueOperations = this._deduplicateOperations(mergedOperations);

    return {
      hasChanges,
      type: 'merged',
      operations: uniqueOperations,
      timestamp: Date.now()
    };
  }

  // Private methods

  _detectTiptapDocumentChanges(oldDoc, newDoc) {
    const operations = [];

    if (!oldDoc.content || !newDoc.content) {
      return [{
        type: 'document-replace',
        oldContent: oldDoc,
        newContent: newDoc
      }];
    }

    const oldParagraphs = oldDoc.content.filter(node => node.type === 'paragraph');
    const newParagraphs = newDoc.content.filter(node => node.type === 'paragraph');

    const paragraphChanges = this.detectParagraphChanges(
      oldParagraphs.map((node, index) => ({
        id: node.id || `para-${index}`,
        node,
        index
      })),
      newParagraphs.map((node, index) => ({
        id: node.id || `para-${index}`,
        node,
        index
      }))
    );

    // Convert paragraph changes to operations
    paragraphChanges.added.forEach(change => {
      operations.push({
        type: 'paragraph-add',
        paragraphId: change.id,
        content: change.paragraph.node,
        index: change.newIndex
      });
    });

    paragraphChanges.removed.forEach(change => {
      operations.push({
        type: 'paragraph-remove',
        paragraphId: change.id,
        content: change.paragraph.node,
        index: change.oldIndex
      });
    });

    paragraphChanges.modified.forEach(change => {
      operations.push({
        type: 'paragraph-modify',
        paragraphId: change.id,
        oldContent: change.oldParagraph.node,
        newContent: change.newParagraph.node,
        oldIndex: change.oldIndex,
        newIndex: change.newIndex,
        changes: change.changes
      });
    });

    paragraphChanges.moved.forEach(change => {
      operations.push({
        type: 'paragraph-move',
        paragraphId: change.id,
        oldIndex: change.oldIndex,
        newIndex: change.newIndex
      });
    });

    return operations;
  }

  _detectTextChanges(oldText, newText) {
    if (oldText === newText) {
      return [];
    }

    // Simple diff algorithm for text changes
    const operations = [];

    // Check if it's a simple replacement
    if (oldText.length > 0 && newText.length > 0) {
      // Find common prefix and suffix
      let prefixLength = 0;
      while (prefixLength < oldText.length &&
             prefixLength < newText.length &&
             oldText[prefixLength] === newText[prefixLength]) {
        prefixLength++;
      }

      let suffixLength = 0;
      while (suffixLength < (oldText.length - prefixLength) &&
             suffixLength < (newText.length - prefixLength) &&
             oldText[oldText.length - 1 - suffixLength] === newText[newText.length - 1 - suffixLength]) {
        suffixLength++;
      }

      if (prefixLength > 0 || suffixLength > 0) {
        const oldMiddle = oldText.substring(prefixLength, oldText.length - suffixLength);
        const newMiddle = newText.substring(prefixLength, newText.length - suffixLength);

        if (oldMiddle !== newMiddle) {
          operations.push({
            type: 'text-replace',
            position: prefixLength,
            oldText: oldMiddle,
            newText: newMiddle,
            length: oldMiddle.length
          });
        }
      } else {
        // Complete replacement
        operations.push({
          type: 'text-replace',
          position: 0,
          oldText,
          newText,
          length: oldText.length
        });
      }
    } else if (oldText.length === 0) {
      // Insertion
      operations.push({
        type: 'text-insert',
        position: 0,
        text: newText
      });
    } else if (newText.length === 0) {
      // Deletion
      operations.push({
        type: 'text-delete',
        position: 0,
        text: oldText,
        length: oldText.length
      });
    }

    return operations;
  }

  _detectObjectChanges(oldObj, newObj) {
    const operations = [];

    // Simple object property comparison
    const oldKeys = Object.keys(oldObj || {});
    const newKeys = Object.keys(newObj || {});

    // Find removed properties
    oldKeys.forEach(key => {
      if (!(key in newObj)) {
        operations.push({
          type: 'property-remove',
          key,
          oldValue: oldObj[key]
        });
      }
    });

    // Find added and modified properties
    newKeys.forEach(key => {
      if (!(key in oldObj)) {
        operations.push({
          type: 'property-add',
          key,
          newValue: newObj[key]
        });
      } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        operations.push({
          type: 'property-modify',
          key,
          oldValue: oldObj[key],
          newValue: newObj[key]
        });
      }
    });

    return operations;
  }

  _compareParagraphs(oldPara, newPara) {
    const changes = {
      hasChanges: false,
      textChanged: false,
      formattingChanged: false,
      positionChanged: false
    };

    // Compare text content
    const oldText = this._extractParagraphText(oldPara);
    const newText = this._extractParagraphText(newPara);

    if (oldText !== newText) {
      changes.hasChanges = true;
      changes.textChanged = true;
      changes.textDiff = this._detectTextChanges(oldText, newText);
    }

    // Compare formatting
    if (this._hasFormattingChanged(oldPara, newPara)) {
      changes.hasChanges = true;
      changes.formattingChanged = true;
    }

    // Compare position
    if (oldPara.index !== newPara.index) {
      changes.hasChanges = true;
      changes.positionChanged = true;
    }

    return changes;
  }

  _extractParagraphText(paragraph) {
    if (typeof paragraph === 'string') {
      return paragraph;
    }

    if (paragraph.text) {
      return paragraph.text;
    }

    if (paragraph.node && paragraph.node.content) {
      return paragraph.node.content
        .map(node => node.text || '')
        .join('');
    }

    return '';
  }

  _hasFormattingChanged(oldPara, newPara) {
    // Simple formatting comparison
    const oldFormatting = JSON.stringify(oldPara.formatting || {});
    const newFormatting = JSON.stringify(newPara.formatting || {});
    return oldFormatting !== newFormatting;
  }

  _applyOperation(content, operation) {
    switch (operation.type) {
      case 'text-replace':
        if (typeof content === 'string') {
          return content.substring(0, operation.position) +
                 operation.newText +
                 content.substring(operation.position + operation.length);
        }
        break;

      case 'text-insert':
        if (typeof content === 'string') {
          return content.substring(0, operation.position) +
                 operation.text +
                 content.substring(operation.position);
        }
        break;

      case 'text-delete':
        if (typeof content === 'string') {
          return content.substring(0, operation.position) +
                 content.substring(operation.position + operation.length);
        }
        break;

      case 'paragraph-add':
        if (this._isTiptapDocument(content)) {
          const newContent = [...content.content];
          newContent.splice(operation.index, 0, operation.content);
          return { ...content, content: newContent };
        }
        break;

      case 'paragraph-remove':
        if (this._isTiptapDocument(content)) {
          const newContent = [...content.content];
          newContent.splice(operation.index, 1);
          return { ...content, content: newContent };
        }
        break;

      case 'paragraph-modify':
        if (this._isTiptapDocument(content)) {
          const newContent = [...content.content];
          newContent[operation.newIndex] = operation.newContent;
          return { ...content, content: newContent };
        }
        break;

      case 'replace-all':
        return operation.newContent;
    }

    return content;
  }

  _reverseOperation(operation) {
    switch (operation.type) {
      case 'text-replace':
        return {
          type: 'text-replace',
          position: operation.position,
          oldText: operation.newText,
          newText: operation.oldText,
          length: operation.newText.length
        };

      case 'text-insert':
        return {
          type: 'text-delete',
          position: operation.position,
          text: operation.text,
          length: operation.text.length
        };

      case 'text-delete':
        return {
          type: 'text-insert',
          position: operation.position,
          text: operation.text
        };

      case 'paragraph-add':
        return {
          type: 'paragraph-remove',
          paragraphId: operation.paragraphId,
          content: operation.content,
          index: operation.index
        };

      case 'paragraph-remove':
        return {
          type: 'paragraph-add',
          paragraphId: operation.paragraphId,
          content: operation.content,
          index: operation.index
        };

      case 'paragraph-modify':
        return {
          type: 'paragraph-modify',
          paragraphId: operation.paragraphId,
          oldContent: operation.newContent,
          newContent: operation.oldContent,
          oldIndex: operation.newIndex,
          newIndex: operation.oldIndex,
          changes: operation.changes
        };

      case 'replace-all':
        return {
          type: 'replace-all',
          oldContent: operation.newContent,
          newContent: operation.oldContent
        };

      default:
        return operation;
    }
  }

  _classifyChangeType(operations) {
    if (operations.length === 0) return 'none';
    if (operations.length === 1) {
      return operations[0].type;
    }

    const types = new Set(operations.map(op => op.type));
    if (types.has('paragraph-add') || types.has('paragraph-remove')) {
      return 'structural';
    }
    if (types.has('text-replace') || types.has('text-insert') || types.has('text-delete')) {
      return 'content';
    }
    return 'mixed';
  }

  _isTiptapDocument(content) {
    return content &&
           typeof content === 'object' &&
           content.type === 'doc' &&
           Array.isArray(content.content);
  }

  _cloneContent(content) {
    if (typeof content === 'string') {
      return content;
    }
    return JSON.parse(JSON.stringify(content));
  }

  _deduplicateOperations(operations) {
    const seen = new Set();
    return operations.filter(op => {
      const key = `${op.type}-${op.position || op.index || 0}-${JSON.stringify(op.oldText || op.oldContent || '')}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  _getCacheKey(oldContent, newContent) {
    const oldHash = this._hashContent(oldContent);
    const newHash = this._hashContent(newContent);
    return `${oldHash}->${newHash}`;
  }

  _hashContent(content) {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  _cacheResult(key, result) {
    if (this.diffCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const keysToRemove = Array.from(this.diffCache.keys()).slice(0, 10);
      keysToRemove.forEach(k => this.diffCache.delete(k));
    }
    this.diffCache.set(key, result);
  }
}

/**
 * Transaction system for atomic document operations
 */
export class DocumentTransaction {
  constructor(documentModel, changeTracker) {
    this.id = uuidv4();
    this.documentModel = documentModel;
    this.changeTracker = changeTracker;
    this.operations = [];
    this.rollbackData = [];
    this.completed = false;
    this.rolledBack = false;
    this.startTime = Date.now();
  }

  /**
   * Update paragraph content
   */
  updateParagraph(paragraphId, changes) {
    if (this.completed) {
      throw new Error('Transaction already completed');
    }

    const paragraph = this.documentModel.paragraphs.get(paragraphId);
    if (!paragraph) {
      throw new Error(`Paragraph not found: ${paragraphId}`);
    }

    // Store rollback data
    this.rollbackData.push({
      type: 'paragraph-update',
      paragraphId,
      oldText: paragraph.text,
      oldFormatting: JSON.parse(JSON.stringify(paragraph.formatting)),
      oldChangeSequence: paragraph.changeSequence
    });

    this.operations.push({
      type: 'update-paragraph',
      paragraphId,
      changes,
      execute: () => paragraph.update(changes),
      rollback: () => this._rollbackParagraph(paragraphId)
    });

    return this;
  }

  /**
   * Add new paragraph
   */
  addParagraph(paragraph, index = -1) {
    if (this.completed) {
      throw new Error('Transaction already completed');
    }

    const insertIndex = index >= 0 ? index : this.documentModel.paragraphOrder.length;

    this.rollbackData.push({
      type: 'paragraph-add',
      paragraphId: paragraph.id,
      insertIndex
    });

    this.operations.push({
      type: 'add-paragraph',
      paragraph,
      index: insertIndex,
      execute: () => {
        this.documentModel.paragraphs.set(paragraph.id, paragraph);
        this.documentModel.paragraphOrder.splice(insertIndex, 0, paragraph.id);
      },
      rollback: () => this._rollbackParagraphAdd(paragraph.id, insertIndex)
    });

    return this;
  }

  /**
   * Remove paragraph
   */
  removeParagraph(paragraphId) {
    if (this.completed) {
      throw new Error('Transaction already completed');
    }

    const paragraph = this.documentModel.paragraphs.get(paragraphId);
    const index = this.documentModel.paragraphOrder.indexOf(paragraphId);

    if (!paragraph || index === -1) {
      throw new Error(`Paragraph not found: ${paragraphId}`);
    }

    this.rollbackData.push({
      type: 'paragraph-remove',
      paragraphId,
      paragraph: paragraph.clone(),
      index
    });

    this.operations.push({
      type: 'remove-paragraph',
      paragraphId,
      execute: () => {
        this.documentModel.paragraphs.delete(paragraphId);
        this.documentModel.paragraphOrder.splice(index, 1);
      },
      rollback: () => this._rollbackParagraphRemove(paragraphId, paragraph.clone(), index)
    });

    return this;
  }

  /**
   * Commit all operations atomically
   */
  async commit() {
    if (this.completed) {
      throw new Error('Transaction already completed');
    }

    try {
      // Execute all operations
      this.operations.forEach(op => op.execute());

      // Update document metadata
      this.documentModel.lastModified = Date.now();
      this.documentModel.version++;

      // Record transaction in change log
      this.documentModel.changeLog.recordChange({
        type: 'transaction-committed',
        transactionId: this.id,
        operationCount: this.operations.length,
        duration: Date.now() - this.startTime,
        operations: this.operations.map(op => ({
          type: op.type,
          paragraphId: op.paragraphId || null,
          changes: op.changes || null
        }))
      });

      this.completed = true;
      return true;

    } catch (error) {
      // Auto-rollback on error
      await this.rollback();
      throw error;
    }
  }

  /**
   * Rollback all operations
   */
  async rollback() {
    if (this.rolledBack) {
      return true;
    }

    try {
      // Execute rollback operations in reverse order
      this.operations.reverse().forEach(op => {
        try {
          op.rollback();
        } catch (error) {
          console.error(`Error rolling back operation ${op.type}:`, error);
        }
      });

      this.rolledBack = true;
      this.completed = true;

      // Record rollback in change log
      this.documentModel.changeLog.recordChange({
        type: 'transaction-rolled-back',
        transactionId: this.id,
        operationCount: this.operations.length
      });

      return true;

    } catch (error) {
      console.error('Error during transaction rollback:', error);
      return false;
    }
  }

  // Private rollback methods
  _rollbackParagraph(paragraphId) {
    const rollbackData = this.rollbackData.find(
      data => data.type === 'paragraph-update' && data.paragraphId === paragraphId
    );

    if (rollbackData) {
      const paragraph = this.documentModel.paragraphs.get(paragraphId);
      if (paragraph) {
        paragraph.text = rollbackData.oldText;
        paragraph.formatting = rollbackData.oldFormatting;
        paragraph.changeSequence = rollbackData.oldChangeSequence;
      }
    }
  }

  _rollbackParagraphAdd(paragraphId, insertIndex) {
    this.documentModel.paragraphs.delete(paragraphId);
    const orderIndex = this.documentModel.paragraphOrder.indexOf(paragraphId);
    if (orderIndex !== -1) {
      this.documentModel.paragraphOrder.splice(orderIndex, 1);
    }
  }

  _rollbackParagraphRemove(paragraphId, paragraph, index) {
    this.documentModel.paragraphs.set(paragraphId, paragraph);
    this.documentModel.paragraphOrder.splice(index, 0, paragraphId);
  }
}