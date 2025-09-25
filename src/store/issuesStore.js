'use client';

import { create } from 'zustand';

export const useIssuesStore = create((set, get) => ({
  // Issues state
  issues: [],
  activeIssueId: null,
  showIssueHighlighting: true,

  // Actions
  setIssues: (issues) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Setting issues:', issues.length);
    }
    set({ issues });
  },

  addIssue: (issue) => {
    const { issues } = get();
    set({ issues: [...issues, issue] });
  },

  removeIssue: (issueId) => {
    const { issues } = get();
    set({ issues: issues.filter(issue => issue.id !== issueId) });
  },

  setActiveIssue: (issueId) => {
    set({ activeIssueId: issueId });
  },

  clearActiveIssue: () => {
    set({ activeIssueId: null });
  },

  toggleIssueHighlighting: () => {
    const { showIssueHighlighting } = get();
    set({ showIssueHighlighting: !showIssueHighlighting });
  },

  clearAllIssues: () => {
    set({
      issues: [],
      activeIssueId: null
    });
  }
}));