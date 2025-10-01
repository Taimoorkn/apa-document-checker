'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';
import IssuesPanel from '@/components/IssuesPanel';
import NewDocumentEditor from '@/components/NewDocumentEditor';

/**
 * Client component for viewing and editing documents from Supabase
 */
export default function DocumentViewerClient({ user, document, analysisResult }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [splitRatio, setSplitRatio] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  const loadExistingDocument = useUnifiedDocumentStore(state => state.loadExistingDocument);
  const analyzeDocument = useUnifiedDocumentStore(state => state.analyzeDocument);

  useEffect(() => {
    // Load document into store when component mounts
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract document_data from analysis result
        const documentData = analysisResult.document_data;

        if (!documentData) {
          throw new Error('Document data is missing from analysis results');
        }

        // Add originalName to processingInfo for DocumentModel
        if (documentData.processingInfo && !documentData.processingInfo.originalName) {
          documentData.processingInfo.originalName = document.filename;
        }

        // Load issues from analysis results
        const issues = analysisResult.issues || [];

        // Add Supabase metadata for fix application
        const supabaseMetadata = {
          documentId: document.id,
          filePath: document.file_path,
          userId: user.id
        };

        // Load document using store method
        await loadExistingDocument(documentData, issues, supabaseMetadata);

        console.log(`✅ Document loaded from Supabase`);

        // If no issues were found (backend skipped analysis), run full analysis now
        if (issues.length === 0) {
          console.log('🧠 Running full APA analysis on frontend...');
          await analyzeDocument({ force: true });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err.message || 'Failed to load document');
        setLoading(false);
      }
    };

    loadDocument();
  }, [document.id, analysisResult, document.filename, loadExistingDocument, analyzeDocument]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <p className="mt-4 text-sm text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Document</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{document.filename}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-600">{user.email}</span>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Compliance: {analysisResult.compliance_score}%
              </span>
              <span className="text-sm text-gray-600">
                Issues: {analysisResult.issue_count}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Dashboard
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Viewer (left panel) */}
        <div
          className="relative bg-white shadow-sm border-r border-slate-200 transition-all duration-300"
          style={{ width: `${splitRatio}%` }}
        >
          <NewDocumentEditor />
        </div>

        {/* Resize Handle */}
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
    </main>
  );
}
