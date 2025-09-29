'use client';

/**
 * Feature Flag Configuration
 * Simplified version for new architecture only
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const getEnvFlag = (flagName, defaultValue) => {
  const envValue = process.env[`NEXT_PUBLIC_${flagName}`];
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return defaultValue;
};

export const FEATURES = {
  // === PERFORMANCE FEATURES ===

  /**
   * Enable incremental APA analysis
   * - 90% performance improvement
   * - Paragraph-level caching
   * - Smart invalidation
   */
  INCREMENTAL_ANALYSIS: getEnvFlag('INCREMENTAL_ANALYSIS', true),

  /**
   * Enable paragraph-level caching
   * - Massive performance gains
   * - Memory efficiency
   * - Smart cache management
   */
  PARAGRAPH_CACHING: getEnvFlag('PARAGRAPH_CACHING', true),

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