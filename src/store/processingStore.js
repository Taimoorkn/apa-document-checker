'use client';

import { create } from 'zustand';

export const useProcessingStore = create((set, get) => ({
  // Processing state
  processingState: {
    isUploading: false,
    isAnalyzing: false,
    currentStep: null,
    progress: 0
  },

  // Real-time analysis state
  realtimeAnalysisTimer: null,
  lastAnalysisAt: null,

  // Actions
  setUploading: (isUploading, step = null) => {
    set(state => ({
      processingState: {
        ...state.processingState,
        isUploading,
        currentStep: step
      }
    }));
  },

  setAnalyzing: (isAnalyzing, step = null) => {
    set(state => ({
      processingState: {
        ...state.processingState,
        isAnalyzing,
        currentStep: step
      }
    }));
  },

  setProgress: (progress) => {
    set(state => ({
      processingState: {
        ...state.processingState,
        progress
      }
    }));
  },

  resetProcessing: () => {
    set({
      processingState: {
        isUploading: false,
        isAnalyzing: false,
        currentStep: null,
        progress: 0
      }
    });
  },

  setRealtimeTimer: (timerId) => {
    const { realtimeAnalysisTimer } = get();
    if (realtimeAnalysisTimer) {
      clearTimeout(realtimeAnalysisTimer);
    }
    set({ realtimeAnalysisTimer: timerId });
  },

  clearRealtimeTimer: () => {
    const { realtimeAnalysisTimer } = get();
    if (realtimeAnalysisTimer) {
      clearTimeout(realtimeAnalysisTimer);
    }
    set({ realtimeAnalysisTimer: null });
  },

  updateLastAnalysis: () => {
    set({ lastAnalysisAt: new Date().toISOString() });
  }
}));