'use client';

import { useState } from 'react';
import { useDocuments } from '@/contexts/DocumentsContext';
import {
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  MoreVertical,
  Edit,
  Download,
  Trash2,
  ExternalLink,
  Clock
} from 'lucide-react';

export default function DocumentList({ documents, loading, onDocumentOpen }) {
  const { deleteDocument } = useDocuments();
  const [deletingId, setDeletingId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const handleDelete = async (documentId) => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      setDeletingId(documentId);
      const { error } = await deleteDocument(documentId);

      if (error) {
        alert('Failed to delete document. Please try again.');
      }
      setDeletingId(null);
      setDropdownOpen(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'analyzed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'analyzed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getIssuesSummary = (issues) => {
    if (!issues || issues.length === 0) {
      return { total: 0, critical: 0, major: 0, minor: 0 };
    }

    return issues.reduce(
      (acc, issue) => {
        acc.total++;
        switch (issue.severity) {
          case 'critical':
            acc.critical++;
            break;
          case 'major':
            acc.major++;
            break;
          case 'minor':
            acc.minor++;
            break;
        }
        return acc;
      },
      { total: 0, critical: 0, major: 0, minor: 0 }
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">No documents found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
      </div>

      {/* Document Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => {
            const issuesSummary = getIssuesSummary(document.issues);

            return (
              <div
                key={document.id}
                className="group relative bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => onDocumentOpen(document.id)}
              >
                {/* Document Card */}
                <div className="p-6">
                  {/* Header with Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            document.status
                          )}`}
                        >
                          {getStatusIcon(document.status)}
                          <span className="capitalize">{document.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(dropdownOpen === document.id ? null : document.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {dropdownOpen === document.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDocumentOpen(document.id);
                              setDropdownOpen(null);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement download
                              setDropdownOpen(null);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(document.id);
                            }}
                            disabled={deletingId === document.id}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === document.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Name */}
                  <h4 className="font-semibold text-slate-900 mb-2 truncate" title={document.name}>
                    {document.name}
                  </h4>

                  {/* Content Preview */}
                  {document.content_preview && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {document.content_preview}
                    </p>
                  )}

                  {/* Issues Summary */}
                  {document.status === 'analyzed' && issuesSummary.total > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2">Issues Found:</p>
                      <div className="flex items-center space-x-3 text-xs">
                        {issuesSummary.critical > 0 && (
                          <span className="flex items-center space-x-1 text-red-600">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>{issuesSummary.critical} Critical</span>
                          </span>
                        )}
                        {issuesSummary.major > 0 && (
                          <span className="flex items-center space-x-1 text-orange-600">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>{issuesSummary.major} Major</span>
                          </span>
                        )}
                        {issuesSummary.minor > 0 && (
                          <span className="flex items-center space-x-1 text-blue-600">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{issuesSummary.minor} Minor</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(document.created_at)}</span>
                    </div>
                    {document.file_size && (
                      <span>{Math.round(document.file_size / 1024)} KB</span>
                    )}
                  </div>
                </div>

                {/* Click Overlay */}
                <div className="absolute inset-0 rounded-xl bg-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}