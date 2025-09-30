// server/workers/documentProcessor.worker.js - Worker thread for document processing
const { parentPort } = require('worker_threads');
const XmlDocxProcessor = require('../processors/XmlDocxProcessor');
const DocxModifier = require('../processors/DocxModifier');

// Initialize processors
const xmlProcessor = new XmlDocxProcessor();
const docxModifier = new DocxModifier();

// Track processing for logging
let jobsProcessed = 0;

console.log(`🔧 Document processor worker initialized (PID: ${process.pid})`);

/**
 * Listen for messages from main thread
 */
parentPort.on('message', async (message) => {
  const { jobId, type, data } = message;
  const startTime = Date.now();

  console.log(`📥 Worker received job ${jobId} (type: ${type})`);

  try {
    let result;

    switch (type) {
      case 'upload':
        result = await processUpload(data);
        break;

      case 'fix':
        result = await processFix(data);
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    const processingTime = Date.now() - startTime;
    jobsProcessed++;

    console.log(`✅ Worker completed job ${jobId} in ${processingTime}ms (total processed: ${jobsProcessed})`);

    // Send success response back to main thread
    parentPort.postMessage({
      jobId,
      success: true,
      result,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error(`❌ Worker failed job ${jobId} after ${processingTime}ms:`, error.message);

    // Send error response back to main thread
    parentPort.postMessage({
      jobId,
      success: false,
      error: error.message,
      processingTime
    });
  }
});

/**
 * Process document upload (XML parsing and APA analysis data extraction)
 */
async function processUpload(data) {
  const { buffer, filename } = data;

  console.log(`📄 Processing upload: ${filename} (${buffer.length} bytes)`);

  // Validate input
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid or empty document buffer');
  }

  if (!filename) {
    throw new Error('Filename is required');
  }

  // Process document buffer using XmlDocxProcessor
  const result = await xmlProcessor.processDocumentBuffer(buffer, filename);

  // Validate result
  if (!result || !result.text || !result.html) {
    throw new Error('Document processing returned incomplete data');
  }

  console.log(`✅ Upload processed: ${result.text.length} chars, ${result.formatting?.paragraphs?.length || 0} paragraphs`);

  return {
    document: result,
    stats: {
      textLength: result.text.length,
      htmlLength: result.html.length,
      paragraphCount: result.formatting?.paragraphs?.length || 0,
      wordCount: result.processingInfo?.wordCount || 0
    }
  };
}

/**
 * Process formatting fix application (DOCX modification)
 */
async function processFix(data) {
  const { buffer, fixAction, fixValue, filename } = data;

  console.log(`🔧 Processing fix: ${fixAction} for ${filename}`);

  // Validate input
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid or empty document buffer');
  }

  if (!fixAction) {
    throw new Error('Fix action is required');
  }

  // Apply fix using DocxModifier
  const fixResult = await docxModifier.applyFormattingFix(buffer, fixAction, fixValue);

  if (!fixResult.success) {
    throw new Error(fixResult.error || 'Fix application failed');
  }

  console.log(`✅ Fix applied: ${fixAction}`);

  return {
    modifiedBuffer: fixResult.buffer,
    fixAction,
    success: true
  };
}

/**
 * Handle worker errors
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in worker:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection in worker:', reason);
  process.exit(1);
});

console.log(`✅ Document processor worker ready and listening for jobs`);
