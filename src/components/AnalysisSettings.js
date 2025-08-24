'use client';

import { useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { Settings, Clock, Zap } from 'lucide-react';

export default function AnalysisSettings() {
  const { analysisSettings, updateAnalysisSettings, cancelDebouncedAnalysis, processingState } = useDocumentStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleDelayChange = (newDelay) => {
    updateAnalysisSettings({ debounceDelay: newDelay });
    
    // If there's a pending analysis, cancel and restart with new delay
    if (processingState.isSchedulingAnalysis) {
      cancelDebouncedAnalysis();
    }
  };

  const handleAutoAnalyzeChange = (autoAnalyze) => {
    updateAnalysisSettings({ autoAnalyze });
  };

  const presetDelays = [
    { label: 'Instant', value: 0, icon: <Zap className="h-4 w-4" /> },
    { label: 'Fast (0.5s)', value: 500, icon: <Clock className="h-4 w-4" /> },
    { label: 'Normal (1.5s)', value: 1500, icon: <Clock className="h-4 w-4" /> },
    { label: 'Slow (3s)', value: 3000, icon: <Clock className="h-4 w-4" /> }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        title="Analysis Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {showSettings && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Analysis Settings
            </h3>

            {/* Auto-analyze toggle */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisSettings.autoAnalyze}
                  onChange={(e) => handleAutoAnalyzeChange(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-analyze documents</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Automatically analyze documents when uploaded
              </p>
            </div>

            {/* Debounce delay settings */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Delay
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Delay before starting analysis to improve performance with large documents
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {presetDelays.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleDelayChange(preset.value)}
                    className={`flex items-center justify-center p-2 text-xs rounded-md border transition-colors ${
                      analysisSettings.debounceDelay === preset.value
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset.icon}
                    <span className="ml-1">{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom delay input */}
              <div className="mt-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Custom delay (milliseconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="100"
                  value={analysisSettings.debounceDelay}
                  onChange={(e) => handleDelayChange(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Current status */}
            {processingState.isSchedulingAnalysis && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center text-xs text-blue-700">
                  <Clock className="h-3 w-3 mr-1 animate-pulse" />
                  Analysis scheduled ({Math.ceil((Date.now() - processingState.analysisScheduledAt) / 1000)}s ago)
                </div>
                <button
                  onClick={cancelDebouncedAnalysis}
                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                >
                  Cancel pending analysis
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
