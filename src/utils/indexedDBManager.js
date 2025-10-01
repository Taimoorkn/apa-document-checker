'use client';

import { openDB } from 'idb';

/**
 * IndexedDB Manager for local document persistence
 * Provides reload safety by storing Tiptap JSON locally
 *
 * Three-layer architecture:
 * 1. In-memory: Tiptap editor state (immediate edits)
 * 2. IndexedDB: Local persistence (reload safety) <- THIS LAYER
 * 3. Supabase: Long-term storage (multi-device sync)
 */

const DB_NAME = 'apa-checker';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    if (!this.isSupported) {
      console.warn('⚠️ IndexedDB not supported in this environment');
      return null;
    }

    if (this.db) {
      return this.db;
    }

    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create documents store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

            // Create indexes for efficient querying
            store.createIndex('lastSaved', 'lastSaved');
            store.createIndex('documentId', 'documentId');

            console.log('✅ IndexedDB object store created');
          }
        },
      });

      console.log('✅ IndexedDB initialized');
      return this.db;
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error);
      this.isSupported = false;
      return null;
    }
  }

  /**
   * Save document to IndexedDB
   * Called on every edit (debounced 2-3 seconds)
   *
   * @param {string} documentId - Document ID (from Supabase or temporary)
   * @param {object} tiptapContent - Tiptap JSON content
   * @param {object} metadata - Additional metadata
   */
  async saveToIndexedDB(documentId, tiptapContent, metadata = {}) {
    if (!this.isSupported) {
      return { success: false, error: 'IndexedDB not supported' };
    }

    try {
      await this.init();

      if (!this.db) {
        throw new Error('IndexedDB not initialized');
      }

      const documentData = {
        id: `doc-${documentId}`, // Prefix to avoid collisions
        documentId: documentId,
        tiptapContent: tiptapContent,
        lastSaved: Date.now(),
        metadata: {
          ...metadata,
          version: metadata.version || 1,
          userAgent: navigator.userAgent.substring(0, 100),
        }
      };

      await this.db.put(STORE_NAME, documentData);

      if (process.env.NODE_ENV === 'development') {
        console.log(`💾 Saved to IndexedDB: ${documentId}`, {
          size: JSON.stringify(tiptapContent).length,
          timestamp: new Date(documentData.lastSaved).toISOString()
        });
      }

      return {
        success: true,
        savedAt: documentData.lastSaved
      };

    } catch (error) {
      console.error('❌ Failed to save to IndexedDB:', error);

      // Check for quota exceeded error
      if (error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: 'Storage quota exceeded',
          shouldClearOld: true
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load document from IndexedDB
   * Called on page load/reload to restore unsaved changes
   *
   * @param {string} documentId - Document ID to load
   * @returns {object|null} Document data or null if not found
   */
  async loadFromIndexedDB(documentId) {
    if (!this.isSupported) {
      return null;
    }

    try {
      await this.init();

      if (!this.db) {
        return null;
      }

      const documentData = await this.db.get(STORE_NAME, `doc-${documentId}`);

      if (documentData) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📂 Loaded from IndexedDB: ${documentId}`, {
            lastSaved: new Date(documentData.lastSaved).toISOString(),
            age: Math.round((Date.now() - documentData.lastSaved) / 1000) + 's'
          });
        }

        return {
          tiptapContent: documentData.tiptapContent,
          lastSaved: documentData.lastSaved,
          metadata: documentData.metadata
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Failed to load from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Clear document from IndexedDB
   * Called after successful Supabase save to prevent stale data
   *
   * @param {string} documentId - Document ID to clear
   */
  async clearFromIndexedDB(documentId) {
    if (!this.isSupported) {
      return { success: false };
    }

    try {
      await this.init();

      if (!this.db) {
        return { success: false };
      }

      await this.db.delete(STORE_NAME, `doc-${documentId}`);

      if (process.env.NODE_ENV === 'development') {
        console.log(`🗑️ Cleared from IndexedDB: ${documentId}`);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to clear from IndexedDB:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if document exists in IndexedDB
   *
   * @param {string} documentId - Document ID to check
   * @returns {boolean} True if document exists
   */
  async hasLocalDraft(documentId) {
    if (!this.isSupported) {
      return false;
    }

    try {
      await this.init();

      if (!this.db) {
        return false;
      }

      const data = await this.db.get(STORE_NAME, `doc-${documentId}`);
      return !!data;

    } catch (error) {
      console.error('❌ Failed to check IndexedDB:', error);
      return false;
    }
  }

  /**
   * Get all stored documents (for debugging/cleanup)
   */
  async getAllDocuments() {
    if (!this.isSupported) {
      return [];
    }

    try {
      await this.init();

      if (!this.db) {
        return [];
      }

      return await this.db.getAll(STORE_NAME);

    } catch (error) {
      console.error('❌ Failed to get all documents:', error);
      return [];
    }
  }

  /**
   * Clear old drafts (older than specified days)
   * Helps prevent quota issues
   *
   * @param {number} daysOld - Delete drafts older than this many days
   */
  async clearOldDrafts(daysOld = 7) {
    if (!this.isSupported) {
      return { success: false, cleared: 0 };
    }

    try {
      await this.init();

      if (!this.db) {
        return { success: false, cleared: 0 };
      }

      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const allDocs = await this.db.getAll(STORE_NAME);

      let clearedCount = 0;

      for (const doc of allDocs) {
        if (doc.lastSaved < cutoffTime) {
          await this.db.delete(STORE_NAME, doc.id);
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        console.log(`🗑️ Cleared ${clearedCount} old draft(s) from IndexedDB`);
      }

      return { success: true, cleared: clearedCount };

    } catch (error) {
      console.error('❌ Failed to clear old drafts:', error);
      return { success: false, cleared: 0, error: error.message };
    }
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate() {
    if (!this.isSupported || !navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();

      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: estimate.quota > 0 ? (estimate.usage / estimate.quota * 100).toFixed(2) : 0,
        usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
        quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2)
      };

    } catch (error) {
      console.error('❌ Failed to get storage estimate:', error);
      return null;
    }
  }

  /**
   * Check if storage is approaching quota
   * Returns true if usage > 80%
   */
  async isStorageNearQuota() {
    const estimate = await this.getStorageEstimate();

    if (!estimate) {
      return false;
    }

    return parseFloat(estimate.usagePercent) > 80;
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Export class for testing
export { IndexedDBManager };
