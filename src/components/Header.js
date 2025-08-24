'use client';

import { useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { BookOpen, Upload, Download, File, AlertTriangle } from 'lucide-react';

export default function Header() {
  const { uploadDocument, documentName, analyzeDocument, analysisScore, exportDocument, processingState } = useDocumentStore();
  
  // Local state for UI-only errors (now using store for processing state)
  const [uploadError, setUploadError] = useState(null);
  
  const handleFileUpload = async (e) => {
    // Reset error state
    setUploadError(null);
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.docx')) {
      setUploadError('Please upload a .docx file only');
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setUploadError(`File size exceeds limit (max ${maxSize / (1024 * 1024)}MB)`);
      return;
    }
    
    try {
      // Upload document (processing state is managed inside the store now)
      const success = await uploadDocument(file);
      
      if (success) {
        // Only analyze if upload was successful
        const analysisResult = await analyzeDocument();
        
        // If analysis failed, display error
        if (!analysisResult?.success && analysisResult?.error) {
          setUploadError(`Analysis error: ${analysisResult.error}`);
        }
      } else {
        // If upload failed and store didn't set an error, set a generic one
        if (!processingState.lastError) {
          setUploadError('Failed to process document. Please try a different file.');
        }
      }
    } catch (error) {
      console.error('Error in file upload handler:', error);
      setUploadError(`Error: ${error.message || 'Failed to upload document'}`);
    } finally {
      // Reset file input to allow re-uploading the same file
      e.target.value = '';
    }
  };
  
  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white mr-8 flex items-center">
              <div className="bg-white/10 p-2 rounded-lg mr-3">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              APA 7 Checker
            </h1>
            <div className="flex space-x-4">
              <div className="flex flex-col">
                <label className={`${processingState.isUploading ? 'opacity-75 cursor-wait' : 'hover:bg-gray-50'} bg-white text-blue-700 border border-transparent hover:border-blue-100 px-4 py-2 rounded-md cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center group`}>
                  <Upload className={`h-5 w-5 mr-2 ${processingState.isUploading ? 'animate-pulse' : ''} text-blue-500 group-hover:text-blue-600`} />
                  {processingState.isUploading ? 'Uploading...' : processingState.isAnalyzing ? 'Analyzing...' : 'Upload Document'}
                  <input
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={processingState.isUploading || processingState.isAnalyzing}
                  />
                </label>
                
                {uploadError && (
                  <div className="mt-1 text-xs text-red-600 flex items-center bg-red-50 px-2 py-1 rounded border border-red-100">
                    <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
              
              {documentName && (
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors shadow-md hover:shadow-lg flex items-center"
                  onClick={exportDocument}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Fixed Document
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {analysisScore !== null && (
              <div className="flex flex-col items-end bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 shadow-inner border border-white/30">
                <div className="flex items-center mb-1">
                  <span className="text-white mr-2 text-sm">APA Compliance:</span>
                  <span className="text-white font-bold">{analysisScore}%</span>
                </div>
                <div className="bg-gray-200/30 rounded-full h-3 w-40 shadow-inner">
                  <div 
                    className={`h-3 rounded-full shadow-sm ${
                      analysisScore > 80 ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                      analysisScore > 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                      'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${analysisScore}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {documentName && (
              <div className="text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center shadow-inner border border-white/30">
                <File className="h-5 w-5 mr-2 text-white/80" />
                <span className="font-medium truncate max-w-[200px]">{documentName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
