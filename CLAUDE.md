# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` - Runs both Next.js frontend (port 3000) and Express backend (port 3001) concurrently
- **Start backend only**: `npm run server` - Runs Express server with nodemon for hot reloading
- **Build production**: `npm run build` - Creates production build of Next.js app
- **Start production**: `npm start` - Starts production Next.js server
- **Lint code**: `npm run lint` - Runs ESLint with Next.js configuration

## Architecture Overview

This is a full-stack document analysis application that validates academic documents against APA 7th edition guidelines.

### Frontend (Next.js)
- **Framework**: Next.js 15 with React 19, using JavaScript (not TypeScript)
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand stores for document and UI state
- **Document Processing**: Client-side analysis with Mammoth.js for .docx parsing

### Backend (Express)
- **Server**: Express.js with security middleware (helmet, cors)
- **Document Processing**: Server-side .docx processing with rich formatting extraction
- **File Handling**: Multer for file uploads with 10MB limit and security validation
- **API Endpoints**: RESTful API under `/api` prefix

### Key Components

**Frontend Components** (`src/components/`):
- `DocumentViewer.js`: Displays uploaded documents with highlighted issues
- `IssuesPanel.js`: Shows categorized APA issues with fix suggestions
- `AnalysisSettings.js`: Configuration options for analysis
- `Header.js`: Upload controls and document statistics

**State Management** (`src/store/`):
- `enhancedDocumentStore.js`: Main Zustand store for document state, issues, and server integration
- `documentStore.js`: Legacy store (may be deprecated)

**Analysis Engine** (`src/utils/`):
- `enhancedApaAnalyzer.js`: Core APA 7th edition validation logic with formatting analysis

**Backend Services** (`server/`):
- `index.js`: Main Express server with middleware configuration
- `routes/docx.js`: Document upload and processing endpoints
- `processors/DocxProcessor.js`: Rich document format extraction

### Document Processing Flow

1. Client uploads .docx file via `DocumentViewer`
2. File sent to `/api/upload-docx` endpoint with validation
3. Server extracts rich formatting data (fonts, spacing, structure)
4. Client receives processed document data and stores in Zustand
5. `EnhancedAPAAnalyzer` analyzes document against APA standards
6. Issues displayed in categorized panels with fix suggestions

### APA Analysis Categories

The analyzer validates:
- **Formatting**: Font (Times New Roman 12pt), spacing (double), margins (1"), indentation
- **Structure**: Title page, abstract, headings hierarchy, page numbering
- **Citations**: In-text citation format, parenthetical citations, author handling
- **References**: Alphabetical ordering, formatting standards
- **Content**: Academic writing style, APA-specific requirements

### Development Notes

- Both frontend and backend run simultaneously during development
- Document uploads are processed on the server for rich formatting extraction
- Client-side analysis provides real-time feedback
- Error boundaries handle processing failures gracefully
- Security measures include file type validation, size limits, and CORS configuration