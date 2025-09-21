// Client-side error handling utilities for consistent error processing

/**
 * Extract error message from various error response formats
 * @param {Object|Error|string} error - Error object or response
 * @returns {string} - Standardized error message
 */
export function extractErrorMessage(error) {
  // Handle API response errors
  if (error?.error?.message) {
    return error.error.message;
  }

  // Handle legacy format
  if (error?.error && typeof error.error === 'string') {
    return error.error;
  }

  // Handle JavaScript Error objects
  if (error?.message) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Extract error code from error response
 * @param {Object|Error} error - Error object or response
 * @returns {string|null} - Error code if available
 */
export function extractErrorCode(error) {
  return error?.error?.code || error?.code || null;
}

/**
 * Get user-friendly error message based on error code
 * @param {Object|Error|string} error - Error object or response
 * @returns {string} - User-friendly error message
 */
export function getUserFriendlyMessage(error) {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error);

  // Map error codes to user-friendly messages
  const friendlyMessages = {
    'NO_FILE': 'Please select a document to upload.',
    'FILE_TOO_LARGE': 'The selected file is too large. Please choose a smaller document.',
    'INVALID_FILE_TYPE': 'Please upload a valid .docx file.',
    'PROCESSING_FAILED': 'Failed to process the document. Please try again.',
    'PROCESSING_TIMEOUT': 'Document processing is taking longer than expected. Please try again with a smaller document.',
    'FIX_NOT_SUPPORTED': 'This fix is not currently supported.',
    'FIX_APPLICATION_FAILED': 'Failed to apply the fix. Please try again.',
    'INVALID_BUFFER': 'The document appears to be corrupted. Please try uploading again.',
    'BUFFER_TOO_LARGE': 'The document is too large to process. Please use a smaller document.',
    'NETWORK_ERROR': 'Network connection issue. Please check your internet connection and try again.',
    'SERVER_ERROR': 'Server is temporarily unavailable. Please try again in a few moments.',
    'REQUEST_TOO_LARGE': 'The request is too large. Please try with a smaller document.',
    'DOCUMENT_TOO_LARGE': 'The document is too large to process. Maximum size is 50MB.',
    'MISSING_PARAMS': 'Required information is missing. Please try again.',
    'INVALID_PARAMS': 'Invalid request parameters. Please try again.'
  };

  return friendlyMessages[code] || message || 'An unexpected error occurred';
}

/**
 * Check if error is retryable based on error code
 * @param {Object|Error} error - Error object or response
 * @returns {boolean} - Whether the error is retryable
 */
export function isRetryableError(error) {
  const code = extractErrorCode(error);
  const retryableCodes = [
    'NETWORK_ERROR',
    'SERVER_ERROR',
    'PROCESSING_TIMEOUT'
  ];

  return retryableCodes.includes(code);
}

/**
 * Check if error indicates a client-side issue (user fixable)
 * @param {Object|Error} error - Error object or response
 * @returns {boolean} - Whether the error is client-side
 */
export function isClientError(error) {
  const code = extractErrorCode(error);
  const clientCodes = [
    'NO_FILE',
    'FILE_TOO_LARGE',
    'INVALID_FILE_TYPE',
    'DOCUMENT_TOO_LARGE',
    'BUFFER_TOO_LARGE',
    'MISSING_PARAMS',
    'INVALID_PARAMS'
  ];

  return clientCodes.includes(code);
}

/**
 * Format error for logging
 * @param {Object|Error} error - Error object or response
 * @param {string} context - Context where error occurred
 * @returns {Object} - Formatted error for logging
 */
export function formatErrorForLogging(error, context) {
  return {
    context,
    message: extractErrorMessage(error),
    code: extractErrorCode(error),
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...(error?.error?.details && { details: error.error.details }),
    ...(error?.stack && { stack: error.stack })
  };
}

/**
 * Standardized error handling for API responses
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} - Parsed error object
 */
export async function handleApiError(response) {
  let errorData;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else {
      const text = await response.text();
      errorData = {
        error: {
          message: text || `HTTP ${response.status}: ${response.statusText}`,
          code: 'SERVER_ERROR',
          statusCode: response.status
        }
      };
    }
  } catch (parseError) {
    errorData = {
      error: {
        message: `Failed to parse error response: ${response.status} ${response.statusText}`,
        code: 'SERVER_ERROR',
        statusCode: response.status
      }
    };
  }

  return errorData;
}

export default {
  extractErrorMessage,
  extractErrorCode,
  getUserFriendlyMessage,
  isRetryableError,
  isClientError,
  formatErrorForLogging,
  handleApiError
};