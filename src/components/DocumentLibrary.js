'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDocumentPersistenceStore } from '@/store/documentPersistenceStore';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  BarChart3,
  Trash2,
  Eye,
  Download,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Grid3X3,
  List,
  Folder
} from 'lucide-react';

export default function DocumentLibrary({ isOpen, onClose, onDocumentSelect }) {
  const { user } = useAuthStore();
  const {
    savedDocuments,
    isLoadingDocuments,
    isDeletingDocument,
    persistenceError,
    loadUserDocuments,
    deleteDocument,
    searchDocuments,
    loadDocument,
    clearPersistenceError
  } = useDocumentPersistenceStore();

  const { setDocumentData } = useDocumentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last_modified');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'recent', 'high-score', 'needs-work'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load documents when component opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadUserDocuments(user.id);
    }
  }, [isOpen, user?.id, loadUserDocuments]);

  // Focus search when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle search with debouncing
  useEffect(() => {
    if (!user?.id) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchDocuments(user.id, searchQuery);
      } else {
        loadUserDocuments(user.id);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id, searchDocuments, loadUserDocuments]);

  // Filter and sort documents
  const filteredAndSortedDocuments = savedDocuments
    .filter(doc => {
      switch (filterBy) {
        case 'recent':
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(doc.last_modified) > weekAgo;
        case 'high-score':
          return doc.analysis_score >= 80;
        case 'needs-work':
          return doc.analysis_score < 70;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

  const handleDocumentOpen = async (document) => {
    try {
      console.log('🔄 Loading document:', document.id);
      setLoadingDocumentId(document.id);

      const result = await loadDocument(document.id, user.id);
      console.log('📄 Document load result:', result);

      if (result.success && result.document) {
        const docData = result.document;
        console.log('📊 Document data:', docData);

        // Prepare the document data for the editor
        const editorData = {
          documentText: docData.document_data?.text || '',
          documentHtml: docData.document_data?.html || '',
          documentFormatting: docData.document_data?.formatting || null,
          documentStructure: docData.document_data?.structure || null,
          documentStyles: docData.document_data?.styles || null,
          editorContent: docData.document_data?.editorContent || null,
          documentName: docData.title || 'Untitled Document',
          issues: docData.issues_data || [],
          analysisScore: docData.analysis_score || null,
          documentStats: {
            wordCount: docData.word_count || 0,
            charCount: docData.char_count || 0,
            paragraphCount: docData.paragraph_count || 0
          }
        };

        console.log('⚡ Setting document data:', editorData);
        setDocumentData(editorData);

        // Close the library
        onClose();

        console.log('✅ Document loaded successfully');
      } else {
        console.error('❌ Failed to load document:', result.error);
        alert(`Failed to load document: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error opening document:', error);
      alert(`Error loading document: ${error.message}`);
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    const result = await deleteDocument(documentId, user.id);
    if (result.success) {
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4" />;
    if (score >= 70) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Document Library</h2>
              <p className="text-sm text-slate-500">
                {filteredAndSortedDocuments.length} document{filteredAndSortedDocuments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-2">
              {/* Filter Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span className="text-sm">Filter</span>
                </button>

                {showFilters && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                    <div className="p-2">
                      {[
                        { value: 'all', label: 'All Documents', icon: FileText },
                        { value: 'recent', label: 'Recent (7 days)', icon: Clock },
                        { value: 'high-score', label: 'High Score (80+)', icon: CheckCircle },
                        { value: 'needs-work', label: 'Needs Work (<70)', icon: AlertCircle }
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => {
                            setFilterBy(value);
                            setShowFilters(false);
                          }}
                          className={`flex items-center space-x-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
                            filterBy === value
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="last_modified-desc">Recently Modified</option>
                <option value="last_modified-asc">Oldest First</option>
                <option value="title-asc">Name A-Z</option>
                <option value="title-desc">Name Z-A</option>
                <option value="analysis_score-desc">Highest Score</option>
                <option value="analysis_score-asc">Lowest Score</option>
              </select>

              {/* View Mode */}
              <div className="flex border border-slate-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {filterBy !== 'all' && (
            <div className="mt-3 flex items-center space-x-2">
              <span className="text-sm text-slate-500">Filtered by:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm flex items-center space-x-1">
                <span>{filterBy.replace('-', ' ')}</span>
                <button onClick={() => setFilterBy('all')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading your documents...</p>
              </div>
            </div>
          ) : filteredAndSortedDocuments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </h3>
                <p className="text-slate-600">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Upload and analyze your first document to get started'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto h-full">
              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {filteredAndSortedDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-slate-900 truncate">
                              {document.title}
                            </h3>
                            {document.analysis_score && (
                              <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center space-x-1 ${getScoreColor(document.analysis_score)}`}>
                                {getScoreIcon(document.analysis_score)}
                                <span>{document.analysis_score}%</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                            <span>{formatDate(document.last_modified)}</span>
                            <span>{formatFileSize(document.file_size)}</span>
                            <span>{document.word_count} words</span>
                            {document.total_issues > 0 && (
                              <span className="text-amber-600">
                                {document.total_issues} issue{document.total_issues !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDocumentOpen(document)}
                          disabled={loadingDocumentId === document.id}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Open document"
                        >
                          {loadingDocumentId === document.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(document.id)}
                          disabled={loadingDocumentId === document.id}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDocumentOpen(document)}
                            disabled={loadingDocumentId === document.id}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingDocumentId === document.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(document.id)}
                            disabled={loadingDocumentId === document.id}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-medium text-slate-900 mb-2 overflow-hidden text-ellipsis" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {document.title}
                      </h3>

                      {document.analysis_score && (
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium mb-3 ${getScoreColor(document.analysis_score)}`}>
                          {getScoreIcon(document.analysis_score)}
                          <span>{document.analysis_score}% Score</span>
                        </div>
                      )}

                      <div className="space-y-1 text-sm text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(document.last_modified)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>{document.word_count} words</span>
                        </div>
                        {document.total_issues > 0 && (
                          <div className="flex items-center space-x-1 text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>{document.total_issues} issues</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Delete Document</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDocumentDelete(showDeleteConfirm)}
                  disabled={isDeletingDocument}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeletingDocument ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {persistenceError && (
          <div className="absolute bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{persistenceError}</p>
              </div>
              <button
                onClick={clearPersistenceError}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}