'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDocumentPersistenceStore } from '@/store/documentPersistenceStore';
import { FileText, Trash2, Download, Eye, Search, Plus, Calendar, BarChart3 } from 'lucide-react';

export default function DocumentManagementPanel({ onDocumentSelect, onCreateNew }) {
  const { user } = useAuthStore();
  const {
    savedDocuments,
    isLoadingDocuments,
    isDeletingDocument,
    persistenceError,
    loadUserDocuments,
    deleteDocument,
    searchDocuments,
    clearPersistenceError
  } = useDocumentPersistenceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserDocuments(user.id);
    }
  }, [user, loadUserDocuments]);

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      // Load all documents if search is empty
      await loadUserDocuments(user.id);
      return;
    }

    setIsSearching(true);
    try {
      await searchDocuments(user.id, query);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteDocument = async (documentId, documentTitle) => {
    if (!confirm(`Are you sure you want to delete "${documentTitle}"? This action cannot be undone.`)) {
      return;
    }

    const result = await deleteDocument(documentId, user.id);
    if (!result.success) {
      alert(`Failed to delete document: ${result.error}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    if (score >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getIssuesColor = (count) => {
    if (count === 0) return 'text-green-600';
    if (count <= 5) return 'text-yellow-600';
    if (count <= 15) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>
          <button
            onClick={onCreateNew}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Document</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearching && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {persistenceError && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{persistenceError}</p>
            <button
              onClick={clearPersistenceError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingDocuments ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 rounded-full border-t-transparent"></div>
          </div>
        ) : savedDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'No documents match your search.' : 'Upload your first document to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Document
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            {savedDocuments.map((document) => (
              <div
                key={document.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Document Title and Filename */}
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {document.title}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {document.original_filename}
                        </p>
                      </div>
                    </div>

                    {/* Document Stats */}
                    <div className="flex items-center space-x-4 text-xs text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(document.last_modified)}</span>
                      </div>
                      <div>{formatFileSize(document.file_size)}</div>
                      <div>{document.word_count} words</div>
                    </div>

                    {/* Analysis Results */}
                    <div className="flex items-center space-x-4">
                      {document.analysis_score !== null && (
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(document.analysis_score)}`}>
                          {document.analysis_score}% Score
                        </div>
                      )}

                      {document.total_issues !== null && (
                        <div className={`text-xs font-medium ${getIssuesColor(document.total_issues)}`}>
                          {document.total_issues} {document.total_issues === 1 ? 'Issue' : 'Issues'}
                        </div>
                      )}

                      {document.critical_issues > 0 && (
                        <div className="text-xs text-red-600 font-medium">
                          {document.critical_issues} Critical
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onDocumentSelect(document)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open document"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteDocument(document.id, document.title)}
                      disabled={isDeletingDocument}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {savedDocuments.length > 0 && (
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{savedDocuments.length} documents</span>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>
                Avg Score: {
                  Math.round(
                    savedDocuments
                      .filter(d => d.analysis_score !== null)
                      .reduce((sum, d) => sum + d.analysis_score, 0) /
                    savedDocuments.filter(d => d.analysis_score !== null).length || 0
                  )
                }%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}