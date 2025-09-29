'use client';
import { useState, useEffect } from 'react';
import IssuesPanel from '@/components/IssuesPanel';
import Header from '@/components/Header';
import DocumentEditor from '@/components/DocumentEditor';
import { UnifiedDocumentEditor } from '@/components/UnifiedDocumentEditor';
import { MigrationWrapper, PerformanceComparison, FeatureFlagDisplay } from '@/components/MigrationWrapper';
import { shouldUseNewArchitecture, FEATURES, logFeatureConfig } from '@/config/features';

export default function Home() {
  const [splitRatio, setSplitRatio] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [architectureMode, setArchitectureMode] = useState(shouldUseNewArchitecture());

  // Log feature configuration on mount
  useEffect(() => {
    logFeatureConfig();
  }, []);

  // Architecture switch handler for testing
  const handleArchitectureSwitch = () => {
    setArchitectureMode(!architectureMode);
    if (FEATURES.MIGRATION_LOGGING) {
      console.log(`🔄 Switched to ${!architectureMode ? 'new' : 'legacy'} architecture`);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-white">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Viewer (left panel) */}
        <div
          className="relative bg-white shadow-sm border-r border-slate-200 transition-all duration-300"
          style={{ width: `${splitRatio}%` }}
        >
          {/* Architecture Banner */}
          {FEATURES.SHOW_MIGRATION_STATUS && (
            <div className={`px-4 py-2 text-sm ${
              architectureMode ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
            } border-b`}>
              <div className="flex items-center justify-between">
                <span>
                  {architectureMode ? '🆕 New Architecture' : '📊 Legacy Architecture'} Active
                </span>
                {FEATURES.DEBUG_INFO && (
                  <button
                    onClick={handleArchitectureSwitch}
                    className="text-xs px-2 py-1 rounded bg-white border hover:bg-gray-50"
                  >
                    Switch to {architectureMode ? 'Legacy' : 'New'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Conditional Editor */}
          {architectureMode ? (
            <UnifiedDocumentEditor />
          ) : (
            <DocumentEditor />
          )}
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

      {/* Debug and Performance Components */}
      <PerformanceComparison enabled={FEATURES.PERFORMANCE_MONITORING} />
      <FeatureFlagDisplay enabled={FEATURES.DEBUG_INFO} />
    </main>
  );
}
