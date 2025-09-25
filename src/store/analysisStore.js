'use client';

import { create } from 'zustand';
import { analyzeAPADocument } from '@/utils/enhancedApaAnalyzer';

export const useAnalysisStore = create((set, get) => ({
  // Analysis functions
  analyzeDocument: async (documentData) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Starting document analysis...');
      }

      const issues = await analyzeAPADocument(documentData);
      return issues || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Analysis error:', error);
      }
      throw error;
    }
  },

  analyzeDocumentRealtime: async (content, options = {}) => {
    const {
      debounceMs = 8000, // Increased to 8 seconds for better performance
      minChangeThreshold = 100
    } = options;

    return new Promise((resolve) => {
      // Clear existing timer
      const existingTimer = get().realtimeTimer;
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timerId = setTimeout(async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('Real-time analysis triggered');
          }

          const documentData = {
            text: content?.text || '',
            html: content?.html || '',
            formatting: null,
            structure: null
          };

          const issues = await get().analyzeDocument(documentData);
          resolve(issues);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Real-time analysis error:', error);
          }
          resolve([]);
        }
      }, debounceMs);

      set({ realtimeTimer: timerId });
    });
  },

  cancelRealtimeAnalysis: () => {
    const timerId = get().realtimeTimer;
    if (timerId) {
      clearTimeout(timerId);
      set({ realtimeTimer: null });
    }
  },

  // State
  realtimeTimer: null
}));