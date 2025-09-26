'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDocuments } from '@/contexts/DocumentsContext';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import {
  FileText,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle,
  Plus
} from 'lucide-react';

export default function DocumentUpload({ onUploadSuccess, className = '' }) {
  const { user } = useAuth();
  const { createDocument } = useDocuments();
  const { uploadDocument, analyzeDocumentDebounced } = useDocumentStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEvents = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e) => {
    handleDragEvents(e);
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    handleDragEvents(e);
    setDragActive(false);
  };

  const handleDrop = (e) => {
    handleDragEvents(e);
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const docxFile = files.find(file => file.name.endsWith('.docx'));

    if (docxFile) {
      handleFileUpload(docxFile);
    } else {
      setUploadError('Please upload a .docx file only');
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (!user) {
      setUploadError('You must be logged in to upload documents');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      // Validate file
      if (!file.name.endsWith('.docx')) {
        throw new Error('Please upload a .docx file only');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File size exceeds limit (max ${maxSize / (1024 * 1024)}MB)`);
      }

      // Process the document using existing logic first
      console.log('Starting document upload...');
      const success = await uploadDocument(file);
      console.log('Upload success:', success);

      if (success) {
        // Check what's in the store after upload
        const storeState = useDocumentStore.getState();
        console.log('Store state after upload:', {
          hasDocumentText: !!storeState.documentText,
          documentTextLength: storeState.documentText?.length || 0,
          documentName: storeState.documentName
        });

        // Run analysis
        console.log('Starting analysis...');
        const analysisResult = await analyzeDocumentDebounced();
        console.log('Analysis result:', analysisResult);

        if (analysisResult?.success) {
          // Get the document store state to access documentText and formatting
          const { documentText, documentFormatting, documentHtml } = useDocumentStore.getState();

          console.log('Document content before saving to DB:', {
            hasDocumentText: !!documentText,
            documentTextLength: documentText?.length || 0,
            hasDocumentHtml: !!documentHtml,
            documentHtmlLength: documentHtml?.length || 0,
            firstChars: documentText?.substring(0, 100) || 'No content'
          });

          if (!documentText || documentText.trim().length === 0) {
            throw new Error('Document was processed but no content was extracted. Please try a different file.');
          }

          try {
            // Try to create document record in database
            const documentRecord = await createDocument({
              name: file.name,
              fileSize: file.size,
              status: 'analyzed',
              contentPreview: documentText.substring(0, 200) + (documentText.length > 200 ? '...' : ''),
              processed_content: documentText,
              original_content: documentText, // Store same content for now
              formatting_data: documentFormatting || {},
              issues: analysisResult.issues || [],
              analysis_data: analysisResult
            });

            if (documentRecord.error) {
              console.warn('Database error, continuing without saving:', documentRecord.error.message);

              // Still call success callback with temp ID
              if (onUploadSuccess) {
                onUploadSuccess({
                  id: 'temp-' + Date.now(),
                  name: file.name,
                  status: 'analyzed'
                });
              }
            } else {
              // Successfully saved to database
              console.log('Document saved to database:', documentRecord.data.id);

              // Call success callback with real database record
              if (onUploadSuccess) {
                onUploadSuccess(documentRecord.data);
              }
            }
          } catch (dbError) {
            console.warn('Database not ready, continuing without saving:', dbError);

            // Still call success callback even if database isn't ready
            if (onUploadSuccess) {
              onUploadSuccess({
                id: 'temp-' + Date.now(),
                name: file.name,
                status: 'analyzed'
              });
            }
          }
        } else {
          throw new Error(`Analysis error: ${analysisResult?.error || 'Analysis failed'}`);
        }
      } else {
        throw new Error('Failed to process document. Please try a different file.');
      }

    } catch (error) {
      console.error('Error in file upload:', error);
      setUploadError(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
          ${dragActive
            ? 'border-emerald-400 bg-emerald-50/50'
            : 'border-slate-300 hover:border-emerald-300 hover:bg-emerald-50/30'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
      >
        {/* Upload Icon and Status */}
        <div className="flex flex-col items-center">
          {isUploading ? (
            <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg border-2 border-slate-200 group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-8 w-8 text-emerald-500" />
            </div>
          )}

          {/* Upload Text */}
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {isUploading ? 'Processing Document...' : 'Drop your DOCX file here'}
          </h3>

          <p className="text-slate-600 mb-4">
            {isUploading
              ? 'Please wait while we analyze your document'
              : 'Or click to browse and select your document'
            }
          </p>

          {!isUploading && (
            <button
              type="button"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <Plus className="h-5 w-5" />
              <span>Choose File</span>
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload Failed</p>
            <p className="text-sm text-red-600 mt-1">{uploadError}</p>
          </div>
        </div>
      )}

      {/* File Requirements */}
      <div className="mt-4 text-xs text-slate-500 text-center">
        <p>Supported format: DOCX • Maximum size: 10MB</p>
      </div>
    </div>
  );
}