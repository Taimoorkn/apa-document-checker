# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` - Runs both Next.js frontend (port 3000) and Express backend (port 3001) concurrently
- **Start backend only**: `npm run server` - Runs Express server with nodemon for hot reloading
- **Build production**: `npm run build` - Creates production build of Next.js app
- **Start production**: `npm start` - Starts production Next.js server
- **Lint code**: `npm run lint` - Runs ESLint

## Architecture Overview

This is a sophisticated full-stack document analysis application that validates academic documents against APA 7th edition guidelines using advanced XML-based processing and Tiptap rich text editing with real-time issue highlighting.

### Frontend Architecture (Next.js)
- **Framework**: Next.js 15 with React 19, using JavaScript (not TypeScript)
- **App Router**: Uses Next.js App Router with layout.js and page.js structure
- **Styling**: Tailwind CSS 3.4.16 with custom Tiptap-specific styles (`src/styles/tiptap.css`)
- **State Management**: Multiple specialized Zustand stores for different concerns
- **Rich Text Editor**: Tiptap 3.4.2 with custom extensions for APA compliance and real-time issue highlighting
- **Error Handling**: Multi-layered error boundaries for graceful degradation

### Backend Architecture (Express)
- **Server**: Express 4.21.2 with security middleware (helmet v7.2.0, cors v2.8.5)
- **Document Processing**: XML-based .docx processing using PizZip v3.2.0 and xml2js v0.6.2
- **File Handling**: Multer v1.4.5 for file uploads with 50MB limit and comprehensive security validation
- **API Structure**: RESTful endpoints under `/api` prefix with standardized error handling
- **Memory Management**: Automatic cleanup and memory monitoring for large document processing

## System Flow Process

### 1. Document Upload & Initial Processing
```
User Action → File Upload (DocumentEditor) → Security Validation → XML Processing
   ↓
MultipartForm → Multer Middleware → File Type Check → ZIP Signature Validation
   ↓
XmlDocxProcessor → DOCX Extraction → XML Parsing → Rich Data Extraction
   ↓
{text, html, formatting, structure, styles, headers, footers, italicizedText}
```

### 2. Client-Side Document Conversion
```
Server Response → TiptapDocumentConverter → Async Processing → UI Yielding
   ↓
Paragraph Batching → Formatted Node Creation → Custom Extensions → Tiptap JSON
   ↓
FormattedParagraph Nodes + FontFormatting Marks + DocumentDefaults
```

### 3. APA Analysis Pipeline
```
Document Data → EnhancedAPAAnalyzer → Validator Orchestration
   ↓
11 Specialized Validators (Parallel Processing):
├── ReferenceValidator (alphabetical order, hanging indent, cross-checking)
├── AdvancedCitationValidator (et al. rules, multi-author, secondary sources)
├── TableFigureValidator (numbering, formatting, callouts, borders)
├── QuotationValidator (block quotes, ellipsis, square brackets)
├── StatisticalValidator (notation, decimals, italicization)
├── BiasFreeLanguageValidator (inclusive language, person-first)
├── HeaderFooterValidator (running heads, page numbers)
├── ComprehensiveValidator (lists, abbreviations, appendices)
├── AdditionalAPARules (footnotes, equations, legal, social media)
├── Basic Structure Analysis (sections, hierarchy)
└── Content Compliance Checks
   ↓
Issue Aggregation → Deduplication → Severity Prioritization → Return Issues[]
```

### 4. Real-Time Issue Highlighting
```
Issues Array → TiptapIssueHighlighter → ProseMirror Decorations
   ↓
Text Matching → Position Calculation → Decoration Creation
   ↓
Severity-Based Styling (Critical=Red, Major=Orange, Minor=Blue)
   ↓
Click Handlers → Active Issue State → Navigation Support
```

### 5. State Management Flow
```
Multiple Zustand Stores (Specialized Concerns):
├── enhancedDocumentStore.js (main document state, server integration)
├── documentStore.js (basic document data)
├── issuesStore.js (issue management, highlighting control)
├── processingStore.js (upload/analysis state, progress tracking)
└── analysisStore.js (real-time analysis with debouncing)
   ↓
Store Synchronization → React Component Updates → UI Reactivity
```

### 6. Interactive Editing & Fix Application
```
User Edits → Tiptap Editor → Real-time Analysis (8s debounce)
   ↓
Text Change Detection → Issue Revalidation → Highlight Updates
   ↓
Fix Actions → Server Request (/api/apply-fixes) → DocxModifier
   ↓
XML Manipulation → DOCX Regeneration → Client Download
```

## Component Architecture

### Core Components (`src/components/`)

**Main Interface Components**:
- **`page.js`**: Root page component orchestrating the entire application
- **`Header.js`**: File upload controls, document statistics, processing status
- **`DocumentEditor.js`**: Main Tiptap editor with custom extensions and formatting preservation
- **`IssuesPanel.js`**: Categorized issue display with severity indicators and fix suggestions
- **`LoadingState.js`**: Processing state display with progress indicators

**Editor Components**:
- **`EditorContent.js`**: Tiptap editor content wrapper with issue highlighting
- **`FormattingToolbar.js`**: Text formatting controls (bold, italic, alignment)
- **`DocumentControls.js`**: Document-level actions (save, export, reset)

**State Components**:
- **`EmptyDocumentState.js`**: Empty state with upload prompts
- **`DocumentIssuesBanner.js`**: Quick issue summary and navigation

**Error Handling**:
- **`ErrorBoundary.js`**: General error boundary wrapper
- **`AnalysisErrorBoundary.js`**: Specific error handling for analysis failures
- **`EditorErrorBoundary.js`**: Editor-specific error recovery

### State Management (`src/store/`)

**Specialized Zustand Stores**:
- **`enhancedDocumentStore.js`**: Main document state, server communication, analysis orchestration
- **`documentStore.js`**: Basic document data (text, HTML, formatting)
- **`issuesStore.js`**: Issue management, active issue tracking, highlighting control
- **`processingStore.js`**: Upload/analysis state, progress tracking, real-time timers
- **`analysisStore.js`**: Real-time analysis functions with debouncing (8s for performance)

### Hooks (`src/hooks/`)

**Custom React Hooks**:
- **`useDocumentEditor.js`**: Main editor integration hook with issue highlighting
- **`useKeyboardShortcuts.js`**: Keyboard navigation and editor shortcuts
- **`useTextReplacement.js`**: Text replacement utilities for fixes

## APA Validation System

### Validator Architecture (`src/utils/`)

**Core Orchestrator**:
- **`enhancedApaAnalyzer.js`**: Main analysis coordinator with error handling and modular validator injection

**Specialized Validators** (11 modules):

1. **`referenceValidator.js`**: Reference list compliance
   - Alphabetical ordering by first author surname
   - Hanging indent detection (0.5 inches)
   - Citation cross-checking (orphaned/missing references)
   - Type-specific formatting (journal, book, online)
   - DOI/URL validation and italicization compliance

2. **`advancedCitationValidator.js`**: Complex citation rules
   - Multi-author et al. rules (3+ authors)
   - Secondary source validation ("as cited in")
   - Personal communication format
   - Corporate author abbreviations
   - Chronological consistency (2021a, 2021b)

3. **`tableFigureValidator.js`**: Visual element formatting
   - Sequential numbering validation (Table 1, 2, 3...)
   - Title case (tables) vs sentence case (figures)
   - In-text callout verification
   - APA border requirements (horizontal lines only)
   - Placement validation

4. **`quotationValidator.js`**: Quote formatting
   - Block quote detection (40+ words)
   - Proper indentation without quotation marks
   - Ellipsis format validation (three dots with spacing)
   - Square bracket modifications ([sic], clarifications)
   - Citation placement requirements

5. **`statisticalValidator.js`**: Statistical notation
   - Context-aware italicization (p, t, F, r values)
   - Decimal place enforcement (2-3 for p-values)
   - Leading zero rules (correlation/p-value exceptions)
   - Statistical test reporting formats
   - Mathematical operator spacing

6. **`biasFreeLanguageValidator.js`**: Inclusive language
   - Gendered language alternatives ("chairperson" not "chairman")
   - Person-first disability language preferences
   - Age-appropriate terminology ("older adults")
   - Racial/ethnic capitalization (Black, White)
   - SOGI terminology updates
   - Pronoun usage analysis

7. **`headerFooterValidator.js`**: Headers and pagination
   - Professional vs student paper distinction
   - Running head format (50 characters, all caps)
   - Page number placement (top-right in headers)
   - Title page element validation
   - Section consistency across document

8. **`comprehensiveValidator.js`**: Structural elements
   - List formatting (serial commas, parallel structure)
   - Abbreviation management (first-use definitions)
   - Appendix validation (sequential labeling A, B, C)
   - Title and heading compliance
   - Supplemental material notation

9. **`additionalApaRules.js`**: Edge cases and specialties
   - Footnote usage (discourages excessive use)
   - Mathematical equation formatting
   - Legal reference italicization
   - Social media citation compliance
   - Conference paper requirements
   - Data availability statements

### Tiptap Integration (`src/utils/`)

**Document Processing**:
- **`tiptapDocumentConverter.js`**: DOCX to Tiptap JSON conversion with async processing and memory monitoring
- **`tiptapFormattingExtensions.js`**: Custom paragraph/text nodes preserving DOCX formatting
- **`tiptapIssueHighlighter.js`**: Real-time issue highlighting using ProseMirror decorations

**Supporting Utilities**:
- **`errorHandler.js`**: Standardized error processing and user-friendly message mapping

## Backend Services

### Server Structure (`server/`)

**Main Server**:
- **`index.js`**: Express server with security middleware, graceful shutdown, and concurrent development support

**API Routes** (`server/routes/`):
- **`docx.js`**: Document processing endpoints
  - `POST /api/upload-docx`: File upload, validation, and processing
  - `POST /api/apply-fixes`: Apply APA formatting fixes to documents

**Document Processors** (`server/processors/`):
- **`XmlDocxProcessor.js`**: Comprehensive XML-based DOCX parsing
  - ZIP extraction and XML parsing
  - Rich formatting data extraction (fonts, spacing, indentation)
  - Structure analysis (headings, tables, figures)
  - Style and formatting preservation
  - Memory-efficient processing with cleanup

- **`DocxModifier.js`**: Document modification for fix application
  - XML structure manipulation
  - Formatting fix implementation
  - DOCX regeneration with preserved structure

## Data Flow Architecture

### Upload → Processing → Analysis → Display → Editing → Fixes

1. **File Upload**: Drag-and-drop or file picker → Multer validation → ZIP signature check
2. **XML Processing**: DOCX extraction → XML parsing → Rich data extraction
3. **Client Conversion**: Server data → Tiptap JSON → Editor rendering
4. **APA Analysis**: 11 validators → Issue detection → Severity classification
5. **Visual Feedback**: ProseMirror decorations → Real-time highlighting → User interaction
6. **Real-time Editing**: Content changes → Debounced analysis (8s) → Live issue updates
7. **Fix Application**: User fixes → Server processing → DOCX modification → Download

### Error Handling Strategy

**Multi-layered Error Boundaries**:
- Component-level error boundaries for graceful degradation
- Validator-level error handling with standardized error objects
- API-level error handling with user-friendly messages
- File processing error recovery with fallback mechanisms

### Performance Optimizations

**Client-Side**:
- Async document conversion with UI yielding (MessageChannel/setTimeout)
- Batch processing for large documents (50-100 paragraph batches)
- Memory monitoring with garbage collection recommendations
- Debounced real-time analysis (8 seconds for performance balance)

**Server-Side**:
- Memory-based processing with automatic cleanup
- Streaming XML parsing for large documents
- Efficient ZIP handling with PizZip
- Request size limits (50MB) with proper error handling

## Development Workflow

### Local Development
1. **Start Services**: `npm run dev` (concurrently runs Next.js:3000 + Express:3001)
2. **File Changes**: Automatic reloading via nodemon (backend) and Next.js hot reload (frontend)
3. **Error Monitoring**: Console logging with environment-based verbosity
4. **Code Quality**: ESLint integration with Next.js configuration

### Testing Strategy
- Modular validator architecture enables isolated unit testing
- Error boundary testing for graceful failure scenarios
- Document processing testing with various DOCX formats
- Performance testing with large document processing

### Technical Dependencies

**Core Technologies**:
- Next.js 15.5.0 + React 19.1.0 (Frontend framework)
- Express 4.21.2 (Backend API server)
- Tiptap 3.4.2 (Rich text editing with ProseMirror)
- Zustand 5.0.8 (State management)

**Document Processing**:
- PizZip 3.2.0 (ZIP/DOCX handling and extraction)
- xml2js 0.6.2 (XML parsing and manipulation)
- @xmldom/xmldom 0.8.11 (DOM manipulation for XML)
- node-html-parser 6.1.13 (HTML processing and cleanup)

**Security & Infrastructure**:
- Helmet 7.2.0 (Security headers and protection)
- CORS 2.8.5 (Cross-origin resource sharing)
- Multer 1.4.5 (File upload handling with validation)
- Natural 6.12.0 (Text processing and linguistic utilities)

**Development & Build Tools**:
- Concurrently 8.2.2 (Parallel process execution for dev mode)
- Nodemon 3.1.10 (Development server auto-restart)
- ESLint 9 + Next.js config (Code quality and linting)
- Tailwind CSS 3.4.16 + PostCSS 8.5.3 (Styling framework)

## APA Compliance Features

### Comprehensive APA 7th Edition Coverage

**Document Structure & Formatting**:
- Font compliance (Times New Roman 12pt)
- Spacing validation (double spacing, proper margins)
- Heading hierarchy (Levels 1-5 with proper formatting)
- Title page elements and organization

**Citation & Reference Management**:
- In-text citation formats (parenthetical vs narrative)
- Multi-author rules and et al. usage
- Secondary source handling
- Reference list alphabetization and formatting
- DOI/URL compliance and accessibility

**Visual Elements**:
- Table formatting (numbering, borders, titles)
- Figure compliance (captions, numbering, placement)
- Mathematical equation formatting
- Statistical notation standards

**Language & Style**:
- Bias-free language recommendations
- Person-first language for disabilities
- Inclusive terminology for race, gender, age
- Professional writing standards

**Technical Requirements**:
- Headers and footers (running heads, page numbers)
- Appendix formatting and organization
- Footnote usage guidelines
- Supplemental material notation

# Important Development Guidelines

## Code Quality Standards
- **Error Handling**: Always implement comprehensive error boundaries and graceful degradation
- **Performance**: Monitor memory usage, implement batching for large documents, use debouncing for real-time features
- **Security**: Validate all file uploads, sanitize user input, implement proper CORS and security headers
- **Testing**: Write unit tests for validators, integration tests for document processing, error boundary tests
- **Documentation**: Comment complex algorithms, maintain clear component interfaces, document API endpoints

## Architecture Principles
- **Modularity**: Keep validators independent and testable
- **Separation of Concerns**: Clear boundaries between frontend/backend, UI/logic, state/presentation
- **Error Recovery**: Implement fallback mechanisms for all critical operations
- **Performance First**: Optimize for large document processing, real-time responsiveness
- **User Experience**: Provide clear feedback, loading states, and helpful error messages

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
