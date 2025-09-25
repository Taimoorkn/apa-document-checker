'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export const useDocumentPersistenceStore = create((set, get) => ({
  // State
  savedDocuments: [],
  isLoadingDocuments: false,
  isSavingDocument: false,
  isDeletingDocument: false,
  persistenceError: null,

  // Load user's saved documents
  loadUserDocuments: async (userId) => {
    if (!userId) return;

    set({ isLoadingDocuments: true, persistenceError: null });

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          original_filename,
          file_size,
          upload_date,
          last_modified,
          analysis_score,
          total_issues,
          critical_issues,
          major_issues,
          minor_issues,
          word_count,
          char_count,
          paragraph_count
        `)
        .eq('user_id', userId)
        .order('last_modified', { ascending: false });

      if (error) throw error;

      set({ savedDocuments: data || [], isLoadingDocuments: false });
      return { success: true, documents: data || [] };

    } catch (error) {
      console.error('Error loading user documents:', error);
      set({
        persistenceError: error.message,
        isLoadingDocuments: false,
        savedDocuments: []
      });
      return { success: false, error: error.message };
    }
  },

  // Save document with analysis results
  saveDocument: async (userId, documentData, analysisResults = null) => {
    if (!userId || !documentData) return { success: false, error: 'Missing required data' };

    set({ isSavingDocument: true, persistenceError: null });

    try {
      // Prepare document record
      const documentRecord = {
        user_id: userId,
        title: documentData.title || documentData.documentName || 'Untitled Document',
        original_filename: documentData.documentName || 'document.docx',
        file_size: documentData.fileSize || 0,
        upload_date: new Date().toISOString(),
        last_modified: new Date().toISOString(),

        // Analysis results
        analysis_score: analysisResults?.analysisScore || null,
        total_issues: analysisResults?.issues?.length || 0,
        critical_issues: analysisResults?.issues?.filter(i => i.severity === 'Critical').length || 0,
        major_issues: analysisResults?.issues?.filter(i => i.severity === 'Major').length || 0,
        minor_issues: analysisResults?.issues?.filter(i => i.severity === 'Minor').length || 0,

        // Document stats
        word_count: documentData.documentStats?.wordCount || 0,
        char_count: documentData.documentStats?.charCount || 0,
        paragraph_count: documentData.documentStats?.paragraphCount || 0,

        // Store document data and issues as JSONB
        document_data: {
          text: documentData.documentText,
          html: documentData.documentHtml,
          formatting: documentData.documentFormatting,
          structure: documentData.documentStructure,
          styles: documentData.documentStyles,
          editorContent: documentData.editorContent
        },
        issues_data: analysisResults?.issues || []
      };

      // Insert document record
      const { data, error } = await supabase
        .from('documents')
        .insert(documentRecord)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set(state => ({
        savedDocuments: [data, ...state.savedDocuments],
        isSavingDocument: false
      }));

      // Log the action
      await get().logDocumentAction(data.id, userId, 'save', {
        title: data.title,
        analysis_score: data.analysis_score,
        total_issues: data.total_issues
      });

      return { success: true, document: data };

    } catch (error) {
      console.error('Error saving document:', error);
      set({
        persistenceError: error.message,
        isSavingDocument: false
      });
      return { success: false, error: error.message };
    }
  },

  // Update existing document
  updateDocument: async (documentId, userId, updates) => {
    if (!documentId || !userId) return { success: false, error: 'Missing required parameters' };

    set({ isSavingDocument: true, persistenceError: null });

    try {
      const updateData = {
        ...updates,
        last_modified: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        savedDocuments: state.savedDocuments.map(doc =>
          doc.id === documentId ? { ...doc, ...data } : doc
        ),
        isSavingDocument: false
      }));

      // Log the action
      await get().logDocumentAction(documentId, userId, 'update', updates);

      return { success: true, document: data };

    } catch (error) {
      console.error('Error updating document:', error);
      set({
        persistenceError: error.message,
        isSavingDocument: false
      });
      return { success: false, error: error.message };
    }
  },

  // Load specific document with full data
  loadDocument: async (documentId, userId) => {
    if (!documentId || !userId) return { success: false, error: 'Missing required parameters' };

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return { success: true, document: data };

    } catch (error) {
      console.error('Error loading document:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete document
  deleteDocument: async (documentId, userId) => {
    if (!documentId || !userId) return { success: false, error: 'Missing required parameters' };

    set({ isDeletingDocument: true, persistenceError: null });

    try {
      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (error) throw error;

      // Remove from local state
      set(state => ({
        savedDocuments: state.savedDocuments.filter(doc => doc.id !== documentId),
        isDeletingDocument: false
      }));

      return { success: true };

    } catch (error) {
      console.error('Error deleting document:', error);
      set({
        persistenceError: error.message,
        isDeletingDocument: false
      });
      return { success: false, error: error.message };
    }
  },

  // Log document actions for history
  logDocumentAction: async (documentId, userId, action, details = {}) => {
    try {
      const { error } = await supabase
        .from('document_history')
        .insert({
          document_id: documentId,
          user_id: userId,
          action,
          details,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging document action:', error);
      }

    } catch (error) {
      console.error('Error logging document action:', error);
    }
  },

  // Get document history
  getDocumentHistory: async (documentId, userId) => {
    try {
      const { data, error } = await supabase
        .from('document_history')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, history: data || [] };

    } catch (error) {
      console.error('Error loading document history:', error);
      return { success: false, error: error.message };
    }
  },

  // Clear persistence error
  clearPersistenceError: () => {
    set({ persistenceError: null });
  },

  // Get document count for user
  getDocumentCount: async (userId) => {
    if (!userId) return 0;

    try {
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;

    } catch (error) {
      console.error('Error getting document count:', error);
      return 0;
    }
  },

  // Search documents
  searchDocuments: async (userId, query) => {
    if (!userId || !query) return { success: true, documents: [] };

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          original_filename,
          file_size,
          upload_date,
          last_modified,
          analysis_score,
          total_issues,
          word_count,
          char_count
        `)
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,original_filename.ilike.%${query}%`)
        .order('last_modified', { ascending: false });

      if (error) throw error;

      return { success: true, documents: data || [] };

    } catch (error) {
      console.error('Error searching documents:', error);
      return { success: false, error: error.message, documents: [] };
    }
  },

  // Get recent documents
  getRecentDocuments: async (userId, limit = 5) => {
    if (!userId) return { success: true, documents: [] };

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          original_filename,
          upload_date,
          analysis_score,
          total_issues
        `)
        .eq('user_id', userId)
        .order('upload_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, documents: data || [] };

    } catch (error) {
      console.error('Error loading recent documents:', error);
      return { success: false, error: error.message, documents: [] };
    }
  }
}));