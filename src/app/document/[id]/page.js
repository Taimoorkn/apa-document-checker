'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDocuments } from '@/contexts/DocumentsContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DocumentEditor from '@/components/DocumentEditor';
import IssuesPanel from '@/components/IssuesPanel';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import Link from 'next/link';

function DocumentViewContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getDocument } = useDocuments();
  const { setDocumentFromData, documentText } = useDocumentStore();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [splitRatio, setSplitRatio] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  const documentId = params.id;

  useEffect(() => {
    if (!documentId || !user) return;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading document:', documentId);

        const { data, error } = await getDocument(documentId);

        console.log('getDocument result:', { data, error });

        if (error) {
          console.error('Database error:', error);
          setError(error.message);
          return;
        }

        if (!data) {
          console.error('No document data returned');
          setError('Document not found');
          return;
        }

        console.log('Document data received:', data);
        setDocument(data);

        // Load document into the editor store
        const { loadDocumentFromData } = useDocumentStore.getState();
        console.log('Loading document into store...');
        const success = await loadDocumentFromData(data);
        console.log('Store load result:', success);

        if (!success) {
          console.error('Failed to load document into store');
          setError('Failed to load document into editor');
        }

      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId, user, getDocument]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            <span className="text-slate-600">Loading document...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Document Not Found</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <div className="h-6 w-px bg-slate-300"></div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">{document?.name}</h1>
              <p className="text-sm text-slate-500">
                {document?.status === 'analyzed' ? 'Analysis Complete' : 'Processing...'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Viewer (left panel) */}
        <div
          className="relative bg-white shadow-sm border-r border-slate-200 transition-all duration-300"
          style={{ width: `${splitRatio}%` }}
        >
          <DocumentEditor />
        </div>

        {/* Modern Resize Handle */}
        <div
          className={`w-1.5 cursor-col-resize relative group transition-all duration-200 ${
            isDragging ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-300 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-400/30'
          }`}
          onMouseDown={(e) => {
            setIsDragging(true);
            const startX = e.clientX;
            const startWidth = splitRatio;

            const handleMouseMove = (moveEvent) => {
              const containerWidth = document.body.clientWidth;
              const newWidth = startWidth + ((moveEvent.clientX - startX) / containerWidth * 100);

              // Constrain between 35% and 75%
              const constrainedWidth = Math.max(35, Math.min(75, newWidth));
              setSplitRatio(constrainedWidth);
            };

            const handleMouseUp = () => {
              setIsDragging(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              document.body.style.cursor = 'default';
              document.body.style.userSelect = 'auto';
            };

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className={`flex flex-col space-y-1.5 px-1 py-3 rounded-full transition-all duration-200 ${
              isDragging ? 'bg-emerald-500 opacity-100' : 'bg-slate-400 opacity-0 group-hover:opacity-100'
            }`}>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Issues Panel (right panel) */}
        <div
          className="bg-white shadow-sm border-l border-slate-200 transition-all duration-300"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <IssuesPanel />
        </div>
      </div>
    </div>
  );
}

export default function DocumentViewPage() {
  return (
    <ProtectedRoute>
      <DocumentViewContent />
    </ProtectedRoute>
  );
}