'use client';

import { create } from 'zustand';
import { DocumentService } from '@/services/DocumentService';
import { ChangeTracker, DocumentTransaction } from '@/utils/ChangeTracker';
import { DocumentModel } from '@/models/DocumentModel';

/**
 * Unified Document Store - Single Source of Truth
 * Replaces enhancedDocumentStore.js with DocumentModel-based architecture
 */

// Simple event emitter for cross-component communication (keeping from original)
class StoreEventEmitter {
  constructor() {
    this.listeners = new Map();
    this.MAX_LISTENERS_WARNING = 10; // Warn if more than 10 listeners on same event
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Memory leak detection: warn if too many listeners
    const listenerCount = this.listeners.get(event).size;
    if (listenerCount > this.MAX_LISTENERS_WARNING) {
      console.warn(
        `⚠️ [StoreEventEmitter] Potential memory leak detected: ${listenerCount} listeners registered for event "${event}". ` +
        `This may indicate missing cleanup in useEffect. Check that all event listeners return cleanup functions.`
      );
    }

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  clear() {
    this.listeners.clear();
  }

  // Debug helper: get listener count for an event
  getListenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).size : 0;
  }

  // Debug helper: get all listener counts
  getAllListenerCounts() {
    const counts = {};
    this.listeners.forEach((listeners, event) => {
      counts[event] = listeners.size;
    });
    return counts;
  }
}

const storeEvents = new StoreEventEmitter();

export const useUnifiedDocumentStore = create((set, get) => ({
  // Single source of truth - DocumentModel
  documentModel: null,
  documentService: (() => {
    const service = new DocumentService();
    // Wire auto-save callback immediately
    service.setScheduleAutoSaveCallback((documentModel, debounceMs) => {
      get().scheduleAutoSave(false, debounceMs);
    });
    return service;
  })(),
  changeTracker: new ChangeTracker(),

  // UI state (derived from document model)
  processingState: {
    isUploading: false,
    isAnalyzing: false,
    isApplyingFix: false,
    lastError: null,
    progress: 0,
    stage: null,
    currentFixId: null
  },

  // Editor state
  editorState: {
    content: null,
    needsSync: false,
    lastSyncTimestamp: 0,
    isInitialized: false
  },

  // UI preferences moved to React state in useUnifiedDocumentEditor.js
  // Auto-save and analysis now handled by dedicated hooks

  // Snapshots for undo/redo
  snapshots: [],
  maxSnapshots: 10,
  currentSnapshotIndex: -1,

  // Event emitter
  events: storeEvents,

  // === DOCUMENT OPERATIONS ===

  /**
   * Load document from file upload
   */
  uploadDocument: async (file) => {
    if (!file) {
      throw new Error('No file provided');
    }

    set(state => ({
      processingState: {
        ...state.processingState,
        isUploading: true,
        lastError: null,
        progress: 10,
        stage: 'Uploading document...'
      }
    }));

    try {
      set(state => ({
        processingState: {
          ...state.processingState,
          progress: 30,
          stage: 'Processing on server...'
        }
      }));

      const result = await get().documentService.loadDocument(file);

      set(state => ({
        processingState: {
          ...state.processingState,
          progress: 80,
          stage: 'Initializing document...'
        }
      }));

      // Store document model
      set(state => ({
        documentModel: result.documentModel,
        processingState: {
          ...state.processingState,
          progress: 100,
          isUploading: false,
          stage: 'Upload complete'
        },
        editorState: {
          ...state.editorState,
          content: null // Will be set by editor from getTiptapJson()
        }
      }));

      // Create initial snapshot
      get().createSnapshot('Document uploaded');

      // Automatically trigger analysis for the uploaded document
      setTimeout(async () => {
        try {
          await get().analyzeDocument({ force: true });
        } catch (error) {
          console.error('Auto-analysis failed:', error);
        }

        set(state => ({
          processingState: {
            ...state.processingState,
            stage: null
          }
        }));
      }, 100); // Quick delay to let state settle

      return {
        success: true,
        documentId: result.documentModel.id,
        stats: result.stats
      };

    } catch (error) {
      console.error('Error uploading document:', error);
      set(state => ({
        processingState: {
          ...state.processingState,
          isUploading: false,
          lastError: error.message,
          progress: 0,
          stage: null
        }
      }));
      throw error;
    }
  },

  /**
   * Load existing document from Supabase (for viewing processed documents)
   */
  loadExistingDocument: async (documentData, issues = [], supabaseMetadata = null) => {
    try {
      // Create DocumentModel from server data
      const documentModel = DocumentModel.fromServerData(documentData, null);

      // Set Supabase metadata for fix application
      if (supabaseMetadata) {
        documentModel.supabase.documentId = supabaseMetadata.documentId;
        documentModel.supabase.filePath = supabaseMetadata.filePath;
        documentModel.supabase.userId = supabaseMetadata.userId;
      }

      // NEW: If tiptap_content is available, use it as editor content (edited version)
      const initialEditorContent = documentData.tiptapContent || null;

      // Store document model and issues
      set(state => ({
        documentModel,
        editorState: {
          ...state.editorState,
          content: initialEditorContent // Use saved tiptap_content if available
        }
      }));

      // Load issues into DocumentModel's IssueTracker
      if (issues && issues.length > 0) {
        issues.forEach(issue => {
          documentModel.issues.addIssue(issue);
        });
      }

      // Create initial snapshot
      get().createSnapshot('Document loaded from database');

      console.log(`✅ Existing document loaded: ${documentModel.metadata.name}`);

      return {
        success: true,
        documentId: documentModel.id,
        stats: documentModel.getStatistics()
      };
    } catch (error) {
      console.error('Error loading existing document:', error);
      throw error;
    }
  },

  /**
   * Analyze document for APA compliance
   */
  /**
   * Perform APA analysis (Legacy method - kept for backward compatibility)
   * In new architecture, analysis is handled by useAnalysis hook
   */
  analyzeDocument: async (options = {}) => {
    const { force = false } = options;
    const state = get();

    console.log('🧠 Starting APA analysis (legacy method)...', { force, hasDocument: !!state.documentModel });

    if (!state.documentModel) {
      throw new Error('No document loaded');
    }

    if (state.processingState.isAnalyzing && !force) {
      console.log('Analysis already in progress');
      return { success: false, message: 'Analysis already in progress' };
    }

    set(currentState => ({
      processingState: {
        ...currentState.processingState,
        isAnalyzing: true,
        lastError: null,
        stage: 'Analyzing document...'
      }
    }));

    try {
      // Always do full analysis (no incremental mode in legacy method)
      const analysisOptions = {
        force: true,
        changedParagraphs: null,
        preserveUnchanged: false
      };

      const result = await state.documentService.analyzeDocument(state.documentModel, analysisOptions);

      set(currentState => ({
        processingState: {
          ...currentState.processingState,
          isAnalyzing: false,
          stage: null
        }
      }));

      // Emit analysis complete event
      storeEvents.emit('analysisComplete', {
        issueCount: result.issueCount,
        analysisScore: result.analysisScore,
        analysisType: result.analysisType
      });

      return {
        success: true,
        issues: result.issues,
        issueCount: result.issueCount,
        analysisScore: result.analysisScore,
        analysisTime: result.analysisTime,
        analysisType: result.analysisType
      };

    } catch (error) {
      console.error('Error analyzing document:', error);
      set(currentState => ({
        processingState: {
          ...currentState.processingState,
          isAnalyzing: false,
          lastError: error.message,
          stage: null
        }
      }));
      throw error;
    }
  },

  /**
   * Apply fix to issue
   */
  applyFix: async (issueId) => {
    const state = get();

    if (!state.documentModel || !issueId) {
      throw new Error('Document model and issue ID required');
    }

    if (state.processingState.isApplyingFix) {
      throw new Error('Another fix is already being applied');
    }

    set(currentState => ({
      processingState: {
        ...currentState.processingState,
        isApplyingFix: true,
        currentFixId: issueId,
        stage: `Applying fix for issue ${issueId}`
      }
    }));

    try {
      // Get the issue to access pmPosition
      const issue = state.documentModel.issues.issues.get(issueId);

      const result = await state.documentService.applyFix(state.documentModel, issueId);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Fix result from DocumentService:', {
          success: result.success,
          error: result.error,
          hasFixData: !!result.fixData,
          fixDataType: result.fixData?.type,
          fixAction: result.fixAction,
          fixedIssueId: result.fixedIssueId,
          hasPmPosition: !!issue?.pmPosition
        });
      }

      // Check if fix was successful
      if (!result.success) {
        set(currentState => ({
          processingState: {
            ...currentState.processingState,
            isApplyingFix: false,
            currentFixId: null,
            lastError: result.error || 'Fix failed',
            stage: null
          }
        }));

        return {
          success: false,
          error: result.error || 'Fix failed'
        };
      }

      set(currentState => ({
        processingState: {
          ...currentState.processingState,
          isApplyingFix: false,
          currentFixId: null,
          stage: null
        }
      }));

      // Emit fix applied event with transaction data for editor
      storeEvents.emit('fixApplied', {
        issueId,
        fixAction: result.fixAction,
        snapshotId: result.snapshotId,
        fixData: result.fixData, // Transaction data for ProseMirror
        pmPosition: issue?.pmPosition // NEW: Direct ProseMirror position from issue
      });

      return {
        success: true,
        fixedIssueId: result.fixedIssueId,
        fixAction: result.fixAction
      };

    } catch (error) {
      console.error('Error applying fix:', error);
      set(currentState => ({
        processingState: {
          ...currentState.processingState,
          isApplyingFix: false,
          currentFixId: null,
          lastError: error.message,
          stage: null
        }
      }));
      throw error;
    }
  },

  // === EDITOR SYNCHRONIZATION ===
  // Sync methods removed - now handled by hooks (useAutoSave, useAnalysis)

  /**
   * Get current editor content from document model
   * NEW: Prefers stored tiptap_content (edited version) over generated content
   */
  getEditorContent: () => {
    const state = get();
    if (!state.documentModel) {
      return null;
    }

    // If we have saved tiptap_content in editorState, use it (edited version)
    if (state.editorState.content) {
      return state.editorState.content;
    }

    // Otherwise, generate from DocumentModel (original version)
    return state.documentModel.getTiptapJson();
  },

  // Schedule methods removed - now handled by hooks (useAutoSave, useAnalysis)

  // === DERIVED STATE GETTERS ===

  /**
   * Get document statistics
   */
  getDocumentStats: () => {
    const state = get();
    if (!state.documentModel) {
      return { wordCount: 0, charCount: 0, paragraphCount: 0 };
    }
    return state.documentModel.getStatistics();
  },

  /**
   * Get all issues (with hasFix corrected based on actual implementation)
   */
  getIssues: () => {
    const state = get();
    if (!state.documentModel) {
      return [];
    }
    const issues = state.documentModel.issues.getAllIssues();

    // Correct hasFix based on actual implementation availability
    return issues.map(issue => {
      if (issue.hasFix) {
        const isImplemented = state.documentService.isFixImplemented(issue.fixAction);
        return {
          ...issue,
          hasFix: isImplemented
        };
      }
      return issue;
    });
  },

  /**
   * Get compliance score
   */
  getComplianceScore: () => {
    const state = get();
    if (!state.documentModel) {
      return null;
    }

    const issues = state.documentModel.issues.getAllIssues();
    if (issues.length === 0) return 100;

    const criticalCount = issues.filter(i => i.severity === 'Critical').length;
    const majorCount = issues.filter(i => i.severity === 'Major').length;
    const minorCount = issues.filter(i => i.severity === 'Minor').length;

    return Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 8 + majorCount * 4 + minorCount * 1.5))));
  },

  /**
   * Get document info
   */
  getDocumentInfo: () => {
    const state = get();
    if (!state.documentModel) {
      return null;
    }
    return state.documentService.getDocumentInfo(state.documentModel);
  },

  // === UI STATE MANAGEMENT ===
  // UI state methods removed - now handled in React state (useUnifiedDocumentEditor)

  // === SNAPSHOT AND UNDO/REDO ===

  /**
   * Create document snapshot
   */
  createSnapshot: (description = 'User action') => {
    const state = get();
    if (!state.documentModel) {
      return null;
    }

    const snapshot = state.documentModel.createSnapshot();
    snapshot.description = description;

    set(currentState => {
      // If user has done undo and is now making a new edit,
      // we need to discard all redo history (everything after currentSnapshotIndex)
      let newSnapshots;
      if (currentState.currentSnapshotIndex < currentState.snapshots.length - 1) {
        // Clear redo history and add new snapshot
        newSnapshots = [
          ...currentState.snapshots.slice(0, currentState.currentSnapshotIndex + 1),
          snapshot
        ];
      } else {
        // Normal case: just append
        newSnapshots = [...currentState.snapshots, snapshot];
      }

      // Trim to max snapshots from the beginning
      if (newSnapshots.length > currentState.maxSnapshots) {
        newSnapshots.shift();
      }

      return {
        snapshots: newSnapshots,
        currentSnapshotIndex: newSnapshots.length - 1
      };
    });

    return snapshot.id;
  },

  /**
   * Undo to previous snapshot
   */
  undo: () => {
    const state = get();
    if (!state.documentModel || state.currentSnapshotIndex < 0) {
      return false;
    }

    const snapshot = state.snapshots[state.currentSnapshotIndex];
    if (!snapshot) {
      return false;
    }

    try {
      state.documentModel.restoreFromSnapshot(snapshot);

      set(currentState => ({
        currentSnapshotIndex: currentState.currentSnapshotIndex - 1
      }));

      storeEvents.emit('documentRestored', {
        snapshotId: snapshot.id,
        description: snapshot.description,
        type: 'undo'
      });

      return true;

    } catch (error) {
      console.error('Error during undo:', error);
      return false;
    }
  },

  /**
   * Check if undo is available
   */
  canUndo: () => {
    const state = get();
    return state.currentSnapshotIndex >= 0 && state.snapshots.length > 0;
  },

  /**
   * Redo to next snapshot
   */
  redo: () => {
    const state = get();
    if (!state.documentModel) {
      return false;
    }

    const nextIndex = state.currentSnapshotIndex + 1;
    if (nextIndex >= state.snapshots.length) {
      return false; // No redo available
    }

    const snapshot = state.snapshots[nextIndex];
    if (!snapshot) {
      return false;
    }

    try {
      state.documentModel.restoreFromSnapshot(snapshot);

      set(currentState => ({
        currentSnapshotIndex: nextIndex
      }));

      storeEvents.emit('documentRestored', {
        snapshotId: snapshot.id,
        description: snapshot.description,
        type: 'redo'
      });

      return true;

    } catch (error) {
      console.error('Error during redo:', error);
      return false;
    }
  },

  /**
   * Check if redo is available
   */
  canRedo: () => {
    const state = get();
    return state.currentSnapshotIndex < state.snapshots.length - 1;
  },

  // === EXPORT AND UTILITIES ===

  /**
   * Export document
   */
  exportDocument: async (format = 'html') => {
    const state = get();
    if (!state.documentModel) {
      throw new Error('No document loaded');
    }

    return await state.documentService.exportDocument(state.documentModel, format);
  },

  /**
   * Reset store state
   */
  reset: () => {
    // Clear event listeners
    storeEvents.clear();

    set({
      documentModel: null,
      processingState: {
        isUploading: false,
        isAnalyzing: false,
        isApplyingFix: false,
        lastError: null,
        progress: 0,
        stage: null,
        currentFixId: null
      },
      editorState: {
        content: null,
        lastSyncTimestamp: 0,
        isInitialized: false
      },
      snapshots: [],
      currentSnapshotIndex: -1
    });
  },

  // === TRANSACTION SUPPORT ===

  /**
   * Create transaction for atomic operations
   */
  createTransaction: () => {
    const state = get();
    if (!state.documentModel) {
      throw new Error('No document model available');
    }

    return new DocumentTransaction(state.documentModel, state.changeTracker);
  },

  // === DEBUGGING AND DEVELOPMENT ===

  /**
   * Get store state for debugging
   */
  _getDebugInfo: () => {
    const state = get();
    return {
      hasDocument: !!state.documentModel,
      documentId: state.documentModel?.id,
      documentVersion: state.documentModel?.version,
      paragraphCount: state.documentModel?.paragraphOrder.length || 0,
      issueCount: state.documentModel?.issues.getAllIssues().length || 0,
      processingState: state.processingState,
      editorState: state.editorState,
      snapshotCount: state.snapshots.length
    };
  }
}));