// api/upload-docx.js
const docxRoutes = require('../server/routes/docx');
const express = require('express');
const cors = require('cors');

const app = express();

// Add middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Use docx routes
app.use('/', docxRoutes);

module.exports = app;