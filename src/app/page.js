'use client';
import './globals.css';
import { useState } from 'react';
import DocumentViewer from '@/components/DocumentViewer';
import IssuesPanel from '@/components/IssuesPanel';
import Header from '@/components/Header';
import { useDocumentStore } from '@/store/documentStore';
import { BookOpen } from 'lucide-react';

export default function Home() {
  const [splitRatio, setSplitRatio] = useState(60);
  const { documentText, issues } = useDocumentStore();

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full px-4 py-3">
        <div className="flex justify-between items-center pb-3 bg-white rounded-t-lg shadow-sm p-3 border-x border-t border-gray-200">
          <div className="flex items-center">
            <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-blue-700">APA Document Checker</h2>
          </div>
          <div className="text-sm bg-blue-50 px-3 py-1 rounded-full text-blue-700 font-medium">
            {documentText ? 'Document loaded and analyzed' : 'No document loaded'}
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden rounded-b-lg shadow-lg border border-gray-200 bg-white">
          {/* Document Viewer (left panel) */}
          <div 
            className="relative overflow-auto border-r border-gray-200"
            style={{ width: `${splitRatio}%` }}
          >
            <DocumentViewer />
          </div>
          
          {/* Resize handle */}
          <div 
            className="w-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-400 hover:to-blue-500 cursor-col-resize transition-colors relative flex items-center justify-center"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = splitRatio;
              
              const handleMouseMove = (moveEvent) => {
                const containerWidth = document.body.clientWidth;
                const newWidth = startWidth + ((moveEvent.clientX - startX) / containerWidth * 100);
                
                // Constrain between 30% and 80%
                const constrainedWidth = Math.max(30, Math.min(80, newWidth));
                setSplitRatio(constrainedWidth);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="absolute flex flex-col space-y-1.5">
              <div className="w-1 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Issues Panel (right panel) */}
          <div 
            className="overflow-auto bg-gray-50"
            style={{ width: `${100 - splitRatio}%` }}
          >
            <IssuesPanel />
          </div>
        </div>
        
        <div className="py-3 text-xs text-center text-blue-600 font-medium bg-white mt-2 rounded-lg shadow-sm border border-gray-200 p-2">
          APA 7th Edition Document Checker | Validate academic papers against APA guidelines
        </div>
      </div>
    </main>
  );
}
