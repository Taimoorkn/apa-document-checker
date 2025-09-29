'use client';

// Re-export all stores for easy importing
export { useDocumentStore } from './documentStore';
export { useIssuesStore } from './issuesStore';
export { useProcessingStore } from './processingStore';
export { useAnalysisStore } from './analysisStore';

// Combined hook for components that need multiple stores
import { useDocumentStore } from './documentStore';
import { useIssuesStore } from './issuesStore';
import { useProcessingStore } from './processingStore';
import { useAnalysisStore } from './analysisStore';

export const useAppStore = () => {
  const documentStore = useDocumentStore();
  const issuesStore = useIssuesStore();
  const processingStore = useProcessingStore();
  const analysisStore = useAnalysisStore();

  return {
    // Document
    ...documentStore,

    // Issues
    ...issuesStore,

    // Processing
    ...processingStore,

    // Analysis
    ...analysisStore,

    // Combined actions
    analyzeDocumentAndSetIssues: async (documentData) => {
      try {
        processingStore.setAnalyzing(true, 'Analyzing document...');

        const issues = await analysisStore.analyzeDocument(documentData);
        issuesStore.setIssues(issues);

        return issues;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Combined analysis error:', error);
        }
        throw error;
      } finally {
        processingStore.setAnalyzing(false);
      }
    }
  };
};