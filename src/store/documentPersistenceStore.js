'use client';

import { create } from 'zustand';
import { saveDocument, updateDocument, getDocument } from '../../lib/supabase';

export const useDocumentPersistenceStore = create((set, get) => ({
  // State for document saving/loading
  savedDocuments: [],
  currentDocumentId: null,
  isSaving: false,
  isLoading: false,
  saveError: null,
  loadError: null,

  // Save document to Supabase
  saveDocumentToDatabase: async (documentData, userId) => {
    set({ isSaving: true, saveError: null });

    try {
      const documentToSave = {
        user_id: userId,
        name: documentData.name || 'Untitled Document',
        original_filename: documentData.originalFilename || 'document.docx',
        content: documentData.text || '',
        html_content: documentData.html || '',
        document_buffer: documentData.documentBuffer || null, // Base64 encoded buffer
        formatting_data: documentData.formatting || null,
        analysis_results: documentData.issues || [],
        metadata: {
          fileSize: documentData.fileSize || 0,
          wordCount: documentData.text?.split(/\s+/).length || 0,
          issueCount: Array.isArray(documentData.issues) ? documentData.issues.length : 0
        },
        processing_info: documentData.processingInfo || {},
        status: 'processed'
      };

      const savedDoc = await saveDocument(documentToSave);

      set(state => ({
        isSaving: false,
        currentDocumentId: savedDoc.id,
        savedDocuments: [...state.savedDocuments, savedDoc]
      }));

      return savedDoc;
    } catch (error) {
      console.error('Error saving document:', error);
      set({
        isSaving: false,
        saveError: error.message || 'Failed to save document'
      });
      throw error;
    }
  },

  // Update existing document in Supabase
  updateDocumentInDatabase: async (documentId, documentData, userId) => {
    set({ isSaving: true, saveError: null });

    try {
      const updates = {
        name: documentData.name,
        content: documentData.text || '',
        html_content: documentData.html || '',
        document_buffer: documentData.documentBuffer || null,
        formatting_data: documentData.formatting || null,
        analysis_results: documentData.issues || [],
        metadata: {
          fileSize: documentData.fileSize || 0,
          wordCount: documentData.text?.split(/\s+/).length || 0,
          issueCount: Array.isArray(documentData.issues) ? documentData.issues.length : 0
        },
        processing_info: documentData.processingInfo || {},
        status: 'processed',
        updated_at: new Date().toISOString()
      };

      const updatedDoc = await updateDocument(documentId, updates);

      set(state => ({
        isSaving: false,
        savedDocuments: state.savedDocuments.map(doc =>
          doc.id === documentId ? updatedDoc : doc
        )
      }));

      return updatedDoc;
    } catch (error) {
      console.error('Error updating document:', error);
      set({
        isSaving: false,
        saveError: error.message || 'Failed to update document'
      });
      throw error;
    }
  },

  // Load document from Supabase
  loadDocumentFromDatabase: async (documentId, userId) => {
    set({ isLoading: true, loadError: null });

    try {
      const document = await getDocument(documentId, userId);

      set({
        isLoading: false,
        currentDocumentId: documentId
      });

      return {
        id: document.id,
        name: document.name,
        originalFilename: document.original_filename,
        text: document.content,
        html: document.html_content,
        documentBuffer: document.document_buffer,
        formatting: document.formatting_data,
        issues: document.analysis_results || [],
        processingInfo: document.processing_info || {},
        metadata: document.metadata || {},
        createdAt: document.created_at,
        updatedAt: document.updated_at
      };
    } catch (error) {
      console.error('Error loading document:', error);
      set({
        isLoading: false,
        loadError: error.message || 'Failed to load document'
      });
      throw error;
    }
  },

  // Save document automatically when changes occur
  autoSaveDocument: async (documentData, userId, documentId = null) => {
    try {
      if (documentId) {
        // Update existing document
        return await get().updateDocumentInDatabase(documentId, documentData, userId);
      } else {
        // Save new document
        return await get().saveDocumentToDatabase(documentData, userId);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't throw error for auto-save to prevent disrupting user experience
      return null;
    }
  },

  // Reset state
  resetDocumentPersistence: () => {
    set({
      savedDocuments: [],
      currentDocumentId: null,
      isSaving: false,
      isLoading: false,
      saveError: null,
      loadError: null
    });
  },

  // Clear errors
  clearErrors: () => {
    set({
      saveError: null,
      loadError: null
    });
  }
}));