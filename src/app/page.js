'use client';
import './globals.css';
import { useState } from 'react'; 
import IssuesPanel from '@/components/IssuesPanel';
import Header from '@/components/Header'; 
import { BookOpen } from 'lucide-react';
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import DocumentEditor from '@/components/DocumentEditor';

export default function Home() {
  const [splitRatio, setSplitRatio] = useState(60);
  const { documentText, issues } = useDocumentStore();

  return (
    <main className="flex flex-col h-screen bg-gray-100">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Document Viewer (left panel) */}
        <div 
          className="relative bg-white border-r border-gray-300"
          style={{ width: `${splitRatio}%` }}
        >
          <DocumentEditor />
        </div>
        
        {/* Resize handle */}
        <div 
          className="w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors relative group"
          onMouseDown={(e) => {
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
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col space-y-1">
              <div className="w-1 h-1.5 bg-white rounded-full"></div>
              <div className="w-1 h-1.5 bg-white rounded-full"></div>
              <div className="w-1 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Issues Panel (right panel) */}
        <div 
          className="bg-white border-l border-gray-300"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <IssuesPanel />
        </div>
      </div>
    </main>
  );
}
