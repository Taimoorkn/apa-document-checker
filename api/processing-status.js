// api/processing-status.js
const XmlDocxProcessor = require('../server/processors/XmlDocxProcessor');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Check XML processor availability
  let xmlProcessorAvailable = true;
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
};