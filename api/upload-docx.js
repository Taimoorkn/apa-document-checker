// api/upload-docx.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const XmlDocxProcessor = require('../server/processors/XmlDocxProcessor');

// Configure multer for serverless
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream'
    ];
    const allowedExtensions = ['.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Use multer middleware
    const multerMiddleware = upload.single('document');
    
    await new Promise((resolve, reject) => {
      multerMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    console.log(`Processing uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Validate DOCX file
    if (!isValidDocxFile(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        error: 'File is not a valid DOCX document',
        code: 'INVALID_FILE'
      });
    }

    // Process the document using XML parser
    console.log('Starting XML-based document processing...');
    const startTime = Date.now();
    
    const xmlDocxProcessor = new XmlDocxProcessor();
    const result = await xmlDocxProcessor.processDocumentBuffer(req.file.buffer, req.file.originalname);
    
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

    // Return success response
    res.json({
      success: true,
      document: result,
      message: 'Document processed successfully'
    });

  } catch (error) {
    console.error('Error processing document:', error);
    
    let statusCode = 500;
    let errorCode = 'PROCESSING_ERROR';
    let errorMessage = 'Failed to process document';
    
    if (error.message.includes('not a valid DOCX')) {
      statusCode = 400;
      errorCode = 'INVALID_FILE';
      errorMessage = 'File is not a valid DOCX document';
    } else if (error.message.includes('Only DOCX files are allowed')) {
      statusCode = 400;
      errorCode = 'INVALID_FILE_TYPE';
      errorMessage = 'Only DOCX files are allowed';
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
      errorMessage = 'File too large. Maximum size is 10MB.';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

function isValidDocxFile(buffer) {
  try {
    if (buffer.length < 4) return false;
    
    // Check ZIP signature
    const zipSignature = buffer.slice(0, 4);
    const isZip = zipSignature[0] === 0x50 && zipSignature[1] === 0x4B;
    
    return isZip;
  } catch (error) {
    return false;
  }
}