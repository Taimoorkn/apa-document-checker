DO NOT GUESS THINGS, DO NOT  ASSUME THINGS WHEN CODING AND CHECKING CODE, DO NOT MAKE MISTAKES, FACT CHECK YOUR UPDATES, REVISIT CODE AND    
  FILES TO UNDERSTAND THEM WHEN MAKING UPDATES AND WHEN CHECKING YOUR OWN IMPLMENTATIONS, THAT INCLUDES FUNCTION CALLS AND IMPORTS.\
    DO NOT RUSH

THis is my current setup :
APA Document Checker - Technical Summary

  What It Does

  An academic writing assistant that validates Word documents (.docx) against APA 7th edition guidelines. Students and researchers upload their papers and get instant feedback on formatting, citations,
  structure, and writing quality with automated fixes for common issues.

  How It Works

  Document Processing Flow

  1. Upload: User uploads .docx file through web interface
  2. Server Processing: LibreOffice converts document to HTML while preserving rich formatting data
  3. Analysis: Dual-layer validation system checks document:
    - Rule-based: Validates against 50+ specific APA requirements
    - AI-powered: Analyzes content quality and academic tone (optional)
  4. Interactive Feedback: Issues displayed in categorized panels with clickable highlighting
  5. Auto-Fix: One-click fixes for common formatting issues by modifying the original document

  Tech Stack & Libraries

  Frontend (Next.js 15)

  Core Framework
  - next (15.5.0) - React framework with SSR and routing
  - react (19.1.0) + react-dom (19.1.0) - UI library and DOM rendering

  State Management & Utils
  - zustand (5.0.8) - Lightweight state management for document store
  - uuid (11.1.0) - Unique ID generation for issues and components
  - lucide-react (0.541.0) - Modern icon library for UI elements

  Styling & UI
  - tailwindcss (3.4.16) - Utility-first CSS framework
  - autoprefixer (10.4.21) + postcss (8.4.49) - CSS processing and vendor prefixes
  - Custom CSS animations for issue highlighting and transitions

  Backend (Express.js)

  Core Server
  - express (4.21.2) - Web application framework
  - cors (2.8.5) - Cross-origin resource sharing configuration
  - helmet (7.2.0) - Security middleware for HTTP headers

  Document Processing
  - libreoffice-convert (1.6.1) - LibreOffice integration for DOCX→HTML conversion
  - multer (1.4.5-lts.1) - Multipart form data handling for file uploads
  - jszip (3.10.1) + pizzip (3.2.0) - ZIP file manipulation for DOCX structure
  - xml2js (0.6.2) - XML parsing for document formatting extraction
  - @xmldom/xmldom (0.8.11) - XML DOM manipulation
  - node-html-parser (6.1.13) - HTML parsing and manipulation

  Text Analysis
  - natural (6.12.0) - Natural language processing for content analysis

  Development & Build Tools

  Development Server
  - concurrently (8.2.2) - Run frontend and backend simultaneously
  - nodemon (3.1.10) - Auto-restart server on changes

  Code Quality
  - eslint (9) + eslint-config-next (15.5.0) - Code linting with Next.js rules
  - @eslint/eslintrc (3) - ESLint configuration compatibility

  Type Definitions (Development)
  - @types/multer (1.4.13) - TypeScript definitions for Multer
  - @types/xml2js (0.4.14) - TypeScript definitions for XML parsing

  Analysis Engine

  APA Validation
  - Custom EnhancedAPAAnalyzer class with 50+ APA 7th edition rules
  - Real-time DOM manipulation for issue highlighting
  - Formatting analysis using extracted DOCX XML data

  AI Enhancement (Optional)
  - Groq AI API integration for content quality analysis
  - Academic tone and clarity assessment
  - Context-aware citation verification
  - Smart fix suggestions with examples

  Key Features by Library

  - Document Upload: multer handles secure file validation and storage
  - Rich Formatting: libreoffice-convert preserves exact document formatting
  - DOCX Manipulation: jszip/pizzip enable real-time document fixes
  - XML Processing: xml2js + @xmldom/xmldom extract formatting metadata
  - State Management: zustand manages complex document analysis state
  - UI Interactions: lucide-react icons + custom CSS animations
  - Cross-Platform: cors + helmet ensure secure API communication
  - Development: concurrently + nodemon enable hot reloading workflow