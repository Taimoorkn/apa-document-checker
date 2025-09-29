'use client';

import { create } from 'zustand';
import { DocumentService } from '@/services/DocumentService';
import { ChangeTracker, DocumentTransaction } from '@/utils/ChangeTracker';

/**
 * Unified Document Store - Single Source of Truth
 * Replaces enhancedDocumentStore.js with DocumentModel-based architecture
 */

// Simple event emitter for cross-component communication (keeping from original)
class StoreEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
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
}

const storeEvents = new StoreEventEmitter();

export const useUnifiedDocumentStore = create((set, get) => ({
  // Single source of truth - DocumentModel
  documentModel: null,
  documentService: new DocumentService(),
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

  // Analysis state
  analysisState: {
    lastAnalysisTimestamp: 0,
    pendingAnalysis: false,
    analysisDebounceTimeout: null,
    incrementalMode: true
  },

  // UI preferences
  uiState: {
    showIssueHighlighting: true,
    activeIssueId: null,
    selectedIssues: new Set()
  },

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
          needsSync: true,
          content: null // Will be set by editor sync
        },
        analysisState: {
          ...state.analysisState,
          lastAnalysisTimestamp: 0 // Reset for new document
        }
      }));

      // Create initial snapshot
      get().createSnapshot('Document uploaded');

      setTimeout(() => {
        set(state => ({
          processingState: {
            ...state.processingState,
            stage: null
          }
        }));
      }, 2000);

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
   * Analyze document for APA compliance
   */
  analyzeDocument: async (options = {}) => {
    const { force = false, incrementalOnly = false } = options;
    const state = get();

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
      },
      analysisState: {
        ...currentState.analysisState,
        pendingAnalysis: false
      }
    }));

    try {
      // Determine analysis type
      let changedParagraphs = null;
      const lastAnalysis = state.analysisState.lastAnalysisTimestamp;

      if (state.analysisState.incrementalMode && lastAnalysis > 0 && !force) {
        changedParagraphs = state.documentModel.getChangedParagraphs(lastAnalysis);

        // If no changes, skip analysis
        if (changedParagraphs.length === 0 && !force) {
          set(currentState => ({
            processingState: {
              ...currentState.processingState,
              isAnalyzing: false,
              stage: null
            }
          }));

          return {
            success: true,
            skipped: true,
            message: 'No changes detected - analysis skipped'
          };
        }
      }

      const analysisOptions = {
        force,
        changedParagraphs,
        preserveUnchanged: state.analysisState.incrementalMode
      };

      const result = await state.documentService.analyzeDocument(state.documentModel, analysisOptions);

      set(currentState => ({
        processingState: {
          ...currentState.processingState,
          isAnalyzing: false,
          stage: null
        },
        analysisState: {
          ...currentState.analysisState,
          lastAnalysisTimestamp: Date.now()
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
      const result = await state.documentService.applyFix(state.documentModel, issueId);

      set(currentState => ({
        processingState: {
          ...currentState.processingState,
          isApplyingFix: false,
          currentFixId: null,
          stage: null
        },
        editorState: {
          ...currentState.editorState,
          needsSync: true // Editor needs to update
        }
      }));

      // Emit fix applied event
      storeEvents.emit('fixApplied', {
        issueId,
        fixAction: result.fixAction,
        snapshotId: result.snapshotId
      });

      // Trigger incremental reanalysis if content changed
      if (!result.updatedDocument) {
        // Content fix - trigger incremental analysis
        setTimeout(() => {
          get().analyzeDocument({ incrementalOnly: true });
        }, 100);
      }

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

  /**
   * Sync editor content with document model
   */
  syncWithEditor: (tiptapDocument, changesMeta = {}) => {
    const state = get();

    if (!state.documentModel || !tiptapDocument) {
      return { success: false, message: 'Missing document model or editor content' };
    }

    try {
      const result = state.documentService.syncWithEditor(state.documentModel, tiptapDocument, changesMeta);

      if (result.hasChanges) {
        set(currentState => ({
          editorState: {
            ...currentState.editorState,
            lastSyncTimestamp: Date.now(),
            needsSync: false
          },
          analysisState: {
            ...currentState.analysisState,
            pendingAnalysis: result.needsReanalysis
          }
        }));

        // Trigger debounced analysis if needed
        if (result.needsReanalysis) {
          get().scheduleIncrementalAnalysis();
        }

        // Emit sync event
        storeEvents.emit('editorSynced', {
          changedParagraphs: result.changedParagraphs.map(p => p.id),
          documentVersion: result.documentVersion
        });
      }

      return result;

    } catch (error) {
      console.error('Error syncing with editor:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current editor content from document model
   */
  getEditorContent: () => {
    const state = get();
    if (!state.documentModel) {
      return null;
    }

    return state.documentModel.getTiptapJson();
  },

  /**
   * Schedule incremental analysis (debounced)
   */
  scheduleIncrementalAnalysis: (debounceMs = 3000) => {
    const state = get();

    // Clear existing timeout
    if (state.analysisState.analysisDebounceTimeout) {
      clearTimeout(state.analysisState.analysisDebounceTimeout);
    }

    const timeoutId = setTimeout(async () => {
      try {
        await get().analyzeDocument({ incrementalOnly: true });
      } catch (error) {
        console.error('Scheduled analysis failed:', error);
      }
    }, debounceMs);

    set(currentState => ({
      analysisState: {
        ...currentState.analysisState,
        analysisDebounceTimeout: timeoutId,
        pendingAnalysis: true
      }
    }));
  },

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
   * Get all issues
   */
  getIssues: () => {
    const state = get();
    if (!state.documentModel) {
      return [];
    }
    return state.documentModel.issues.getAllIssues();
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

  /**
   * Set active issue for highlighting
   */
  setActiveIssue: (issueId) => {
    set(state => ({
      uiState: {
        ...state.uiState,
        activeIssueId: issueId
      }
    }));

    storeEvents.emit('activeIssueChanged', {
      previousId: get().uiState.activeIssueId,
      currentId: issueId
    });
  },

  /**
   * Toggle issue highlighting
   */
  toggleIssueHighlighting: () => {
    set(state => ({
      uiState: {
        ...state.uiState,
        showIssueHighlighting: !state.uiState.showIssueHighlighting
      }
    }));
  },

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
      const newSnapshots = [...currentState.snapshots, snapshot];

      // Trim to max snapshots
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
        currentSnapshotIndex: currentState.currentSnapshotIndex - 1,
        editorState: {
          ...currentState.editorState,
          needsSync: true
        }
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
    const state = get();

    // Clear any pending timeouts
    if (state.analysisState.analysisDebounceTimeout) {
      clearTimeout(state.analysisState.analysisDebounceTimeout);
    }

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
        needsSync: false,
        lastSyncTimestamp: 0,
        isInitialized: false
      },
      analysisState: {
        lastAnalysisTimestamp: 0,
        pendingAnalysis: false,
        analysisDebounceTimeout: null,
        incrementalMode: true
      },
      uiState: {
        showIssueHighlighting: true,
        activeIssueId: null,
        selectedIssues: new Set()
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
      analysisState: state.analysisState,
      snapshotCount: state.snapshots.length
    };
  }
}));