// api/apply-fix.js
const XmlDocxProcessor = require('../server/processors/XmlDocxProcessor');
const DocxModifier = require('../server/processors/DocxModifier');

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
    const { documentBuffer, fixAction, fixValue, originalFilename } = req.body;
    
    // Validate input
    if (!documentBuffer || !fixAction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: documentBuffer and fixAction',
        code: 'MISSING_PARAMS'
      });
    }
    
    const docxModifier = new DocxModifier();
    
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
      try {
        docxBuffer = Buffer.from(documentBuffer, 'base64');
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid base64 document buffer: ${error.message}`,
          code: 'INVALID_BUFFER'
        });
      }
    } else {
      docxBuffer = Buffer.from(documentBuffer);
    }
    
    // Apply the fix using DocxModifier
    const modificationResult = await docxModifier.applyFormattingFix(
      docxBuffer,
      fixAction, 
      fixValue
    );
    
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
    
    // Reprocess the modified document buffer
    const xmlDocxProcessor = new XmlDocxProcessor();
    const startTime = Date.now();
    
    const reprocessingResult = await xmlDocxProcessor.processDocumentBuffer(
      modificationResult.buffer, 
      originalFilename || 'document.docx'
    );
    
    const processingTime = Date.now() - startTime;
    
    // Add processing metadata
    reprocessingResult.processingInfo = {
      ...reprocessingResult.processingInfo,
      processingTime: processingTime,
      originalFilename: originalFilename || 'unknown.docx',
      fixApplied: fixAction,
      fixValue: fixValue
    };
    
    // Return the reprocessed document
    res.json({
      success: true,
      document: reprocessingResult,
      modifiedDocumentBuffer: modificationResult.buffer.toString('base64'),
      fixApplied: fixAction,
      message: `Successfully applied ${fixAction} and reprocessed document`
    });
    
  } catch (error) {
    console.error('Error in apply-fix:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to apply fix to document',
      code: 'APPLY_FIX_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
};