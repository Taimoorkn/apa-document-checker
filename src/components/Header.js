'use client';

import { useState, useEffect, useRef } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { BookOpen, Upload, Download, File, AlertTriangle, ChevronDown, FileCheck, Sparkles } from 'lucide-react';

export default function Header() {
  const { 
    uploadDocument, 
    documentName, 
    analyzeDocument, 
    analyzeDocumentDebounced, 
    analysisScore, 
    exportDocument, 
    processingState
  } = useDocumentStore();
  
  // Local state for UI-only errors (now using store for processing state)
  const [uploadError, setUploadError] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
        // Automatically analyze after upload with the new data
        setTimeout(async () => {
          const analysisResult = await analyzeDocument();
          
          // If analysis failed, display error
          if (!analysisResult?.success && analysisResult?.error) {
            setUploadError(`Analysis error: ${analysisResult.error}`);
          }
        }, 500); // Small delay to let UI update
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

  const handleExport = async (format) => {
    setIsExporting(true);
    setShowExportDropdown(false);
    
    try {
      await exportDocument(format);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export ${format.toUpperCase()} document. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex justify-between items-center">
          {/* Brand Section */}
          <div className="flex items-center">
            <div className="flex items-center mr-8">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl mr-3 shadow-md">
                <FileCheck className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-none">APA Checker</h1>
                <p className="text-sm text-gray-500 font-medium">7th Edition</p>
              </div>
            </div>
            
            {/* Upload Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <label className={`
                  flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer
                  ${processingState.isUploading || processingState.isAnalyzing || processingState.isSchedulingAnalysis
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }
                `}>
                  <Upload className={`h-5 w-5 mr-2.5 ${processingState.isUploading ? 'animate-pulse' : ''}`} />
                  {
                    processingState.isUploading ? 'Uploading...' : 
                    processingState.isSchedulingAnalysis ? 'Processing...' :
                    processingState.isAnalyzing ? 'Analyzing...' : 
                    'Upload Document'
                  }
                  <input
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={processingState.isUploading || processingState.isAnalyzing || processingState.isSchedulingAnalysis}
                  />
                </label>
                
                {uploadError && (
                  <div className="absolute top-full left-0 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center text-sm text-red-700 shadow-sm min-w-max z-10">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
              
              {documentName && (
                <div className="relative" ref={exportDropdownRef}>
                  <button 
                    className="flex items-center px-5 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>

                  {showExportDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="py-2">
                        <button
                          onClick={() => handleExport('html')}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          disabled={isExporting}
                        >
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                            <File className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">Export as HTML</p>
                            <p className="text-xs text-gray-500">Viewable in browser</p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExport('docx')}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          disabled={isExporting}
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <File className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">Export as DOCX</p>
                            <p className="text-xs text-gray-500">Editable in Word</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Status Section */}
          <div className="flex items-center space-x-4">
            {analysisScore !== null && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                <div className="flex items-center mb-2">
                  <Sparkles className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Compliance Score</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-2xl font-bold mr-3 ${
                    analysisScore > 80 ? 'text-green-600' : 
                    analysisScore > 60 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {analysisScore}%
                  </span>
                  <div className="bg-gray-200 rounded-full h-2 w-24">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        analysisScore > 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                        analysisScore > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${analysisScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {documentName && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <File className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                    {documentName.replace('.docx', '')}
                  </p>
                  <p className="text-xs text-gray-500">DOCX Document</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
