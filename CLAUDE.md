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
- **Document Processing**: Client-side Slate.js editing with server-side XML processing

### Backend (Express)
- **Server**: Express.js with security middleware (helmet, cors)
- **Document Processing**: XML-based .docx processing with rich formatting extraction
- **File Handling**: Multer for file uploads with 10MB limit and security validation
- **API Endpoints**: RESTful API under `/api` prefix

### Key Components

**Frontend Components** (`src/components/`):
- `DocumentEditor.js`: Slate.js editor for real-time document editing with highlighting
- `IssuesPanel.js`: Shows categorized APA issues with fix suggestions
- `Header.js`: Upload controls and document statistics
- `ErrorBoundary.js`: Error handling wrapper component

**State Management** (`src/store/`):
- `enhancedDocumentStore.js`: Main Zustand store for document state, issues, and server integration

**Analysis Engine** (`src/utils/`):
- `enhancedApaAnalyzer.js`: Core APA 7th edition validation logic with formatting analysis

**Backend Services** (`server/`):
- `index.js`: Main Express server with middleware configuration
- `routes/docx.js`: Document upload and processing endpoints
- `processors/XmlDocxProcessor.js`: XML-based document format extraction
- `processors/DocxModifier.js`: Document modification for formatting fixes

### Document Processing Flow

1. Client uploads .docx file via `DocumentEditor`
2. File sent to `/api/upload-docx` endpoint with validation
3. Server processes document using XML parsing to extract rich formatting data
4. Client receives processed document data and stores in Zustand
5. `EnhancedAPAAnalyzer` analyzes document against APA standards
6. Issues displayed in categorized panels with fix suggestions
7. User can edit document in real-time using Slate.js editor with live highlighting

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