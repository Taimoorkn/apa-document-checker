// server/routes/docx.js - Enhanced with dual pipeline processing
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const LibreOfficeProcessor = require('../processors/LibreOfficeProcessor');
const DocxProcessor = require('../processors/DocxProcessor');
const DocxModifier = require('../processors/DocxModifier');
const DualProcessor = require('../processors/DualProcessor');
const cacheService = require('../services/CacheService');

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
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// Initialize processors
const libreOfficeProcessor = new LibreOfficeProcessor();
const docxProcessor = new DocxProcessor();
const docxModifier = new DocxModifier();
const dualProcessor = new DualProcessor(libreOfficeProcessor);

/**
 * POST /api/upload-docx
 * Upload and process a DOCX file with dual pipeline
 */
router.post('/upload-docx', upload.single('document'), async (req, res) => {
  let filePath = null;
  
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    filePath = req.file.path;
    console.log(`📄 Processing uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Read file buffer
    const fileBuffer = await fs.readFile(filePath);
    
    // Validate DOCX file
    if (!isValidDocxFile(fileBuffer)) {
      throw new Error('File is not a valid DOCX document');
    }
    
    // Generate cache key
    const cacheKey = cacheService.generateKey(fileBuffer);
    
    // Check cache first
    let cachedResult = await cacheService.get(cacheKey);
    
    if (cachedResult) {
      console.log('✨ Returning cached result');
      
      // Clean up uploaded file
      await fs.unlink(filePath);
      filePath = null;
      
      return res.json({
        success: true,
        documentId: cachedResult.documentHash,
        display: cachedResult.display,
        analysis: cachedResult.analysis,
        cached: true,
        processingInfo: {
          ...cachedResult.processingInfo,
          fromCache: true
        }
      });
    }
    
    // Process with dual pipeline (parallel processing)
    console.log('🚀 Starting dual pipeline processing...');
    const startTime = Date.now();
    
    const result = await dualProcessor.processDocument(fileBuffer, req.file.originalname);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Dual pipeline completed in ${processingTime}ms`);
    
    // Cache the result
    await cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    
    // Clean up uploaded file
    await fs.unlink(filePath);
    filePath = null;
    
    // Return structured response
    res.json({
      success: true,
      documentId: result.documentHash,
      display: result.display,
      analysis: result.analysis,
      processingInfo: result.processingInfo
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
  try {
    // Parse JSON body manually if needed
    let requestData;
    if (req.is('multipart/form-data')) {
      // Handle multipart data (document buffer + metadata)
      requestData = {
        fixAction: req.body.fixAction,
        fixValue: req.body.fixValue,
        originalFilename: req.body.originalFilename
      };
    } else {
      // Handle JSON data with base64 document
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
    if (!docxModifier.isFixSupported(fixAction)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported fix action: ${fixAction}`,
        code: 'UNSUPPORTED_FIX'
      });
    }
    
    console.log(`🔧 Applying fix: ${fixAction} to document buffer`);
    
    // Convert base64 to buffer if needed
    let docxBuffer;
    if (typeof documentBuffer === 'string') {
      docxBuffer = Buffer.from(documentBuffer, 'base64');
    } else {
      docxBuffer = Buffer.from(documentBuffer);
    }
    
    // Apply the fix using DocxModifier (memory-based)
    const modificationResult = await docxModifier.applyFormattingFix(
      docxBuffer,
      fixAction, 
      fixValue
    );
    
    if (!modificationResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to apply fix: ${modificationResult.error}`,
        code: 'FIX_APPLICATION_FAILED'
      });
    }
    
    console.log(`✅ Fix applied successfully, reprocessing document...`);
    
    // Reprocess the modified document buffer
    let reprocessingResult;
    const startTime = Date.now();
    
    try {
      // Try LibreOffice first, fallback to Mammoth
      console.log('Reprocessing with LibreOffice...');
      reprocessingResult = await libreOfficeProcessor.processDocumentBuffer(modificationResult.buffer, originalFilename || 'document.docx');
    } catch (libreOfficeError) {
      console.log('LibreOffice failed, falling back to Mammoth:', libreOfficeError.message);
      reprocessingResult = await docxProcessor.processDocumentBuffer(modificationResult.buffer);
      reprocessingResult.processingInfo = reprocessingResult.processingInfo || {};
      reprocessingResult.processingInfo.processor = 'Mammoth (LibreOffice fallback)';
      reprocessingResult.processingInfo.fallback = true;
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Document reprocessing completed in ${processingTime}ms`);
    
    // Add processing metadata
    reprocessingResult.processingInfo = {
      ...reprocessingResult.processingInfo,
      processingTime: processingTime,
      originalFilename: originalFilename || 'unknown.docx',
      fixApplied: fixAction,
      fixValue: fixValue
    };
    
    // Return the reprocessed document with the modified buffer for further fixes
    res.json({
      success: true,
      document: reprocessingResult,
      modifiedDocumentBuffer: modificationResult.buffer.toString('base64'), // For next fix iteration
      fixApplied: fixAction,
      message: `Successfully applied ${fixAction} and reprocessed document`
    });
    
  } catch (error) {
    console.error('Error in apply-fix route:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to apply fix to document',
      code: 'APPLY_FIX_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/processing-status
 * Health check for document processing capabilities
 */
router.get('/processing-status', async (req, res) => {
  // Check LibreOffice availability
  let libreOfficeAvailable = false;
  let libreOfficeError = null;
  
  try {
    await libreOfficeProcessor.checkLibreOfficeAvailability();
    libreOfficeAvailable = true;
  } catch (error) {
    libreOfficeError = error.message;
  }
  
  // Check cache status
  const cacheStats = await cacheService.getStats();
  
  res.json({
    success: true,
    status: 'operational',
    capabilities: {
      docxProcessing: true,
      dualPipeline: true, // NEW
      parallelProcessing: true, // NEW
      libreOfficeProcessing: libreOfficeAvailable,
      mammothFallback: true,
      formattingExtraction: true,
      structureAnalysis: true,
      apaCompliance: true
    },
    processors: {
      dualProcessor: { // NEW
        available: true,
        description: 'Parallel processing for display and analysis'
      },
      libreOffice: {
        available: libreOfficeAvailable,
        error: libreOfficeError,
        primary: libreOfficeAvailable
      },
      mammoth: {
        available: true,
        primary: !libreOfficeAvailable,
        fallback: true
      },
      pizzip: { // NEW
        available: true,
        description: 'Fast XML extraction for analysis'
      }
    },
    cache: cacheStats, // NEW
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