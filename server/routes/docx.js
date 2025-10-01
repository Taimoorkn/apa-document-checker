// server/routes/docx.js - Document processing routes with Worker Thread Pool
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const WorkerPool = require('../workers/WorkerPool');

// Create router instance
const router = express.Router();

// Initialize Worker Pool for concurrent document processing
// Pool size from environment variable or default to 4 workers
const WORKER_POOL_SIZE = parseInt(process.env.WORKER_POOL_SIZE) || 4;
const workerScript = path.join(__dirname, '../workers/documentProcessor.worker.js');

let workerPool;

// Initialize worker pool only in non-serverless environments
// Vercel and other serverless platforms don't support worker threads well
if (!process.env.VERCEL) {
  try {
    workerPool = new WorkerPool(WORKER_POOL_SIZE, workerScript);
    console.log(`✅ Worker Pool initialized with ${WORKER_POOL_SIZE} workers`);

    // Graceful shutdown handler
    const shutdownHandler = async () => {
      console.log('Shutting down Worker Pool...');
      if (workerPool) {
        await workerPool.shutdown();
      }
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  } catch (error) {
    console.error('❌ Failed to initialize Worker Pool:', error);
    console.error('⚠️ Falling back to direct processing (no concurrency)');
    workerPool = null;
  }
} else {
  console.log('⚠️ Serverless environment detected - Worker Pool disabled');
  workerPool = null;
}

// Fallback processors for when Worker Pool is not available
const XmlDocxProcessor = require('../processors/XmlDocxProcessor');
const DocxModifier = require('../processors/DocxModifier');
const xmlDocxProcessor = new XmlDocxProcessor();
const docxModifier = new DocxModifier();

// Configure multer for file uploads
const storage = process.env.VERCEL
  ? multer.memoryStorage() // Memory storage for Vercel serverless
  : multer.diskStorage({   // Disk storage for local development
      destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/'));
      },
      filename: (req, file, cb) => {
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
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

/**
 * Validate DOCX file by checking ZIP signature
 */
function isValidDocxFile(buffer) {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // DOCX files are ZIP archives starting with PK signature (0x50 0x4B 0x03 0x04)
  return buffer[0] === 0x50 && buffer[1] === 0x4B &&
         buffer[2] === 0x03 && buffer[3] === 0x04;
}

/**
 * POST /api/upload-docx
 * Upload and process a DOCX file using Worker Pool for concurrent processing
 */
router.post('/upload-docx', upload.single('document'), async (req, res) => {
  const startTime = Date.now();
  let filePath = null;

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please select a DOCX file.',
        code: 'NO_FILE'
      });
    }

    console.log(`📥 Processing uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);

    let fileBuffer;

    // Get file buffer (from memory or disk)
    if (req.file.buffer) {
      // Memory storage (Vercel or explicit memory storage)
      fileBuffer = req.file.buffer;
    } else if (req.file.path) {
      // Disk storage (local development)
      filePath = req.file.path;
      fileBuffer = await fs.readFile(filePath);
    } else {
      throw new Error('Unable to read uploaded file');
    }

    // Validate DOCX file
    if (!isValidDocxFile(fileBuffer)) {
      throw new Error('File is not a valid DOCX document');
    }

    // Process document using Worker Pool if available, otherwise use direct processing
    let result;
    let processingMethod;

    if (workerPool) {
      // ✅ Worker Pool available - process concurrently
      console.log(`🔄 Sending job to Worker Pool (available workers: ${workerPool.getStats().availableWorkers})`);
      processingMethod = 'worker-pool';

      try {
        const workerResult = await workerPool.executeJob({
          type: 'upload',
          data: {
            buffer: fileBuffer,
            filename: req.file.originalname
          }
        }, 60000); // 60 second timeout

        result = workerResult.document;

        console.log(`✅ Worker Pool processing completed`);
        console.log(`📊 Pool stats:`, workerPool.getStats());

      } catch (error) {
        console.error('❌ Worker Pool processing failed:', error.message);

        // If worker pool fails, fall back to direct processing
        console.log('⚠️ Falling back to direct processing');
        processingMethod = 'direct-fallback';
        result = await xmlDocxProcessor.processDocumentBuffer(fileBuffer, req.file.originalname);
      }

    } else {
      // ⚠️ Worker Pool not available - use direct processing
      console.log('📄 Processing directly (no Worker Pool)');
      processingMethod = 'direct';
      result = await xmlDocxProcessor.processDocumentBuffer(fileBuffer, req.file.originalname);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Document processed successfully in ${processingTime}ms (method: ${processingMethod})`);

    // Add processing metadata
    result.processingInfo = {
      ...result.processingInfo,
      processingTime: processingTime,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      processingMethod: processingMethod,
      workerPoolEnabled: !!workerPool,
      serverless: !!process.env.VERCEL,
      platform: process.env.VERCEL ? 'vercel' : 'traditional'
    };

    // Validate processing results
    if (!result.text || !result.html) {
      throw new Error('Document processing produced incomplete results');
    }

    // Clean up uploaded file if it exists (disk storage)
    if (filePath) {
      try {
        await fs.unlink(filePath);
        console.log('🗑️ Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
      }
      filePath = null;
    }

    // Return success response
    res.json({
      success: true,
      document: result,
      message: 'Document processed successfully'
    });

  } catch (error) {
    console.error('❌ Error processing document:', error);

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
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorCode = 'PROCESSING_TIMEOUT';
      errorMessage = 'Document processing timed out';
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
 * Apply a formatting fix to a DOCX document using Worker Pool
 */
router.post('/apply-fix', async (req, res) => {
  console.log('🎯 /api/apply-fix endpoint called');

  // Memory monitoring
  const initialMemory = process.memoryUsage();
  console.log(`🧠 Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);

  // Request size validation
  const contentLength = req.get('content-length');
  if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
    console.warn(`⚠️ Request too large: ${Math.round(parseInt(contentLength) / 1024 / 1024)}MB`);
    return res.status(413).json({
      success: false,
      error: 'Request too large. Maximum size is 50MB.',
      code: 'REQUEST_TOO_LARGE'
    });
  }

  try {
    // Parse request data
    let requestData;

    if (req.is('multipart/form-data')) {
      console.log('📦 Processing multipart form data');
      requestData = {
        fixAction: req.body.fixAction,
        fixValue: req.body.fixValue,
        originalFilename: req.body.originalFilename,
        documentBuffer: req.body.documentBuffer
      };
    } else {
      console.log('📦 Processing JSON data');
      requestData = req.body;
    }

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
    const supportedFixes = [
      'fixFont', 'fixFontSize', 'fixLineSpacing', 'fixMargins', 'fixIndentation',
      'addCitationComma', 'fixParentheticalConnector', 'fixEtAlFormatting',
      'fixReferenceConnector', 'fixAllCapsHeading', 'addPageNumber'
    ];

    if (!supportedFixes.includes(fixAction)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported fix action: ${fixAction}`,
        code: 'UNSUPPORTED_FIX'
      });
    }

    console.log(`🔧 Applying fix: ${fixAction}`);
    console.log(`📋 Fix value:`, fixValue);

    // Convert base64 to buffer if needed
    let docxBuffer;
    if (typeof documentBuffer === 'string') {
      try {
        docxBuffer = Buffer.from(documentBuffer, 'base64');
        console.log(`✅ Buffer conversion successful, size: ${docxBuffer.length} bytes`);

        // Validate converted buffer size
        if (docxBuffer.length > 50 * 1024 * 1024) { // 50MB limit
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
      if (docxBuffer.length > 50 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          error: 'Document buffer too large. Maximum file size is 50MB.',
          code: 'BUFFER_TOO_LARGE'
        });
      }
    }

    // Process fix using Worker Pool if available
    let modificationResult;
    let reprocessingResult;
    let processingMethod;

    if (workerPool) {
      // ✅ Worker Pool available - process concurrently
      console.log(`🔄 Sending fix job to Worker Pool`);
      processingMethod = 'worker-pool';

      try {
        // Step 1: Apply fix via worker
        const fixResult = await workerPool.executeJob({
          type: 'fix',
          data: {
            buffer: docxBuffer,
            fixAction: fixAction,
            fixValue: fixValue,
            filename: originalFilename || 'document.docx'
          }
        }, 60000); // 60 second timeout

        const modifiedBuffer = fixResult.modifiedBuffer;
        console.log(`✅ Fix applied successfully, reprocessing document...`);

        // Step 2: Reprocess the modified document via worker
        const reprocessResult = await workerPool.executeJob({
          type: 'upload',
          data: {
            buffer: modifiedBuffer,
            filename: originalFilename || 'document.docx'
          }
        }, 60000);

        reprocessingResult = reprocessResult.document;
        modificationResult = { success: true, buffer: modifiedBuffer };

        console.log(`✅ Worker Pool fix processing completed`);

      } catch (error) {
        console.error('❌ Worker Pool fix processing failed:', error.message);

        // Fall back to direct processing
        console.log('⚠️ Falling back to direct processing');
        processingMethod = 'direct-fallback';

        modificationResult = await docxModifier.applyFormattingFix(docxBuffer, fixAction, fixValue);

        if (!modificationResult.success) {
          return res.status(500).json({
            success: false,
            error: `Failed to apply fix: ${modificationResult.error}`,
            code: 'FIX_APPLICATION_FAILED'
          });
        }

        reprocessingResult = await xmlDocxProcessor.processDocumentBuffer(
          modificationResult.buffer,
          originalFilename || 'document.docx'
        );
      }

    } else {
      // ⚠️ Worker Pool not available - use direct processing
      console.log('🔧 Processing fix directly (no Worker Pool)');
      processingMethod = 'direct';

      // Apply fix
      modificationResult = await docxModifier.applyFormattingFix(docxBuffer, fixAction, fixValue);

      if (!modificationResult.success) {
        return res.status(500).json({
          success: false,
          error: `Failed to apply fix: ${modificationResult.error}`,
          code: 'FIX_APPLICATION_FAILED'
        });
      }

      // Reprocess document
      reprocessingResult = await xmlDocxProcessor.processDocumentBuffer(
        modificationResult.buffer,
        originalFilename || 'document.docx'
      );
    }

    // Monitor memory usage
    const finalMemory = process.memoryUsage();
    const memoryUsed = Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024);
    console.log(`🧠 Final memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB (+${memoryUsed}MB)`);

    // Add processing metadata
    reprocessingResult.processingInfo = {
      ...reprocessingResult.processingInfo,
      originalFilename: originalFilename || 'unknown.docx',
      fixApplied: fixAction,
      fixValue: fixValue,
      processingMethod: processingMethod,
      workerPoolEnabled: !!workerPool,
      memoryUsage: {
        initial: Math.round(initialMemory.heapUsed / 1024 / 1024),
        peak: Math.round(finalMemory.heapUsed / 1024 / 1024),
        delta: memoryUsed
      }
    };

    // Ensure buffer is properly converted to base64 string
    const bufferToConvert = Buffer.isBuffer(modificationResult.buffer)
      ? modificationResult.buffer
      : Buffer.from(modificationResult.buffer);

    const base64String = bufferToConvert.toString('base64');
    console.log(`📦 Buffer converted to base64, length: ${base64String.length}`);

    // Return the reprocessed document with the modified buffer
    res.json({
      success: true,
      document: reprocessingResult,
      modifiedDocumentBuffer: base64String,
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

    // Monitor memory on error
    const errorMemory = process.memoryUsage();
    console.log(`🧠 Error memory usage: ${Math.round(errorMemory.heapUsed / 1024 / 1024)}MB`);

    // Force garbage collection on error
    if (global.gc) {
      console.log('🗑️ Running garbage collection after error...');
      global.gc();
    }

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to apply fix to document';
    let errorCode = 'APPLY_FIX_ERROR';

    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timed out while processing document';
      errorCode = 'PROCESSING_TIMEOUT';
    } else if (error.message.includes('too large') || error.message.includes('ENOMEM')) {
      statusCode = 413;
      errorMessage = 'Document too large to process';
      errorCode = 'DOCUMENT_TOO_LARGE';
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
 * POST /api/process-document
 * Process a document from Supabase Storage
 * Triggered after user uploads to Supabase
 */
router.post('/process-document', async (req, res) => {
  console.log('📥 Processing document from Supabase Storage');

  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing documentId',
        code: 'MISSING_PARAMETERS'
      });
    }

    // Import Supabase client
    const supabase = require('../utils/supabaseClient');

    // Extract and verify JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED'
      });
    }

    console.log(`🔐 Authenticated user: ${user.id}`);

    // Fetch document metadata from database
    // Now using verified user.id instead of trusting request body
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);

      return res.status(500).json({
        success: false,
        error: 'Failed to download document from storage',
        code: 'DOWNLOAD_ERROR'
      });
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Validate DOCX file
    if (!isValidDocxFile(fileBuffer)) {
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);

      return res.status(400).json({
        success: false,
        error: 'Invalid DOCX file format',
        code: 'INVALID_DOCX'
      });
    }

    // Process document via Worker Pool or direct processing
    let result;
    let processingMethod;

    if (workerPool) {
      console.log(`🔄 Sending job to Worker Pool for document ${documentId}`);
      processingMethod = 'worker-pool';

      try {
        const workerResult = await workerPool.executeJob({
          type: 'upload',
          data: { buffer: fileBuffer, filename: document.filename }
        }, 60000);
        result = workerResult.document;
      } catch (error) {
        console.log('⚠️ Falling back to direct processing');
        processingMethod = 'direct-fallback';
        result = await xmlDocxProcessor.processDocumentBuffer(fileBuffer, document.filename);
      }
    } else {
      console.log('📄 Processing directly (Worker Pool not available)');
      processingMethod = 'direct';
      result = await xmlDocxProcessor.processDocumentBuffer(fileBuffer, document.filename);
    }

    // Store document data without analysis - frontend will run full analysis when loaded
    console.log('📦 Storing document data (analysis will run on frontend)');
    const issues = [];
    const complianceScore = null;
    const issueCount = 0;

    // Store analysis results
    const { error: insertError } = await supabase
      .from('analysis_results')
      .insert({
        document_id: documentId,
        compliance_score: complianceScore,
        issue_count: issueCount,
        issues: issues,
        document_data: result
      });

    if (insertError) {
      console.error('Failed to save analysis results:', insertError);
    }

    // Update document status to completed
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    console.log(`✅ Document ${documentId} processed successfully`);

    res.json({
      success: true,
      documentId,
      processingMethod,
      complianceScore,
      issueCount
    });

  } catch (error) {
    console.error('❌ Error processing document:', error);

    // Try to update document status to failed
    try {
      const { documentId } = req.body;
      if (documentId) {
        const supabase = require('../utils/supabaseClient');
        await supabase
          .from('documents')
          .update({ status: 'failed' })
          .eq('id', documentId);
      }
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process document',
      code: 'PROCESSING_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/worker-stats
 * Get Worker Pool statistics (for monitoring/debugging)
 */
router.get('/worker-stats', (req, res) => {
  if (!workerPool) {
    return res.json({
      enabled: false,
      message: 'Worker Pool is not enabled (serverless environment or initialization failed)'
    });
  }

  const stats = workerPool.getStats();
  res.json({
    enabled: true,
    stats: stats
  });
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.',
      code: 'FILE_TOO_LARGE'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file. Please upload only one DOCX file.',
      code: 'UNEXPECTED_FILE'
    });
  }

  if (error.message.includes('multer')) {
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

/**
 * POST /api/save-edits - DEPRECATED ENDPOINT
 * This endpoint is deprecated and will be removed in a future version.
 *
 * NEW ARCHITECTURE:
 * - Manual edits are now saved as Tiptap JSON directly to Supabase (client-side)
 * - No server-side DOCX manipulation for edits
 * - DOCX is generated fresh on export only (see /api/export-docx)
 *
 * This stub returns an error to guide developers to the new approach.
 */
router.post('/save-edits', async (req, res, next) => {
  // ENDPOINT DEPRECATED - Return error with migration guidance
  console.warn('⚠️ DEPRECATED: /api/save-edits endpoint called');

  res.status(410).json({
    success: false,
    error: 'This endpoint is deprecated.',
    deprecated: true,
    message: 'Manual edits are now saved as Tiptap JSON directly to Supabase (client-side). This endpoint is no longer needed.',
    migration: {
      oldFlow: 'Client → /api/save-edits → DOCX manipulation → Supabase',
      newFlow: 'Client → Supabase (tiptap_content column)',
      clientMethod: 'documentService.autoSaveDocument() - saves JSON directly',
      exportMethod: 'Use /api/export-docx to generate DOCX from JSON when needed'
    },
    code: 'ENDPOINT_DEPRECATED'
  });
});

// Export the router and worker pool for health check access
module.exports = router;
module.exports.workerPool = workerPool;
