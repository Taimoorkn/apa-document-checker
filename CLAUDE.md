# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` - Runs both Next.js frontend (port 3000) and Express backend (port 3001) concurrently
- **Start backend only**: `npm run server` - Runs Express server with nodemon for hot reloading
- **Build production**: `npm run build` - Creates production build of Next.js app
- **Start production**: `npm start` - Starts production Next.js server
- **Lint code**: `npm run lint` - Runs ESLint

## Architecture Overview

This is a full-stack document analysis application that validates academic documents against APA 7th edition guidelines using advanced XML-based processing and Tiptap rich text editing.

### Frontend (Next.js)
- **Framework**: Next.js 15 with React 19, using JavaScript (not TypeScript)
- **Styling**: Tailwind CSS with custom Tiptap-specific styles (`src/styles/tiptap.css`)
- **State Management**: Zustand store (`src/store/enhancedDocumentStore.js`) for document state and issues
- **Rich Text Editor**: Tiptap 3.4.2 with custom extensions for APA compliance and issue highlighting

### Backend (Express)
- **Server**: Express.js with security middleware (helmet v7.2.0, cors v2.8.5)
- **Document Processing**: XML-based .docx processing using PizZip v3.2.0 and xml2js v0.6.2
- **File Handling**: Multer v1.4.5 for file uploads with 50MB limit and security validation
- **API Endpoints**: RESTful API under `/api` prefix with comprehensive error handling

### Key Components

**Frontend Components** (`src/components/`):
- `DocumentEditor.js`: Tiptap editor with real-time APA issue highlighting and formatting controls
- `IssuesPanel.js`: Categorized APA issues display with severity indicators and fix suggestions
- `Header.js`: File upload controls and document statistics
- `ErrorBoundary.js`: Error handling wrapper for graceful failure recovery

**State Management** (`src/store/`):
- `enhancedDocumentStore.js`: Main Zustand store managing document state, processing results, and server integration

**APA Validation Engine** (`src/utils/`):
- `enhancedApaAnalyzer.js`: Core APA 7th edition validation orchestrator
- `referenceValidator.js`: Reference list formatting, alphabetical order, and citation cross-checking
- `advancedCitationValidator.js`: Multi-author citations, et al. rules, and secondary sources
- `tableFigureValidator.js`: Table and figure numbering, formatting, and in-text callouts
- `quotationValidator.js`: Block quotes, inline quotes, and proper citation formatting
- `statisticalValidator.js`: Statistical notation, reporting standards, and data presentation
- `biasFreeLanguageValidator.js`: Inclusive language and bias-free writing validation
- `headerFooterValidator.js`: Running heads, page numbers, and header/footer compliance
- `comprehensiveValidator.js`: Document structure, sections, and overall organization
- `additionalApaRules.js`: Edge cases and supplementary APA style requirements

**Tiptap Integration** (`src/utils/`):
- `tiptapExtensions.js`: Core issue highlighting extension using ProseMirror decorations
- `tiptapFormattingExtensions.js`: Custom paragraph and text formatting preservation
- `tiptapDocumentConverter.js`: DOCX to Tiptap JSON conversion with formatting preservation
- `tiptapIssueHighlighter.js`: Real-time issue highlighting with click handlers

**Backend Services** (`server/`):
- `index.js`: Express server with security middleware and graceful shutdown
- `routes/docx.js`: Document upload, processing, and fix application endpoints
- `processors/XmlDocxProcessor.js`: Comprehensive XML-based DOCX parsing and analysis
- `processors/DocxModifier.js`: Document modification for APA formatting fixes

### Document Processing Flow

1. Client uploads .docx file via Tiptap `DocumentEditor` with drag-and-drop support
2. File sent to `/api/upload-docx` with security validation (file type, size, ZIP signature)
3. Server processes document using `XmlDocxProcessor` with XML parsing for rich formatting extraction
4. Extracted data includes: plain text, HTML, paragraph-level formatting, structure, styles, headers/footers, and italicized text
5. Client receives processed data and converts to Tiptap document format using `TiptapDocumentConverter`
6. `EnhancedAPAAnalyzer` coordinates 9 specialized validators for comprehensive analysis
7. Issues displayed in categorized panels with severity levels and actionable fix suggestions
8. Real-time editing in Tiptap with live issue highlighting via ProseMirror decorations
9. Fix application sends modified content back to server for DOCX structure updates

### APA Analysis Categories

The validation system covers comprehensive APA 7th edition requirements:

- **Document Structure**: Title page, abstract, headings hierarchy, section organization
- **Formatting**: Font (Times New Roman 12pt), spacing (double), margins (1"), paragraph indentation
- **Headers & Footers**: Running heads (50 character limit), page numbering, first page variations
- **Citations**: Parenthetical vs narrative, multi-author rules, et al. formatting, secondary sources
- **References**: Alphabetical ordering, hanging indent, DOI/URL formatting, italicization compliance
- **Tables & Figures**: Numbering sequences, titles/captions, border requirements, in-text callouts
- **Quotations**: Block quote formatting (40+ words), inline quotes, proper citation integration
- **Statistical Content**: Notation standards, effect sizes, confidence intervals, data presentation
- **Language**: Bias-free terminology, inclusive writing, person-first language recommendations

### Development Notes

- Both frontend and backend run simultaneously using `concurrently` for seamless development
- XML-based document processing provides accurate structure and formatting extraction
- Tiptap editor maintains DOCX formatting fidelity through custom extensions
- Modular validator architecture allows independent testing and enhancement of APA rules
- ProseMirror decorations enable non-intrusive issue highlighting without document mutation
- Memory-based document processing with automatic cleanup for security
- Comprehensive error boundaries and graceful degradation throughout the application
- Security measures: helmet middleware, CORS configuration, file validation, size limits (50MB)

### Technical Dependencies

**Core Technologies**:
- Next.js 15.5.0 + React 19.1.0 (Frontend)
- Express 4.21.2 (Backend API)
- Tiptap 3.4.2 (Rich text editing)
- Zustand 5.0.8 (State management)

**Document Processing**:
- PizZip 3.2.0 (ZIP/DOCX handling)
- xml2js 0.6.2 (XML parsing)
- @xmldom/xmldom 0.8.11 (DOM manipulation)
- node-html-parser 6.1.13 (HTML processing)

**Security & Infrastructure**:
- Helmet 7.2.0 (Security headers)
- CORS 2.8.5 (Cross-origin resource sharing)
- Multer 1.4.5 (File upload handling)
- Natural 6.12.0 (Text processing utilities)

**Development Tools**:
- Concurrently 8.2.2 (Parallel process execution)
- Nodemon 3.1.10 (Development server auto-restart)
- ESLint 9 + Next.js config (Code quality)
- Tailwind CSS 3.4.16 + PostCSS (Styling)

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
