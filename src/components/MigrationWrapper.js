'use client';

import React, { useState, useEffect } from 'react';
import { FEATURES, shouldUseNewArchitecture } from '@/config/features';

/**
 * Migration Wrapper Component
 * Conditionally renders old or new architecture with fallback support
 */
export const MigrationWrapper = ({
  LegacyComponent,
  NewComponent,
  fallbackToLegacy = true,
  showMigrationStatus = FEATURES.SHOW_MIGRATION_STATUS,
  onError = null,
  ...props
}) => {
  const [useNewArchitecture, setUseNewArchitecture] = useState(shouldUseNewArchitecture());
  const [error, setError] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);

  // Error boundary for new architecture
  const handleNewArchitectureError = (error, errorInfo) => {
    console.error('New architecture error:', error, errorInfo);
    setError(error);

    // Notify parent component
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-fallback to legacy if enabled
    if (fallbackToLegacy && FEATURES.AUTO_FALLBACK) {
      console.warn('🔄 Falling back to legacy architecture due to error');
      setUseNewArchitecture(false);
    }
  };

  // Performance monitoring
  useEffect(() => {
    if (!FEATURES.PERFORMANCE_MONITORING) return;

    const startTime = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize || 0;

    return () => {
      const endTime = performance.now();
      const endMemory = performance.memory?.usedJSHeapSize || 0;

      setPerformanceMetrics({
        renderTime: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        architecture: useNewArchitecture ? 'new' : 'legacy',
        timestamp: Date.now()
      });

      if (FEATURES.VERBOSE_LOGGING) {
        console.log('🔍 Component Performance:', {
          renderTime: `${(endTime - startTime).toFixed(2)}ms`,
          memoryDelta: `${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`,
          architecture: useNewArchitecture ? 'new' : 'legacy'
        });
      }
    };
  }, [useNewArchitecture]);

  // Migration status component
  const MigrationStatus = () => {
    if (!showMigrationStatus || !FEATURES.DEBUG_INFO) return null;

    return (
      <div className="fixed top-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm z-50">
        <div className="font-semibold text-blue-800">
          Architecture: {useNewArchitecture ? '🆕 New' : '📊 Legacy'}
        </div>
        {error && (
          <div className="text-red-600 mt-1">
            ⚠️ Error: {error.message}
          </div>
        )}
        {performanceMetrics && (
          <div className="text-blue-600 mt-1 text-xs">
            Render: {performanceMetrics.renderTime.toFixed(1)}ms
          </div>
        )}
        <button
          onClick={() => {
            setUseNewArchitecture(!useNewArchitecture);
            setError(null);
          }}
          className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        >
          Switch to {useNewArchitecture ? 'Legacy' : 'New'}
        </button>
      </div>
    );
  };

  // Error boundary wrapper
  const ErrorBoundaryWrapper = ({ children }) => {
    return (
      <ErrorBoundary onError={handleNewArchitectureError}>
        {children}
      </ErrorBoundary>
    );
  };

  return (
    <>
      {useNewArchitecture ? (
        <ErrorBoundaryWrapper>
          <NewComponent {...props} />
        </ErrorBoundaryWrapper>
      ) : (
        <LegacyComponent {...props} />
      )}
      <MigrationStatus />
    </>
  );
};

/**
 * Simple Error Boundary for catching new architecture errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <h3 className="text-red-800 font-semibold">Architecture Error</h3>
          <p className="text-red-600 mt-2">
            The new architecture encountered an error.
            {FEATURES.AUTO_FALLBACK ? ' Falling back to legacy system...' : ''}
          </p>
          {FEATURES.DEBUG_INFO && this.state.error && (
            <pre className="mt-2 text-xs text-red-500 bg-red-100 p-2 rounded overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for conditional architecture usage
 */
export const useArchitectureMode = () => {
  const [isNewArchitecture, setIsNewArchitecture] = useState(shouldUseNewArchitecture());
  const [migrationMetrics, setMigrationMetrics] = useState({
    switchCount: 0,
    errorCount: 0,
    lastSwitch: null
  });

  const switchToNew = () => {
    setIsNewArchitecture(true);
    setMigrationMetrics(prev => ({
      ...prev,
      switchCount: prev.switchCount + 1,
      lastSwitch: { to: 'new', timestamp: Date.now() }
    }));

    if (FEATURES.MIGRATION_LOGGING) {
      console.log('🔄 Switched to new architecture');
    }
  };

  const switchToLegacy = () => {
    setIsNewArchitecture(false);
    setMigrationMetrics(prev => ({
      ...prev,
      switchCount: prev.switchCount + 1,
      lastSwitch: { to: 'legacy', timestamp: Date.now() }
    }));

    if (FEATURES.MIGRATION_LOGGING) {
      console.log('🔄 Switched to legacy architecture');
    }
  };

  const recordError = (error) => {
    setMigrationMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    if (FEATURES.AUTO_FALLBACK && isNewArchitecture) {
      console.warn('🔄 Auto-falling back to legacy due to error:', error.message);
      switchToLegacy();
    }
  };

  return {
    isNewArchitecture,
    switchToNew,
    switchToLegacy,
    recordError,
    migrationMetrics,
    features: FEATURES
  };
};

/**
 * Performance comparison component
 */
export const PerformanceComparison = ({ enabled = FEATURES.PERFORMANCE_MONITORING }) => {
  const [metrics, setMetrics] = useState({
    legacy: { renderTime: 0, memoryUsage: 0, operations: 0 },
    new: { renderTime: 0, memoryUsage: 0, operations: 0 }
  });

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 border border-gray-300 rounded-lg p-3 text-xs z-50 max-w-xs">
      <div className="font-semibold text-gray-800 mb-2">Performance Comparison</div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Legacy Render:</span>
          <span>{metrics.legacy.renderTime.toFixed(1)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>New Render:</span>
          <span className="text-green-600">{metrics.new.renderTime.toFixed(1)}ms</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Improvement:</span>
          <span className="text-green-600">
            {metrics.legacy.renderTime > 0 ?
              `${(((metrics.legacy.renderTime - metrics.new.renderTime) / metrics.legacy.renderTime) * 100).toFixed(1)}%` :
              'N/A'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Feature flag display component
 */
export const FeatureFlagDisplay = ({ enabled = FEATURES.DEBUG_INFO }) => {
  if (!enabled) return null;

  const activeFeatures = Object.entries(FEATURES)
    .filter(([_, isEnabled]) => isEnabled)
    .map(([name]) => name);

  return (
    <div className="fixed bottom-4 left-4 bg-gray-100 border border-gray-300 rounded-lg p-3 text-xs z-50 max-w-md">
      <div className="font-semibold text-gray-800 mb-2">Active Features</div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {activeFeatures.map(feature => (
          <div key={feature} className="text-green-600">
            ✓ {feature.replace(/_/g, ' ')}
          </div>
        ))}
      </div>
    </div>
  );
};