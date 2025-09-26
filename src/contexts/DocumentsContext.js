'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { supabase, TABLES, DOCUMENT_STATUS } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const DocumentsContext = createContext({});

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
};

export const DocumentsProvider = ({ children }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's documents
  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from(TABLES.DOCUMENTS)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create a new document record
  const createDocument = async (documentData) => {
    if (!user) throw new Error('User not authenticated');

    console.log('createDocument received data:', {
      name: documentData.name,
      hasOriginalContent: !!(documentData.original_content || documentData.originalContent),
      hasProcessedContent: !!(documentData.processed_content || documentData.processedContent),
      originalContentLength: (documentData.original_content || documentData.originalContent || '').length,
      processedContentLength: (documentData.processed_content || documentData.processedContent || '').length,
      keys: Object.keys(documentData)
    });

    try {
      const { data, error } = await supabase
        .from(TABLES.DOCUMENTS)
        .insert({
          user_id: user.id,
          name: documentData.name,
          original_content: documentData.original_content || documentData.originalContent || '',
          processed_content: documentData.processed_content || documentData.processedContent || '',
          formatting_data: documentData.formatting_data || documentData.formattingData || {},
          issues: documentData.issues || [],
          status: documentData.status || DOCUMENT_STATUS.PROCESSING,
          file_size: documentData.file_size || documentData.fileSize || 0,
          content_preview: documentData.content_preview || documentData.contentPreview || '',
          analysis_data: documentData.analysis_data || documentData.analysisData || {},
          error_message: documentData.error_message || documentData.errorMessage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setDocuments(prev => [data, ...prev]);

      return { data, error: null };
    } catch (err) {
      console.error('Error creating document:', err);
      return { data: null, error: err };
    }
  };

  // Update document
  const updateDocument = async (documentId, updates) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from(TABLES.DOCUMENTS)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('user_id', user.id) // Ensure user owns the document
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setDocuments(prev =>
        prev.map(doc => doc.id === documentId ? data : doc)
      );

      return { data, error: null };
    } catch (err) {
      console.error('Error updating document:', err);
      return { data: null, error: err };
    }
  };

  // Delete document
  const deleteDocument = async (documentId) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from(TABLES.DOCUMENTS)
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id); // Ensure user owns the document

      if (error) throw error;

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));

      return { error: null };
    } catch (err) {
      console.error('Error deleting document:', err);
      return { error: err };
    }
  };

  // Get document by ID
  const getDocument = useCallback(async (documentId) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from(TABLES.DOCUMENTS)
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id) // Ensure user owns the document
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      console.error('Error fetching document:', err);
      return { data: null, error: err };
    }
  }, [user?.id]); // Only depend on user.id, not the whole user object

  // Update document issues after analysis
  const updateDocumentIssues = async (documentId, issues, analysisData = {}) => {
    return updateDocument(documentId, {
      issues: issues || [],
      status: DOCUMENT_STATUS.ANALYZED,
      analysis_data: analysisData
    });
  };

  // Mark document as processing
  const markDocumentAsProcessing = async (documentId) => {
    return updateDocument(documentId, {
      status: DOCUMENT_STATUS.PROCESSING
    });
  };

  // Mark document as error
  const markDocumentAsError = async (documentId, errorMessage) => {
    return updateDocument(documentId, {
      status: DOCUMENT_STATUS.ERROR,
      error_message: errorMessage
    });
  };

  const value = {
    documents,
    loading,
    error,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    updateDocumentIssues,
    markDocumentAsProcessing,
    markDocumentAsError
  };

  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  );
};