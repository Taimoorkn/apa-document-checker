// Standardized error response handler for consistent API responses

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code for client handling
 * @param {Object} details - Additional error details (only in development)
 * @param {string} requestId - Request correlation ID
 */
function sendErrorResponse(res, statusCode, message, code, details = null, requestId = null) {
  const errorResponse = {
    success: false,
    error: {
      message: message,
      code: code,
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(process.env.NODE_ENV === 'development' && details && { details })
    }
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * Common error codes for consistent client-side error handling
 */
const ERROR_CODES = {
  // File upload errors
  NO_FILE: 'NO_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // Processing errors
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  INVALID_DOCUMENT: 'INVALID_DOCUMENT',

  // Fix application errors
  FIX_NOT_SUPPORTED: 'FIX_NOT_SUPPORTED',
  FIX_APPLICATION_FAILED: 'FIX_APPLICATION_FAILED',
  INVALID_BUFFER: 'INVALID_BUFFER',
  BUFFER_TOO_LARGE: 'BUFFER_TOO_LARGE',

  // Network/System errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  REQUEST_TOO_LARGE: 'REQUEST_TOO_LARGE',
  DOCUMENT_TOO_LARGE: 'DOCUMENT_TOO_LARGE',

  // Validation errors
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_PARAMS: 'INVALID_PARAMS'
};

/**
 * Pre-configured error response functions for common scenarios
 */
const ErrorResponses = {
  noFile: (res, requestId) => sendErrorResponse(res, 400, 'No file uploaded', ERROR_CODES.NO_FILE, null, requestId),

  fileTooLarge: (res, maxSize, requestId) => sendErrorResponse(res, 413,
    `File too large. Maximum size is ${maxSize}`, ERROR_CODES.FILE_TOO_LARGE, null, requestId),

  invalidFileType: (res, allowedTypes, requestId) => sendErrorResponse(res, 400,
    `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, ERROR_CODES.INVALID_FILE_TYPE, null, requestId),

  processingFailed: (res, message, requestId) => sendErrorResponse(res, 500,
    message || 'Document processing failed', ERROR_CODES.PROCESSING_FAILED, null, requestId),

  processingTimeout: (res, requestId) => sendErrorResponse(res, 504,
    'Document processing timed out', ERROR_CODES.PROCESSING_TIMEOUT, null, requestId),

  fixNotSupported: (res, fixAction, requestId) => sendErrorResponse(res, 400,
    `Fix action not supported: ${fixAction}`, ERROR_CODES.FIX_NOT_SUPPORTED, null, requestId),

  invalidBuffer: (res, message, requestId) => sendErrorResponse(res, 400,
    message || 'Invalid document buffer', ERROR_CODES.INVALID_BUFFER, null, requestId),

  missingParams: (res, params, requestId) => sendErrorResponse(res, 400,
    `Missing required parameters: ${params.join(', ')}`, ERROR_CODES.MISSING_PARAMS, null, requestId),

  serverError: (res, message, details, requestId) => sendErrorResponse(res, 500,
    message || 'Internal server error', ERROR_CODES.SERVER_ERROR, details, requestId)
};

module.exports = {
  sendErrorResponse,
  ERROR_CODES,
  ErrorResponses
};