// server/index.js - Fixed router import
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for file uploads
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'APA Document Checker Server'
  });
});

// Import and use document processing routes - FIXED
const docxRoutes = require('./routes/docx');
app.use('/api', docxRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  
  // Handle multer errors (file upload errors)
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
      error: 'Unexpected file field. Please upload a DOCX file.',
      code: 'UNEXPECTED_FILE'
    });
  }
  
  // Handle other errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  
  console.log(`🚀 APA Document Checker Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📄 Document upload: http://localhost:${PORT}/api/upload-docx`);
  console.log(`🏠 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');  
  process.exit(0);
});

module.exports = app;

// server/routes/docx.js - Ensure proper router export
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const DocxProcessor = require('../processors/DocxProcessor');

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

// Initialize DOCX processor
const docxProcessor = new DocxProcessor();

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
    
    // Process the document
    console.log('Starting document processing...');
    const startTime = Date.now();
    
    const result = await docxProcessor.processDocument(filePath);
    
    const processingTime = Date.now() - startTime;
    console.log(`Document processing completed in ${processingTime}ms`);
    
    // Add processing metadata
    result.processingInfo = {
      ...result.processingInfo,
      processingTime: processingTime,
      originalFilename: req.file.originalname,
      fileSize: req.file.size
    };
    
    // Validate processing results
    if (!result.text || !result.html) {
      throw new Error('Document processing produced incomplete results');
    }
    
    // Clean up uploaded file
    await fs.unlink(filePath);
    filePath = null; // Mark as cleaned up
    
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
 * GET /api/processing-status
 * Health check for document processing capabilities
 */
router.get('/processing-status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    capabilities: {
      docxProcessing: true,
      formattingExtraction: true,
      structureAnalysis: true,
      apaCompliance: true
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