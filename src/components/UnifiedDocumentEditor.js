'use client';

import React from 'react';
import { MigrationWrapper } from './MigrationWrapper';
import { shouldUseNewArchitecture, FEATURES } from '@/config/features';

// Import both old and new editor components
import { DocumentEditor as LegacyDocumentEditor } from './DocumentEditor';

// New architecture components (will be created)
const NewDocumentEditor = React.lazy(() =>
  import('./NewDocumentEditor').catch(() => ({
    default: () => (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-700">
          New document editor not yet available. Using legacy editor.
        </p>
      </div>
    )
  }))
);

/**
 * Unified Document Editor
 * Conditionally uses old or new architecture based on feature flags
 */
export const UnifiedDocumentEditor = (props) => {
  if (!shouldUseNewArchitecture()) {
    // Use legacy editor directly
    return <LegacyDocumentEditor {...props} />;
  }

  // Use migration wrapper with both implementations
  return (
    <MigrationWrapper
      LegacyComponent={LegacyDocumentEditor}
      NewComponent={React.Suspense ? (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">Loading new editor...</div>
            </div>
          }
        >
          <NewDocumentEditor />
        </React.Suspense>
      ) : NewDocumentEditor}
      fallbackToLegacy={FEATURES.AUTO_FALLBACK}
      showMigrationStatus={FEATURES.SHOW_MIGRATION_STATUS}
      onError={(error, errorInfo) => {
        console.error('Document editor error:', error, errorInfo);

        // Send error to monitoring service if available
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'exception', {
            description: `Editor Error: ${error.message}`,
            fatal: false
          });
        }
      }}
      {...props}
    />
  );
};