// server/index.js - Compatible with both traditional and Vercel serverless deployment
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;

// Create app instance
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for file uploads
}));

// CORS configuration - Updated for Vercel deployment
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true // Allow all origins in production (Vercel handles this)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple logging for serverless environments
const simpleLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};
app.use(simpleLogger);

// Create uploads directory if it doesn't exist (for local development)
if (process.env.NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, 'uploads');
  fs.mkdir(uploadsDir, { recursive: true }).catch(error =>
    console.error('Failed to create uploads directory:', error)
  );
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'APA Document Checker Server',
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.VERCEL ? 'vercel' : 'traditional'
  });
});

// Import and use document processing routes
const docxRoutes = require('./routes/docx');
app.use('/api', docxRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);

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

// Only start server if not in serverless environment (Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, (err) => {
    if (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }

    console.log(`Server started successfully on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown for traditional deployment
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

module.exports = app;

