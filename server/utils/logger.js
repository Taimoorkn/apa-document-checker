// Structured logging utility for better error tracking and monitoring

const os = require('os');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.environment = process.env.NODE_ENV || 'development';
    this.hostname = os.hostname();

    // Log levels in order of severity
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    this.currentLevel = this.levels[this.logLevel] || this.levels.info;
  }

  /**
   * Generate correlation ID for request tracking
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format log entry with consistent structure
   */
  formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      hostname: this.hostname,
      environment: this.environment,
      pid: process.pid,
      ...metadata
    };

    // Add stack trace for errors
    if (level === 'error' && metadata.error) {
      logEntry.stack = metadata.error.stack;
      logEntry.errorName = metadata.error.name;
      logEntry.errorMessage = metadata.error.message;
    }

    return logEntry;
  }

  /**
   * Output log entry (console in development, structured in production)
   */
  output(logEntry) {
    if (this.environment === 'development') {
      // Human-readable format for development
      const color = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[36m',  // Cyan
        DEBUG: '\x1b[37m'  // White
      }[logEntry.level] || '\x1b[0m';

      const reset = '\x1b[0m';
      const prefix = `${color}[${logEntry.level}]${reset} ${logEntry.timestamp}`;

      if (logEntry.level === 'ERROR' && logEntry.stack) {
        console.error(`${prefix} ${logEntry.message}`);
        console.error(`${prefix} ${logEntry.stack}`);
      } else {
        console.log(`${prefix} ${logEntry.message}`);
      }

      // Log additional metadata in debug mode
      if (this.logLevel === 'debug' && Object.keys(logEntry).length > 6) {
        const { timestamp, level, message, hostname, environment, pid, ...rest } = logEntry;
        console.log(`${prefix} Metadata:`, JSON.stringify(rest, null, 2));
      }
    } else {
      // Structured JSON format for production
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    return this.levels[level] <= this.currentLevel;
  }

  /**
   * Error logging
   */
  error(message, error = null, metadata = {}) {
    if (!this.shouldLog('error')) return;

    const logEntry = this.formatLogEntry('error', message, {
      ...metadata,
      error: error || new Error(message)
    });

    this.output(logEntry);
    return logEntry;
  }

  /**
   * Warning logging
   */
  warn(message, metadata = {}) {
    if (!this.shouldLog('warn')) return;

    const logEntry = this.formatLogEntry('warn', message, metadata);
    this.output(logEntry);
    return logEntry;
  }

  /**
   * Info logging
   */
  info(message, metadata = {}) {
    if (!this.shouldLog('info')) return;

    const logEntry = this.formatLogEntry('info', message, metadata);
    this.output(logEntry);
    return logEntry;
  }

  /**
   * Debug logging
   */
  debug(message, metadata = {}) {
    if (!this.shouldLog('debug')) return;

    const logEntry = this.formatLogEntry('debug', message, metadata);
    this.output(logEntry);
    return logEntry;
  }

  /**
   * Request logging middleware
   */
  requestMiddleware() {
    return (req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      const startTime = Date.now();

      // Add correlation ID to request object
      req.correlationId = correlationId;

      // Log incoming request
      this.info('Incoming request', {
        correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        contentLength: req.headers['content-length'],
        remoteAddress: req.ip || req.connection.remoteAddress
      });

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;

        // Log response
        logger.info('Request completed', {
          correlationId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length')
        });

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Express error handler middleware
   */
  errorMiddleware() {
    return (error, req, res, next) => {
      const correlationId = req.correlationId || this.generateCorrelationId();

      this.error('Express error handler', error, {
        correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode || 500,
        userAgent: req.headers['user-agent']
      });

      // Don't handle the error, just log it
      next(error);
    };
  }

  /**
   * Document processing specific logging
   */
  documentProcessing(phase, metadata = {}) {
    this.info(`Document processing: ${phase}`, {
      phase,
      documentProcessing: true,
      ...metadata
    });
  }

  /**
   * Performance logging
   */
  performance(operation, duration, metadata = {}) {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn if operation takes > 5 seconds

    this[level](`Performance: ${operation}`, {
      operation,
      duration,
      performance: true,
      ...metadata
    });
  }

  /**
   * Security event logging
   */
  security(event, metadata = {}) {
    this.warn(`Security event: ${event}`, {
      event,
      security: true,
      ...metadata
    });
  }

  /**
   * Health check logging
   */
  health(status, metadata = {}) {
    const level = status === 'healthy' ? 'info' : 'warn';

    this[level](`Health check: ${status}`, {
      status,
      health: true,
      ...metadata
    });
  }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;