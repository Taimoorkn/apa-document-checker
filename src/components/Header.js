'use client';

import { useState, useEffect, useRef } from 'react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import {
  Download, 
  FileText, 
  ChevronDown, 
  CheckCircle,
  FileCheck,
  X,
  AlertCircle,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  CreditCard,
  Plus,
  History,
  Share2
} from 'lucide-react';

export default function Header() {
  const {
    uploadDocument,
    documentName,
    analyzeDocumentDebounced,
    exportDocument,
    processingState,
  } = useDocumentStore();

  const [uploadError, setUploadError] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const exportDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // User configuration - should be replaced with proper authentication system
  // TODO: Replace with authentication provider (e.g., NextAuth.js, Auth0, Firebase Auth)
  const userConfig = {
    isAuthenticated: false, // TODO: Implement actual authentication
    name: 'Guest User',
    email: 'guest@example.com',
    initials: 'GU',
    plan: 'Free',
    avatar: null
  };

  // Authentication handlers - placeholders for future implementation
  const handleLogin = () => {
    // TODO: Implement login functionality
    console.log('Login functionality not yet implemented');
  };

  const handleLogout = () => {
    // TODO: Implement logout functionality
    console.log('Logout functionality not yet implemented');
  };

  const handleProfile = () => {
    // TODO: Implement profile functionality
    console.log('Profile functionality not yet implemented');
  };

  const handleSettings = () => {
    // TODO: Implement settings functionality
    console.log('Settings functionality not yet implemented');
  };

  const handleBilling = () => {
    // TODO: Implement billing functionality
    console.log('Billing functionality not yet implemented');
  };
  const fileInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
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
  
  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left Section - Logo and Primary Actions */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">APA Checker</span>
                <div className="text-xs text-slate-500 font-medium">7th Edition Validator</div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-300"></div>

            {/* Primary Actions */}
            <div className="flex items-center space-x-2">
              {/* New Document */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processingState.isUploading || processingState.isAnalyzing}
                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-emerald-700 rounded-xl transition-all duration-200 border border-slate-200 hover:border-emerald-300 shadow-sm"
                title="Upload new document"
              >
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                className="hidden"
                onChange={handleFileUpload}
                disabled={processingState.isUploading || processingState.isAnalyzing}
              />

              {/* Recent Documents */}
              <button
                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
                title="Recent documents"
              >
                <History className="h-4 w-4" />
                <span>Recent</span>
              </button>

              {/* Share */}
              {documentName && (
                <button
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
                  title="Share document"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              )}

              {/* Export */}
              {documentName && (
                <div className="relative" ref={exportDropdownRef}>
                  <button
                    className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all duration-200"
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showExportDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden backdrop-blur-sm">
                      <button
                        onClick={() => handleExport('html')}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-all duration-200"
                        disabled={isExporting}
                      >
                        <FileText className="h-4 w-4 mr-3 text-amber-500" />
                        <span>Export as HTML</span>
                      </button>
                      <button
                        onClick={() => handleExport('docx')}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-all duration-200"
                        disabled={isExporting}
                      >
                        <FileText className="h-4 w-4 mr-3 text-emerald-500" />
                        <span>Export as DOCX</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Secondary Actions and User Menu */}
          <div className="flex items-center space-x-3">
            {/* Help */}
            <button
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
              title="Help & Support"
            >
              <HelpCircle className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <button
              className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-300"></div>

            {/* User Menu */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-3 px-3 py-2 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <span className="text-sm font-semibold text-white">{userConfig.initials}</span>
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-slate-900">{userConfig.name}</p>
                  <p className="text-xs text-slate-500 font-medium">{userConfig.plan} Plan</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userConfig.name}</p>
                    <p className="text-xs text-gray-500">{userConfig.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={handleProfile}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={handleSettings}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-400" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleBilling}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 mr-3 text-gray-400" />
                      <span>Billing & Plans</span>
                      <span className="ml-auto px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">{userConfig.plan}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100"></div>

                  {/* Logout */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-gray-400" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {uploadError && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="bg-white rounded-lg shadow-lg border border-rose-100 p-4 flex items-start space-x-3 max-w-md">
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
          <div className="bg-white rounded-lg shadow-lg border border-emerald-100 p-4 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-medium text-gray-900">Document uploaded successfully!</p>
          </div>
        </div>
      )}
    </>
  );
}