// server/routes/docx.js - Ensure proper router export
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const LibreOfficeProcessor = require('../processors/LibreOfficeProcessor');
const DocxProcessor = require('../processors/DocxProcessor');
const DocxModifier = require('../processors/DocxModifier');

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

// Initialize processors - LibreOffice first, Mammoth as fallback
const libreOfficeProcessor = new LibreOfficeProcessor();
const docxProcessor = new DocxProcessor();
const docxModifier = new DocxModifier();

/**
 * POST /api/upload-docx
 * Upload and process a DOCX file
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
    console.log(`Processing uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Check if user wants to force Mammoth processor
    const forceMammoth = req.body.forceMammoth === 'true' || req.query.forceMammoth === 'true';
    
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
    
    // Process the document - try LibreOffice first, fallback to Mammoth
    console.log('Starting document processing...');
    const startTime = Date.now();
    
    let result;
    let processorUsed = 'LibreOffice';
    
    if (forceMammoth) {
      console.log('Using Mammoth processor (forced by request)');
      result = await docxProcessor.processDocument(filePath);
      processorUsed = 'Mammoth (forced)';
    } else {
      try {
        console.log('Attempting LibreOffice processing...');
        result = await libreOfficeProcessor.processDocument(filePath);
        processorUsed = result.processingInfo?.processor || 'LibreOffice';
      } catch (libreOfficeError) {
        console.log('LibreOffice failed, falling back to Mammoth:', libreOfficeError.message);
        result = await docxProcessor.processDocument(filePath);
        processorUsed = 'Mammoth (LibreOffice fallback)';
        
        // Add fallback information to the result
        result.processingInfo = result.processingInfo || {};
        result.processingInfo.processor = processorUsed;
        result.processingInfo.fallback = true;
        result.processingInfo.fallbackReason = libreOfficeError.message;
        result.messages = result.messages || [];
        result.messages.push({
          type: 'warning',
          message: `LibreOffice processing failed (${libreOfficeError.message}), used Mammoth as fallback`
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Document processing completed in ${processingTime}ms using ${processorUsed}`);
    
    // Add processing metadata
    result.processingInfo = {
      ...result.processingInfo,
      processingTime: processingTime,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      serverFilePath: filePath // Include server file path for modifications
    };
    
    // Validate processing results
    if (!result.text || !result.html) {
      throw new Error('Document processing produced incomplete results');
    }
    
    // Keep the original file for potential modifications - don't delete it yet
    // We'll clean it up later or when applying fixes
    // await fs.unlink(filePath);
    // filePath = null; // Mark as cleaned up
    
    // Return success response
    res.json({
      success: true,
      document: result,
      message: 'Document processed successfully'
    });
    
  } catch (error) {
    console.error('Error processing document:', error);
    
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
 * Apply a formatting fix to a DOCX document
 */
router.post('/apply-fix', express.json(), async (req, res) => {
  try {
    const { serverFilePath, fixAction, fixValue, originalFilename } = req.body;
    
    // Validate input
    if (!serverFilePath || !fixAction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: serverFilePath and fixAction',
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
    
    // Validate that the original file still exists
    try {
      await fs.access(serverFilePath, fs.constants.R_OK);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Original document file not found on server',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    console.log(`🔧 Applying fix: ${fixAction} to file: ${path.basename(serverFilePath)}`);
    
    // Create paths for the modified file
    const timestamp = Date.now();
    const fileExt = path.extname(serverFilePath);
    const fileBasename = path.basename(serverFilePath, fileExt);
    const modifiedFilePath = path.join(
      path.dirname(serverFilePath), 
      `${fileBasename}_fixed_${fixAction}_${timestamp}${fileExt}`
    );
    
    // Apply the fix using DocxModifier
    const modificationResult = await docxModifier.applyFormattingFix(
      serverFilePath, 
      modifiedFilePath, 
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
    
    // Reprocess the modified document
    let reprocessingResult;
    const startTime = Date.now();
    
    try {
      // Try LibreOffice first, fallback to Mammoth
      console.log('Reprocessing with LibreOffice...');
      reprocessingResult = await libreOfficeProcessor.processDocument(modifiedFilePath);
    } catch (libreOfficeError) {
      console.log('LibreOffice failed, falling back to Mammoth:', libreOfficeError.message);
      reprocessingResult = await docxProcessor.processDocument(modifiedFilePath);
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
      fixValue: fixValue,
      serverFilePath: modifiedFilePath
    };
    
    // Clean up the temporary modified file after processing
    try {
      await fs.unlink(modifiedFilePath);
    } catch (cleanupError) {
      console.warn('Could not clean up temporary file:', cleanupError.message);
    }
    
    // Return the reprocessed document
    res.json({
      success: true,
      document: reprocessingResult,
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
  
  res.json({
    success: true,
    status: 'operational',
    capabilities: {
      docxProcessing: true,
      libreOfficeProcessing: libreOfficeAvailable,
      mammothFallback: true,
      formattingExtraction: true,
      structureAnalysis: true,
      apaCompliance: true
    },
    processors: {
      libreOffice: {
        available: libreOfficeAvailable,
        error: libreOfficeError,
        primary: libreOfficeAvailable
      },
      mammoth: {
        available: true,
        primary: !libreOfficeAvailable,
        fallback: true
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