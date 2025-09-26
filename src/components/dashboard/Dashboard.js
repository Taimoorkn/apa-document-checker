'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDocuments } from '@/contexts/DocumentsContext';
import DocumentUpload from './DocumentUpload';
import DocumentList from './DocumentList';
import {
  FileText,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  Search,
  Filter,
  Plus,
  ChevronDown
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { documents, loading, fetchDocuments } = useDocuments();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);

  // Fetch documents on component mount - only once when user becomes available
  useEffect(() => {
    if (user && documents.length === 0) {
      fetchDocuments();
    }
  }, [user]); // Remove fetchDocuments from dependencies to prevent re-fetching

  // Filter documents based on search and status
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleUploadSuccess = (document) => {
    setShowUploadArea(false);

    // Only navigate to document view if we have a real database ID (not a temp ID)
    if (document.id && !document.id.startsWith('temp-')) {
      router.push(`/document/${document.id}`);
    } else {
      // If database isn't ready, navigate to the editor interface
      router.push('/editor');
    }
  };

  const handleDocumentOpen = (documentId) => {
    router.push(`/document/${documentId}`);
  };

  if (!user) {
    return null; // This will be handled by the protected route wrapper
  }

  const hasDocuments = documents.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Left: Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">APA Checker</h1>
                  <p className="text-xs text-slate-500 font-medium">Document Dashboard</p>
                </div>
              </div>
            </div>

            {/* Right: Actions and User Menu */}
            <div className="flex items-center space-x-4">
              {/* Help */}
              <button
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Help & Support"
              >
                <HelpCircle className="h-5 w-5" />
              </button>

              {/* Notifications */}
              <button
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-3 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                    <p className="text-xs text-slate-500">Free Plan</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">
                        {user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>

                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </button>

                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasDocuments && !showUploadArea ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-xl">
              <FileText className="h-12 w-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Welcome to APA Checker
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Upload your first DOCX document to get started with comprehensive APA 7th edition validation
            </p>

            <button
              onClick={() => setShowUploadArea(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
            >
              <Plus className="h-5 w-5" />
              <span>Upload Your First Document</span>
            </button>

            {/* Features Preview */}
            <div className="mt-16 grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Real-time Analysis</h3>
                <p className="text-sm text-slate-600">Instant feedback on APA compliance as you edit</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Comprehensive Checking</h3>
                <p className="text-sm text-slate-600">Citations, references, formatting and more</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Smart Corrections</h3>
                <p className="text-sm text-slate-600">One-click fixes for common issues</p>
              </div>
            </div>
          </div>
        ) : (
          /* Documents Dashboard */
          <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
                <p className="text-slate-600 mt-1">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} total
                </p>
              </div>

              <button
                onClick={() => setShowUploadArea(!showUploadArea)}
                className="mt-4 sm:mt-0 inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/25"
              >
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </button>
            </div>

            {/* Upload Area */}
            {showUploadArea && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Upload New Document</h3>
                  <button
                    onClick={() => setShowUploadArea(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
                <DocumentUpload onUploadSuccess={handleUploadSuccess} />
              </div>
            )}

            {/* Search and Filters */}
            {hasDocuments && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="all">All Documents</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="processing">Processing</option>
                      <option value="error">Error</option>
                    </select>
                    <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Document List */}
            <DocumentList
              documents={filteredDocuments}
              loading={loading}
              onDocumentOpen={handleDocumentOpen}
            />
          </div>
        )}
      </main>
    </div>
  );
}