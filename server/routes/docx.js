// server/routes/docx.js - Ensure proper router export
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const XmlDocxProcessor = require('../processors/XmlDocxProcessor');
const DocxModifier = require('../processors/DocxModifier');
const { ErrorResponses, sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');
const healthMonitor = require('../utils/healthMonitor');

// Create router instance - IMPORTANT: This must be the default export
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `document-${uniqueSuffix}${extension}`);
  }
});

// File filter to only allow DOCX files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream' // Some systems send DOCX as octet-stream
  ];
  
  const allowedExtensions = ['.docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit - consistent with frontend validation
    files: 1 // Only one file at a time
  }
});

// Initialize processors - XML-based processing
const xmlDocxProcessor = new XmlDocxProcessor();
const docxModifier = new DocxModifier();

/**
 * POST /api/upload-docx
 * Upload and process a DOCX file
 */
router.post('/upload-docx', upload.single('document'), async (req, res) => {
  const startTime = Date.now();
  let filePath = null;
  
  try {
    // Validate file upload
    if (!req.file) {
      return ErrorResponses.noFile(res);
    }
    
    filePath = req.file.path;
    console.log(`Processing uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // XML-based processing
    
    // Validate file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error('Uploaded file is not readable');
    }
    
    // Additional DOCX validation - check file header
    const fileBuffer = await fs.readFile(filePath);
    if (!isValidDocxFile(fileBuffer)) {
      throw new Error('File is not a valid DOCX document');
    }
    
    // Process the document using XML parser
    console.log('Starting XML-based document processing...');
    const startTime = Date.now();
    
    const result = await xmlDocxProcessor.processDocument(filePath);
    const processorUsed = result.processingInfo?.processor || 'XmlDocxProcessor';
    
    const processingTime = Date.now() - startTime;
    console.log(`Document processing completed in ${processingTime}ms using ${processorUsed}`);
    
    // Add processing metadata
    result.processingInfo = {
      ...result.processingInfo,
      processingTime: processingTime,
      originalFilename: req.file.originalname,
      fileSize: req.file.size
      // No server file path - we're processing in memory only
    };
    
    // Validate processing results
    if (!result.text || !result.html) {
      throw new Error('Document processing produced incomplete results');
    }
    
    // Clean up uploaded file immediately since we're processing in memory
    await fs.unlink(filePath);
    filePath = null; // Mark as cleaned up
    
    // Return success response
    res.json({
      success: true,
      document: result,
      message: 'Document processed successfully'
    });

    // Record successful processing
    const totalProcessingTime = Date.now() - startTime;
    healthMonitor.recordRequest(totalProcessingTime);
    console.log(`✅ Document processed successfully in ${processingTime}ms (total: ${totalProcessingTime}ms)`);

  } catch (error) {
    console.error('Error processing document:', error);
    healthMonitor.recordError(error, 'upload-docx');
    
    // Clean up uploaded file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    // Determine error type and appropriate response
    let statusCode = 500;
    let errorCode = 'PROCESSING_ERROR';
    let errorMessage = 'Failed to process document';
    
    if (error.message.includes('not a valid DOCX')) {
      statusCode = 400;
      errorCode = 'INVALID_FILE';
      errorMessage = 'File is not a valid DOCX document';
    } else if (error.message.includes('DOCX processing failed')) {
      statusCode = 422;
      errorCode = 'PROCESSING_FAILED';
      errorMessage = 'Document could not be processed';
    } else if (error.message.includes('not readable')) {
      statusCode = 400;
      errorCode = 'FILE_UNREADABLE';
      errorMessage = 'Uploaded file could not be read';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/apply-fix
 * Apply a formatting fix to a DOCX document (Memory-based processing)
 */
router.post('/apply-fix', async (req, res) => {
  console.log('🎯 /api/apply-fix endpoint called');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.keys(req.headers));
  console.log('Request content-type:', req.get('content-type'));
  console.log('Request body exists:', !!req.body);
  console.log('Request body size:', JSON.stringify(req.body || {}).length);

  // Memory monitoring
  const initialMemory = process.memoryUsage();
  console.log(`🧠 Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);

  // Request size validation (before processing)
  const contentLength = req.get('content-length');
  if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
    console.warn(`⚠️ Request too large: ${Math.round(parseInt(contentLength) / 1024 / 1024)}MB`);
    return ErrorResponses.fileTooLarge(res, '50MB');
  }
  
  try {
    // Parse JSON body manually if needed
    let requestData;
    
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request body type:', typeof req.body);
    console.log('Is multipart:', req.is('multipart/form-data'));
    
    if (req.is('multipart/form-data')) {
      console.log('📦 Processing multipart form data');
      // Handle multipart data (document buffer + metadata)
      requestData = {
        fixAction: req.body.fixAction,
        fixValue: req.body.fixValue,
        originalFilename: req.body.originalFilename
      };
    } else {
      console.log('📦 Processing JSON data');
      // Handle JSON data with base64 document
      requestData = req.body;
    }
    
    console.log('Parsed requestData keys:', Object.keys(requestData || {}));
    
    const { documentBuffer, fixAction, fixValue, originalFilename } = requestData;
    
    // Validate input
    if (!documentBuffer || !fixAction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: documentBuffer and fixAction',
        code: 'MISSING_PARAMS'
      });
    }
    
    // Check if the fix is supported
    if (!docxModifier.isFixSupported(fixAction)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported fix action: ${fixAction}`,
        code: 'UNSUPPORTED_FIX'
      });
    }
    
    console.log(`🔧 Applying fix: ${fixAction} to document buffer`);
    console.log('Fix value:', JSON.stringify(fixValue, null, 2));
    
    // Convert base64 to buffer if needed
    let docxBuffer;
    if (typeof documentBuffer === 'string') {
      try {
        docxBuffer = Buffer.from(documentBuffer, 'base64');
        console.log(`✅ Buffer conversion successful, size: ${docxBuffer.length} bytes`);

        // Validate converted buffer size
        if (docxBuffer.length > 50 * 1024 * 1024) { // 50MB limit
          console.warn(`⚠️ Converted buffer too large: ${Math.round(docxBuffer.length / 1024 / 1024)}MB`);
          return res.status(413).json({
            success: false,
            error: 'Document buffer too large. Maximum file size is 50MB.',
            code: 'BUFFER_TOO_LARGE'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid base64 document buffer: ${error.message}`,
          code: 'INVALID_BUFFER'
        });
      }
    } else {
      docxBuffer = Buffer.from(documentBuffer);

      // Validate buffer size
      if (docxBuffer.length > 50 * 1024 * 1024) { // 50MB limit
        console.warn(`⚠️ Buffer too large: ${Math.round(docxBuffer.length / 1024 / 1024)}MB`);
        return res.status(413).json({
          success: false,
          error: 'Document buffer too large. Maximum file size is 50MB.',
          code: 'BUFFER_TOO_LARGE'
        });
      }
    }
    
    // Monitor memory before heavy processing
    const preProcessingMemory = process.memoryUsage();
    console.log(`🧠 Pre-processing memory: ${Math.round(preProcessingMemory.heapUsed / 1024 / 1024)}MB`);

    // Apply the fix using DocxModifier (memory-based) with timeout protection
    console.log('🔄 Calling DocxModifier.applyFormattingFix...');
    const modificationPromise = docxModifier.applyFormattingFix(
      docxBuffer,
      fixAction,
      fixValue
    );

    // Add timeout protection (60 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Document processing timed out after 60 seconds'));
      }, 60000);
    });

    const modificationResult = await Promise.race([modificationPromise, timeoutPromise]);
    
    console.log('DocxModifier result:', {
      success: modificationResult.success,
      error: modificationResult.error,
      bufferSize: modificationResult.buffer?.length
    });
    
    if (!modificationResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to apply fix: ${modificationResult.error}`,
        code: 'FIX_APPLICATION_FAILED',
        details: {
          fixAction,
          fixValue,
          originalError: modificationResult.error
        }
      });
    }
    
    console.log(`✅ Fix applied successfully, reprocessing document...`);
    
    // Monitor memory after modification
    const postModificationMemory = process.memoryUsage();
    console.log(`🧠 Post-modification memory: ${Math.round(postModificationMemory.heapUsed / 1024 / 1024)}MB`);

    // Reprocess the modified document buffer using XML processor
    console.log('Reprocessing with XML processor...');
    const startTime = Date.now();

    const reprocessingResult = await xmlDocxProcessor.processDocumentBuffer(modificationResult.buffer, originalFilename || 'document.docx');

    const processingTime = Date.now() - startTime;
    console.log(`Document reprocessing completed in ${processingTime}ms`);

    // Monitor final memory usage
    const finalMemory = process.memoryUsage();
    const memoryUsed = Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024);
    console.log(`🧠 Final memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB (+${memoryUsed}MB)`);

    // Add processing metadata
    reprocessingResult.processingInfo = {
      ...reprocessingResult.processingInfo,
      processingTime: processingTime,
      originalFilename: originalFilename || 'unknown.docx',
      fixApplied: fixAction,
      fixValue: fixValue,
      memoryUsage: {
        initial: Math.round(initialMemory.heapUsed / 1024 / 1024),
        peak: Math.round(finalMemory.heapUsed / 1024 / 1024),
        delta: memoryUsed
      }
    };

    // Return the reprocessed document with the modified buffer for further fixes
    res.json({
      success: true,
      document: reprocessingResult,
      modifiedDocumentBuffer: modificationResult.buffer.toString('base64'), // For next fix iteration
      fixApplied: fixAction,
      message: `Successfully applied ${fixAction} and reprocessed document`
    });

    // Force garbage collection if available
    if (global.gc) {
      console.log('🗑️ Running garbage collection...');
      global.gc();
    }
    
  } catch (error) {
    console.error('❌ Critical error in apply-fix route:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });

    // Monitor memory on error
    const errorMemory = process.memoryUsage();
    console.log(`🧠 Error memory usage: ${Math.round(errorMemory.heapUsed / 1024 / 1024)}MB`);

    // Force garbage collection on error to free memory
    if (global.gc) {
      console.log('🗑️ Running garbage collection after error...');
      global.gc();
    }

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to apply fix to document';
    let errorCode = 'APPLY_FIX_ERROR';

    if (error.message.includes('timed out')) {
      statusCode = 504;
      errorMessage = 'Request timed out while processing document';
      errorCode = 'PROCESSING_TIMEOUT';
    } else if (error.message.includes('too large') || error.message.includes('ENOMEM')) {
      statusCode = 413;
      errorMessage = 'Document too large to process';
      errorCode = 'DOCUMENT_TOO_LARGE';
    }

    // Ensure we always send a JSON response
    try {
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : undefined
      });
    } catch (responseError) {
      console.error('❌ Failed to send error response:', responseError);
      res.status(500).end('Internal server error');
    }
  }
});

/**
 * GET /api/health
 * Health check endpoint for monitoring server status
 */
router.get('/health', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'ok',
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };

  try {
    // Check XmlDocxProcessor availability
    try {
      const testProcessor = new XmlDocxProcessor();
      healthCheck.services.xmlProcessor = 'healthy';
    } catch (error) {
      healthCheck.services.xmlProcessor = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Check DocxModifier availability
    try {
      const testModifier = new DocxModifier();
      healthCheck.services.docxModifier = 'healthy';
    } catch (error) {
      healthCheck.services.docxModifier = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Check file system access
    try {
      const os = require('os');
      const tempDir = os.tmpdir();
      await require('fs').promises.access(tempDir);
      healthCheck.services.fileSystem = 'healthy';
    } catch (error) {
      healthCheck.services.fileSystem = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Memory health check
    const memoryUsagePercent = (healthCheck.memory.heapUsed / healthCheck.memory.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      healthCheck.status = 'degraded';
      healthCheck.warnings = healthCheck.warnings || [];
      healthCheck.warnings.push('High memory usage detected');
    }

    res.json(healthCheck);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /api/processing-status
 * Health check for document processing capabilities
 */
router.get('/processing-status', async (req, res) => {
  // Check XML processor availability
  let xmlProcessorAvailable = true; // XML processing is always available
  let xmlProcessorError = null;
  
  try {
    // Test basic XML processing capability
    new XmlDocxProcessor();
  } catch (error) {
    xmlProcessorAvailable = false;
    xmlProcessorError = error.message;
  }
  
  res.json({
    success: true,
    status: 'operational',
    capabilities: {
      docxProcessing: xmlProcessorAvailable,
      xmlProcessing: xmlProcessorAvailable,
      formattingExtraction: xmlProcessorAvailable,
      structureAnalysis: xmlProcessorAvailable,
      apaCompliance: xmlProcessorAvailable
    },
    processors: {
      xmlProcessor: {
        available: xmlProcessorAvailable,
        error: xmlProcessorError,
        primary: true,
        required: true
      }
    },
    limits: {
      maxFileSize: '10MB',
      allowedFormats: ['DOCX'],
      processingTimeout: '30s'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Helper function to validate DOCX file
 */
function isValidDocxFile(buffer) {
  try {
    // DOCX files are ZIP archives, so they start with PK (ZIP signature)
    if (buffer.length < 4) return false;
    
    // Check ZIP signature
    const zipSignature = buffer.slice(0, 4);
    const isZip = zipSignature[0] === 0x50 && zipSignature[1] === 0x4B;
    
    if (!isZip) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Error handling middleware specific to this router
 */
router.use((error, req, res, next) => {
  console.error('DOCX Router Error:', error);
  
  // Handle multer-specific errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large (max 10MB)',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        code: 'UNEXPECTED_FILE'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  // Handle file filter errors
  if (error.message === 'Only DOCX files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only DOCX files are allowed',
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to main error handler
  next(error);
});

// IMPORTANT: Export the router properly
module.exports = router;