'use client';

import { useState, useEffect, useRef } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertTriangle, 
  ChevronDown, 
  CheckCircle, 
  Sparkles,
  FileCheck,
  X,
  TrendingUp,
  AlertCircle,
  User,
  Mail
} from 'lucide-react';

export default function Header() {
  const { 
    uploadDocument, 
    documentName, 
    analyzeDocument, 
    analyzeDocumentDebounced, 
    analysisScore, 
    exportDocument, 
    processingState,
    issues
  } = useDocumentStore();
  
  const [uploadError, setUploadError] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const exportDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show success toast when document is uploaded
  useEffect(() => {
    if (documentName && !processingState.isUploading) {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  }, [documentName, processingState.isUploading]);
  
  const handleFileUpload = async (e) => {
    setUploadError(null);
    
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx')) {
      setUploadError('Please upload a .docx file only');
      return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File size exceeds limit (max ${maxSize / (1024 * 1024)}MB)`);
      return;
    }
    
    try {
      const success = await uploadDocument(file);
      
      if (success) {
        const analysisResult = await analyzeDocumentDebounced();
        
        if (!analysisResult?.success && analysisResult?.error) {
          setUploadError(`Analysis error: ${analysisResult.error}`);
        }
      } else {
        if (!processingState.lastError) {
          setUploadError('Failed to process document. Please try a different file.');
        }
      }
    } catch (error) {
      console.error('Error in file upload handler:', error);
      setUploadError(`Error: ${error.message || 'Failed to upload document'}`);
    } finally {
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

  // Calculate issue counts
  const criticalCount = issues?.filter(i => i.severity === 'Critical').length || 0;
  const majorCount = issues?.filter(i => i.severity === 'Major').length || 0;
  const minorCount = issues?.filter(i => i.severity === 'Minor').length || 0;
  
  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left Section - Brand & Upload */}
            <div className="flex items-center space-x-6">
              {/* Brand */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    APA Checker
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">7th Edition Compliance</p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={processingState.isUploading || processingState.isAnalyzing}
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingState.isUploading || processingState.isAnalyzing}
                  className={`
                    flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm
                    transition-all duration-200 transform
                    ${processingState.isUploading || processingState.isAnalyzing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                    }
                  `}
                >
                  {processingState.isUploading ? (
                    <>
                      <div className="loading-spinner w-4 h-4"></div>
                      <span>Uploading...</span>
                    </>
                  ) : processingState.isAnalyzing ? (
                    <>
                      <div className="loading-spinner w-4 h-4"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>

                {documentName && (
                  <div className="relative" ref={exportDropdownRef}>
                    <button 
                      className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4" />
                      <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showExportDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                        <div className="py-2">
                          <button
                            onClick={() => handleExport('html')}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 transition-colors"
                            disabled={isExporting}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium">Export as HTML</p>
                              <p className="text-xs text-gray-500">Web-ready format</p>
                            </div>
                          </button>
                          <button
                            onClick={() => handleExport('docx')}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-colors"
                            disabled={isExporting}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium">Export as DOCX</p>
                              <p className="text-xs text-gray-500">Microsoft Word format</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section - Document Info & User Account */}
            <div className="flex items-center space-x-4">
              {/* Document Name */}
              {documentName && (
                <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                      {documentName.replace('.docx', '')}
                    </p>
                    <p className="text-xs text-gray-500">DOCX Document</p>
                  </div>
                </div>
              )}

              {/* Issue Count Badges */}
              {analysisScore !== null && (
                <div className="flex items-center space-x-2">
                  {criticalCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
                      {criticalCount} Critical
                    </span>
                  )}
                  {majorCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      {majorCount} Major
                    </span>
                  )}
                  {minorCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      {minorCount} Minor
                    </span>
                  )}
                </div>
              )}

              {/* User Account Section */}
              <div className="flex items-center space-x-3 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500 flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    john.doe@example.com
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {uploadError && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="bg-white rounded-xl shadow-lg border border-rose-100 p-4 flex items-start space-x-3 max-w-md">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Upload Error</p>
              <p className="text-sm text-gray-600 mt-1">{uploadError}</p>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="bg-white rounded-xl shadow-lg border border-emerald-100 p-4 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-medium text-gray-900">Document uploaded successfully!</p>
          </div>
        </div>
      )}
    </>
  );
}