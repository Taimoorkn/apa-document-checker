'use client';
import './globals.css';
import { useState } from 'react'; 
import IssuesPanel from '@/components/IssuesPanel';
import Header from '@/components/Header'; 
import { useDocumentStore } from '@/store/enhancedDocumentStore';
import DocumentEditor from '@/components/DocumentEditor';

export default function Home() {
  const [splitRatio, setSplitRatio] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const { documentText, issues } = useDocumentStore();

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50" role="main">
      <Header />
      
      <section className="flex-1 flex overflow-hidden relative" aria-label="Document analysis workspace">
        {/* Document Viewer (left panel) */}
        <article 
          className="relative bg-white shadow-xl border-r border-gray-100 transition-all duration-300"
          style={{ width: `${splitRatio}%` }}
          role="region"
          aria-label="Document editor and viewer"
        >
          <DocumentEditor />
        </article>
        
        {/* Modern Resize Handle */}
        <div 
          className={`w-1.5 cursor-col-resize relative group transition-all duration-200 ${
            isDragging ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-gray-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-400/30'
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
              isDragging ? 'bg-indigo-500 opacity-100' : 'bg-gray-400 opacity-0 group-hover:opacity-100'
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
        <aside 
          className="bg-white shadow-xl border-l border-gray-100 transition-all duration-300"
          style={{ width: `${100 - splitRatio}%` }}
          role="complementary"
          aria-label="APA issues and suggestions panel"
        >
          <IssuesPanel />
        </aside>
      </section>
    </main>
  );
}
