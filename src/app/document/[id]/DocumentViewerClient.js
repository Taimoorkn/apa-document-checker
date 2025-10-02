'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';
import { indexedDBManager } from '@/utils/indexedDBManager';
import IssuesPanel from '@/components/IssuesPanel';
import NewDocumentEditor from '@/components/NewDocumentEditor';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

/**
 * Client component for viewing and editing documents from Supabase
 */
export default function DocumentViewerClient({ user, profile, document: docData, analysisResult }) {
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

        // THREE-LAYER ARCHITECTURE: Check IndexedDB first for reload safety
        const localDraft = await indexedDBManager.loadFromIndexedDB(docData.id);

        let documentData;
        let useLocalDraft = false;

        if (localDraft && localDraft.tiptapContent) {
          // Calculate age of local draft
          const draftAge = Date.now() - localDraft.lastSaved;
          const draftAgeMinutes = Math.round(draftAge / 1000 / 60);

          console.log(`📂 Found local draft in IndexedDB (${draftAgeMinutes} minutes old)`);

          // Check if Supabase version is newer
          const supabaseTimestamp = analysisResult.content_saved_at
            ? new Date(analysisResult.content_saved_at).getTime()
            : 0;

          if (localDraft.lastSaved > supabaseTimestamp) {
            console.log('✅ Local draft is newer than Supabase - using local draft');
            useLocalDraft = true;

            // Use local draft with server document_data as base
            documentData = {
              ...analysisResult.document_data,
              tiptapContent: localDraft.tiptapContent
            };
          } else {
            console.log('⚠️ Supabase version is newer - discarding local draft');
            // Clear stale local draft
            await indexedDBManager.clearFromIndexedDB(docData.id);
          }
        }

        if (!useLocalDraft) {
          // No local draft or Supabase is newer - load from Supabase
          if (analysisResult.tiptap_content) {
            // Load from saved Tiptap JSON (includes manual edits)
            console.log('☁️ Loading from Supabase tiptap_content (edited version)');
            documentData = {
              ...analysisResult.document_data,
              tiptapContent: analysisResult.tiptap_content
            };
          } else {
            // Fallback to original document_data (first load)
            console.log('☁️ Loading from Supabase document_data (original version)');
            documentData = analysisResult.document_data;
          }
        }

        if (!documentData && !analysisResult.tiptap_content) {
          throw new Error('Document data is missing from analysis results');
        }

        // Add originalName to processingInfo for DocumentModel
        if (documentData.processingInfo && !documentData.processingInfo.originalName) {
          documentData.processingInfo.originalName = docData.filename;
        }

        // Load issues from analysis results
        const issues = analysisResult.issues || [];

        // Add Supabase metadata for fix application
        const supabaseMetadata = {
          documentId: docData.id,
          filePath: docData.file_path,
          userId: user.id
        };

        // Load document using store method
        await loadExistingDocument(documentData, issues, supabaseMetadata);

        if (useLocalDraft) {
          console.log('📝 Document loaded from IndexedDB (local unsaved changes restored)');
        } else {
          console.log('✅ Document loaded from Supabase');
        }

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
  }, [docData.id, analysisResult, docData.filename, loadExistingDocument, analyzeDocument, user.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
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
      <header className="bg-white shadow border-b border-slate-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{docData.filename}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                Compliance: {analysisResult.compliance_score}%
              </span>
              <span className="text-sm text-slate-600">
                Issues: {analysisResult.issue_count}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              className="font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
            >
              Dashboard
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2.5 hover:bg-slate-100 rounded-xl px-3 py-2"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">{user.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Avatar className="w-9 h-9 ring-2 ring-slate-200 ring-offset-2">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold">
                      {getInitials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 bg-white shadow-xl border border-slate-200">
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-slate-200">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold">
                        {getInitials(user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-slate-900">{user.email?.split('@')[0]}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg py-2.5"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-medium">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
