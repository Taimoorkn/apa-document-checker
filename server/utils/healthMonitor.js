// Server health monitoring utility

class HealthMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      processingTimes: [],
      lastErrors: [],
      startTime: Date.now()
    };

    this.maxStoredProcessingTimes = 100;
    this.maxStoredErrors = 50;
  }

  /**
   * Record a successful request
   * @param {number} processingTime - Time taken to process request in ms
   */
  recordRequest(processingTime) {
    this.metrics.requestCount++;

    // Store processing time (keep only last N values)
    this.metrics.processingTimes.push({
      timestamp: Date.now(),
      duration: processingTime
    });

    if (this.metrics.processingTimes.length > this.maxStoredProcessingTimes) {
      this.metrics.processingTimes.shift();
    }
  }

  /**
   * Record an error
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   */
  recordError(error, context = 'unknown') {
    this.metrics.errorCount++;

    const errorRecord = {
      timestamp: Date.now(),
      message: error.message,
      context: context,
      stack: error.stack,
      name: error.name
    };

    this.metrics.lastErrors.push(errorRecord);

    if (this.metrics.lastErrors.length > this.maxStoredErrors) {
      this.metrics.lastErrors.shift();
    }

    console.error(`[HealthMonitor] Error in ${context}:`, error);
  }

  /**
   * Get current health metrics
   * @returns {Object} Health metrics
   */
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;

    // Calculate average processing time for recent requests
    const recentProcessingTimes = this.metrics.processingTimes
      .filter(pt => (now - pt.timestamp) < 300000) // Last 5 minutes
      .map(pt => pt.duration);

    const avgProcessingTime = recentProcessingTimes.length > 0
      ? recentProcessingTimes.reduce((sum, time) => sum + time, 0) / recentProcessingTimes.length
      : 0;

    // Calculate error rate for recent requests
    const recentErrors = this.metrics.lastErrors
      .filter(err => (now - err.timestamp) < 300000); // Last 5 minutes

    const errorRate = this.metrics.requestCount > 0
      ? (this.metrics.errorCount / this.metrics.requestCount) * 100
      : 0;

    return {
      uptime,
      totalRequests: this.metrics.requestCount,
      totalErrors: this.metrics.errorCount,
      errorRate,
      avgProcessingTime,
      recentErrorCount: recentErrors.length,
      lastErrors: this.metrics.lastErrors.slice(-5), // Last 5 errors
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: now
    };
  }

  /**
   * Get health status based on metrics
   * @returns {string} Health status: 'healthy', 'degraded', 'unhealthy'
   */
  getHealthStatus() {
    const metrics = this.getMetrics();

    // Check memory usage
    const memoryUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;

    // Check error rate
    const errorRateThreshold = 10; // 10% error rate

    // Check processing time
    const slowProcessingThreshold = 30000; // 30 seconds

    if (memoryUsagePercent > 95 || metrics.errorRate > 50) {
      return 'unhealthy';
    }

    if (memoryUsagePercent > 80 ||
        metrics.errorRate > errorRateThreshold ||
        metrics.avgProcessingTime > slowProcessingThreshold) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get detailed health report
   * @returns {Object} Detailed health report
   */
  getHealthReport() {
    const metrics = this.getMetrics();
    const status = this.getHealthStatus();

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(metrics.uptime / 1000), // Convert to seconds
      metrics: {
        requests: {
          total: metrics.totalRequests,
          errors: metrics.totalErrors,
          errorRate: metrics.errorRate.toFixed(2) + '%',
          avgProcessingTime: metrics.avgProcessingTime.toFixed(2) + 'ms'
        },
        memory: {
          heapUsed: Math.round(metrics.memory.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(metrics.memory.heapTotal / 1024 / 1024) + 'MB',
          usagePercent: ((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100).toFixed(2) + '%'
        },
        recentErrors: metrics.recentErrorCount
      },
      lastErrors: metrics.lastErrors.map(err => ({
        timestamp: new Date(err.timestamp).toISOString(),
        message: err.message,
        context: err.context
      }))
    };
  }

  /**
   * Middleware to automatically track requests
   * @returns {Function} Express middleware
   */
  requestMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(data) {
        const processingTime = Date.now() - startTime;

        if (res.statusCode >= 400) {
          healthMonitor.recordError(
            new Error(`HTTP ${res.statusCode}: ${req.method} ${req.path}`),
            `${req.method} ${req.path}`
          );
        } else {
          healthMonitor.recordRequest(processingTime);
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      processingTimes: [],
      lastErrors: [],
      startTime: Date.now()
    };
  }
}

// Export singleton instance
const healthMonitor = new HealthMonitor();

module.exports = healthMonitor;