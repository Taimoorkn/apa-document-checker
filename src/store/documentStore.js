'use client';

import { create } from 'zustand';

export const useDocumentStore = create((set, get) => ({
  // Document state
  documentText: null,
  documentHtml: null,
  documentFormatting: null,
  lastFixAppliedAt: null,

  // Actions
  setDocumentData: (text, html = null, formatting = null) => {
    set({
      documentText: text,
      documentHtml: html,
      documentFormatting: formatting,
      lastFixAppliedAt: new Date().toISOString()
    });
  },

  clearDocument: () => {
    set({
      documentText: null,
      documentHtml: null,
      documentFormatting: null,
      lastFixAppliedAt: null
    });
  },

  updateDocumentText: (text) => {
    set({ documentText: text });
  }
}));