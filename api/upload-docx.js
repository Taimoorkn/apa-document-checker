// api/upload-docx.js
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Import your processors (you'll need to convert them to ES modules)
// For now, we'll use dynamic imports
async function processDocument(filePath) {
  // Dynamic import of your processors
  const { default: XmlDocxProcessor } = await import('../server/processors/XmlDocxProcessor.js');
  
  const processor = new XmlDocxProcessor();
  return await processor.processDocument(filePath);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: ({ mimetype, originalFilename }) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream'
        ];
        const allowedExtensions = ['.docx'];
        const fileExtension = path.extname(originalFilename || '').toLowerCase();
        
        return allowedMimes.includes(mimetype) || allowedExtensions.includes(fileExtension);
      }
    });

    const [fields, files] = await form.parse(req);
    
    if (!files.document || !files.document[0]) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided',
        code: 'NO_FILE'
      });
    }

    const file = files.document[0];
    
    try {
      // Process the document
      const result = await processDocument(file.filepath);
      
      // Clean up the temporary file
      await fs.unlink(file.filepath).catch(() => {});
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (processingError) {
      // Clean up the file on error
      await fs.unlink(file.filepath).catch(() => {});
      
      console.error('Document processing error:', processingError);
      res.status(422).json({
        success: false,
        error: 'Failed to process document',
        message: processingError.message,
        code: 'PROCESSING_ERROR'
      });
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
}