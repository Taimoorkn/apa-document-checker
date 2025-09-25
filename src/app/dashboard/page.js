'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import { useDocumentPersistenceStore } from '@/store/documentPersistenceStore';
import { useRouter } from 'next/navigation';
import { LogOut, User, FileText, Trash2, Download, Eye, ArrowLeft } from 'lucide-react';
import IssuesPanel from '@/components/IssuesPanel';
import Header from '@/components/Header';
import DocumentEditor from '@/components/DocumentEditor';
import DocumentManagementPanel from '@/components/DocumentManagementPanel';

export default function Dashboard() {
  const { user, userProfile, signOut } = useAuthStore();
  const { loadDocument, resetStore } = useDocumentStore();
  const { saveDocument } = useDocumentPersistenceStore();
  const router = useRouter();
  const [splitRatio, setSplitRatio] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentView, setCurrentView] = useState('management'); // 'management' or 'editor'
  const [currentDocument, setCurrentDocument] = useState(null);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/');
    }
  };

  const handleDocumentSelect = async (document) => {
    try {
      // Load the full document data
      const result = await loadDocument(document.id, user.id);
      if (result.success) {
        const docData = result.document;

        // Set the document in the document store
        // This is where we'd restore the document state
        // For now, we'll just switch to editor view
        setCurrentDocument(docData);
        setCurrentView('editor');
      } else {
        alert(`Failed to load document: ${result.error}`);
      }
    } catch (error) {
      alert(`Error loading document: ${error.message}`);
    }
  };

  const handleCreateNew = () => {
    resetStore();
    setCurrentDocument(null);
    setCurrentView('editor');
  };

  const handleBackToManagement = () => {
    setCurrentView('management');
    setCurrentDocument(null);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">APA Document Checker</h1>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userProfile?.full_name?.[0] || user?.email?.[0] || 'U'}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Profile Settings</span>
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {currentView === 'management' ? (
        /* Document Management View */
        <div className="flex-1 overflow-hidden">
          <DocumentManagementPanel
            onDocumentSelect={handleDocumentSelect}
            onCreateNew={handleCreateNew}
          />
        </div>
      ) : (
        /* Document Editor View */
        <>
          {/* Back button and Header */}
          <div className="flex items-center px-6 py-2 bg-gray-50 border-b border-gray-200">
            <button
              onClick={handleBackToManagement}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Documents</span>
            </button>
            {currentDocument && (
              <div className="ml-4 text-sm text-gray-600">
                Editing: <span className="font-medium">{currentDocument.title}</span>
              </div>
            )}
          </div>

          <Header />

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
        </>
      )}
    </div>
  );
}