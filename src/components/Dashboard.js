'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getUserDocuments, deleteDocument } from '../../lib/supabase';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  Calendar,
  Clock,
  User,
  LogOut
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import LoadingState from './LoadingState';

const Dashboard = () => {
  const { user, signOut, userId, userEmail } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, document: null });
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchDocuments();
    }
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getUserDocuments(userId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteDocument(documentId, userId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setDeleteModal({ isOpen: false, document: null });
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const openDocument = (documentId) => {
    router.push(`/app?doc=${documentId}`);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created_at':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated_at':
      default:
        return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">APA Checker Pro</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/app"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Link>

              <div className="relative">
                <button
                  onClick={() => setActionMenuOpen(actionMenuOpen === 'user' ? null : 'user')}
                  className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{userEmail}</span>
                </button>

                {actionMenuOpen === 'user' && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Documents</h1>
          <p className="text-slate-600">Manage your APA documents and analysis results</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-64"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="updated_at">Last Modified</option>
              <option value="created_at">Date Created</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Documents Grid */}
        {sortedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No documents yet</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              Upload your first DOCX file to start checking APA compliance
            </p>
            <Link
              href="/app"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDocuments.map((document) => (
              <div key={document.id} className="bg-white rounded-lg border border-slate-200 hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate">
                        {document.name}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">
                        {document.original_filename}
                      </p>
                    </div>

                    <div className="relative ml-2">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === document.id ? null : document.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {actionMenuOpen === document.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                          <button
                            onClick={() => openDocument(document.id)}
                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 text-sm"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Open</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteModal({ isOpen: true, document });
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2 text-sm"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Created: {formatDate(document.created_at)}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Modified: {formatDate(document.updated_at)}</span>
                    </div>
                    {document.analysis_results && Array.isArray(document.analysis_results) && (
                      <div className="flex items-center text-sm">
                        <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        <span className="text-slate-600">
                          {document.analysis_results.length} issues found
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => openDocument(document.id)}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Open Document
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, document: null })}
        onConfirm={() => handleDeleteDocument(deleteModal.document?.id)}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteModal.document?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />

      {/* Click outside handler */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;