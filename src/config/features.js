'use client';

/**
 * Feature Flag Configuration
 * Enables gradual migration from old to new architecture
 */

// Environment-based feature flags
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Parse environment variables for feature overrides
const getEnvFlag = (flagName, defaultValue) => {
  const envValue = process.env[`NEXT_PUBLIC_${flagName}`];
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return defaultValue;
};

export const FEATURES = {
  // === CORE ARCHITECTURE ===

  /**
   * Enable new DocumentModel-based architecture
   * - Single source of truth
   * - Bidirectional editor sync
   * - Persistent edit state
   */
  USE_NEW_DOCUMENT_ARCHITECTURE: getEnvFlag('NEW_ARCHITECTURE', isDevelopment),

  /**
   * Enable incremental APA analysis
   * - 90% performance improvement
   * - Paragraph-level caching
   * - Smart invalidation
   */
  INCREMENTAL_ANALYSIS: getEnvFlag('INCREMENTAL_ANALYSIS', true),

  /**
   * Enable bidirectional editor sync
   * - Real-time document model updates
   * - Format preservation
   * - Edit persistence
   */
  BIDIRECTIONAL_SYNC: getEnvFlag('BIDIRECTIONAL_SYNC', isDevelopment),

  /**
   * Enable paragraph-level caching
   * - Massive performance gains
   * - Memory efficiency
   * - Smart cache management
   */
  PARAGRAPH_CACHING: getEnvFlag('PARAGRAPH_CACHING', true),

  /**
   * Enable unified fix application
   * - Consistent client/server fixes
   * - Transactional updates
   * - Rollback support
   */
  UNIFIED_FIX_SYSTEM: getEnvFlag('UNIFIED_FIX_SYSTEM', isDevelopment),

  // === MIGRATION CONTROLS ===

  /**
   * Run both old and new systems in parallel for comparison
   */
  PARALLEL_VALIDATION: getEnvFlag('PARALLEL_VALIDATION', isDevelopment),

  /**
   * Enable detailed migration logging
   */
  MIGRATION_LOGGING: getEnvFlag('MIGRATION_LOGGING', isDevelopment),

  /**
   * Show migration status in UI
   */
  SHOW_MIGRATION_STATUS: getEnvFlag('SHOW_MIGRATION_STATUS', isDevelopment),

  /**
   * Enable automatic fallback to old system on errors
   */
  AUTO_FALLBACK: getEnvFlag('AUTO_FALLBACK', true),

  // === PERFORMANCE FEATURES ===

  /**
   * Enable real-time performance monitoring
   */
  PERFORMANCE_MONITORING: getEnvFlag('PERFORMANCE_MONITORING', isDevelopment),

  /**
   * Enable memory usage tracking
   */
  MEMORY_TRACKING: getEnvFlag('MEMORY_TRACKING', isDevelopment),

  /**
   * Enable analysis timing metrics
   */
  ANALYSIS_METRICS: getEnvFlag('ANALYSIS_METRICS', isDevelopment),

  // === DEVELOPMENT FEATURES ===

  /**
   * Enable debug information in UI
   */
  DEBUG_INFO: getEnvFlag('DEBUG_INFO', isDevelopment),

  /**
   * Enable verbose console logging
   */
  VERBOSE_LOGGING: getEnvFlag('VERBOSE_LOGGING', isDevelopment),

  /**
   * Enable state inspection tools
   */
  STATE_INSPECTOR: getEnvFlag('STATE_INSPECTOR', isDevelopment),

  /**
   * Enable performance profiling
   */
  PERFORMANCE_PROFILING: getEnvFlag('PERFORMANCE_PROFILING', false)
};

// Feature combinations for easy toggling
export const FEATURE_SETS = {
  /**
   * Full new architecture with all features
   */
  FULL_NEW_ARCHITECTURE: {
    USE_NEW_DOCUMENT_ARCHITECTURE: true,
    INCREMENTAL_ANALYSIS: true,
    BIDIRECTIONAL_SYNC: true,
    PARAGRAPH_CACHING: true,
    UNIFIED_FIX_SYSTEM: true
  },

  /**
   * Safe migration mode - new architecture with fallbacks
   */
  SAFE_MIGRATION: {
    USE_NEW_DOCUMENT_ARCHITECTURE: true,
    INCREMENTAL_ANALYSIS: true,
    BIDIRECTIONAL_SYNC: true,
    PARAGRAPH_CACHING: true,
    UNIFIED_FIX_SYSTEM: false, // Keep old fix system initially
    AUTO_FALLBACK: true,
    PARALLEL_VALIDATION: true
  },

  /**
   * Performance testing mode
   */
  PERFORMANCE_TEST: {
    USE_NEW_DOCUMENT_ARCHITECTURE: true,
    INCREMENTAL_ANALYSIS: true,
    BIDIRECTIONAL_SYNC: true,
    PARAGRAPH_CACHING: true,
    PERFORMANCE_MONITORING: true,
    MEMORY_TRACKING: true,
    ANALYSIS_METRICS: true
  },

  /**
   * Legacy mode - all new features disabled
   */
  LEGACY_MODE: {
    USE_NEW_DOCUMENT_ARCHITECTURE: false,
    INCREMENTAL_ANALYSIS: false,
    BIDIRECTIONAL_SYNC: false,
    PARAGRAPH_CACHING: false,
    UNIFIED_FIX_SYSTEM: false
  }
};

/**
 * Apply a feature set configuration
 */
export const applyFeatureSet = (setName) => {
  const featureSet = FEATURE_SETS[setName];
  if (!featureSet) {
    console.warn(`Unknown feature set: ${setName}`);
    return FEATURES;
  }

  return { ...FEATURES, ...featureSet };
};

/**
 * Get current feature configuration with environment info
 */
export const getFeatureConfig = () => {
  return {
    features: FEATURES,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      isDevelopment,
      isProduction
    },
    activeFeatures: Object.entries(FEATURES)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name),
    timestamp: new Date().toISOString()
  };
};

/**
 * Check if new architecture should be used
 */
export const shouldUseNewArchitecture = () => {
  return FEATURES.USE_NEW_DOCUMENT_ARCHITECTURE;
};

/**
 * Check if incremental analysis is enabled
 */
export const shouldUseIncrementalAnalysis = () => {
  return FEATURES.INCREMENTAL_ANALYSIS;
};

/**
 * Check if bidirectional sync is enabled
 */
export const shouldUseBidirectionalSync = () => {
  return FEATURES.BIDIRECTIONAL_SYNC;
};

/**
 * Log feature configuration on startup
 */
export const logFeatureConfig = () => {
  if (FEATURES.MIGRATION_LOGGING || FEATURES.VERBOSE_LOGGING) {
    console.group('🚀 Feature Configuration');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('New Architecture:', FEATURES.USE_NEW_DOCUMENT_ARCHITECTURE);
    console.log('Incremental Analysis:', FEATURES.INCREMENTAL_ANALYSIS);
    console.log('Bidirectional Sync:', FEATURES.BIDIRECTIONAL_SYNC);
    console.log('Paragraph Caching:', FEATURES.PARAGRAPH_CACHING);
    console.log('Unified Fix System:', FEATURES.UNIFIED_FIX_SYSTEM);

    if (FEATURES.DEBUG_INFO) {
      console.log('All Features:', FEATURES);
    }
    console.groupEnd();
  }
};

// Auto-log configuration in development
if (isDevelopment && typeof window !== 'undefined') {
  // Log after a brief delay to ensure console is ready
  setTimeout(logFeatureConfig, 100);
}