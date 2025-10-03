# APA Document Checker - LLM Context Guide

## Project Overview

APA Document Checker is a real-time web application that validates DOCX documents against APA 7th Edition formatting standards. Users upload Word documents, the system identifies compliance issues with precise locations, and provides both automated and manual fixes through a live rich-text editor.

## Core Architecture Philosophy

### Tiptap-First Real-Time Editing

The application uses a **Tiptap-first architecture** where the ProseMirror-based rich text editor serves as the single source of truth during editing sessions. This design eliminates the traditional DOCX-centric model where changes require repeated file parsing and regeneration.

**Key principle:** DOCX files are immutable artifacts. The editor owns the content during active sessions. DOCX is generated on-demand for export only.

**Benefits:**
- Real-time collaborative potential
- Instant visual feedback for edits and fixes
- Surgical position-aware updates via ProseMirror transactions
- No file I/O overhead during editing

### Three-Layer Persistence Strategy

**Layer 1: IndexedDB (Browser Cache)**
- Stores unsaved edits in compressed Tiptap JSON format
- Provides instant recovery from accidental page reloads
- Auto-clears after successful cloud save to prevent stale data
- Isolated per document ID with quota management

**Layer 2: Supabase (Cloud Database)**
- Long-term persistence in `tiptap_content` JSONB column
- Auto-saves every 300ms after user stops typing
- Maintains version history through `content_saved_at` timestamp
- Enables multi-device access and collaboration foundation

**Layer 3: Supabase Storage (Original Files)**
- Original uploaded DOCX preserved immutably
- Used as reference and for fresh reprocessing if needed
- Modified DOCX generated on-demand during export only

## Data Model Architecture

### DocumentModel (Unified Document Representation)

Central data structure bridging server processing, client storage, and editor presentation.

**Structure:**
- `paragraphs`: Map of ParagraphModel instances keyed by stable IDs
- `paragraphOrder`: Array maintaining paragraph sequence
- `formatting.document`: Document-level properties (margins, default font, spacing)
- `structure`: Extracted semantic elements (headings, citations, references, tables)
- `issues`: Array of validation findings with precise locations
- `version`: Change tracking number for optimistic updates
- `supabase`: Metadata for cloud persistence

**Key Methods:**
- `getTiptapJson()`: Converts to Tiptap ProseMirror JSON for editor initialization
- `updateFromTiptap()`: Syncs changes from editor back to model
- `getText()`: Extracts plain text for analysis
- `getHtml()`: Generates HTML representation
- `createSnapshot()`: Captures state for undo/redo

### ParagraphModel (Paragraph-Level Representation)

Immutable paragraph data with formatting and change tracking.

**Structure:**
- `id`: Stable UUID for position-independent identification
- `text`: Plain text content
- `runs`: Map of RunModel instances (inline formatting segments)
- `runOrder`: Array maintaining run sequence
- `formatting`: Paragraph properties (spacing, indentation, alignment, style)
- `issues`: Set of issue IDs associated with this paragraph
- `changeSequence`: Incremental counter for change detection

**Conversion Methods:**
- `fromServerData()`: Creates from XmlDocxProcessor output
- `fromTiptapNode()`: Creates from editor paragraph node
- `toTiptapNode()`: Converts to ProseMirror paragraph representation
- `toHtml()`: Generates HTML with inline styles

### RunModel (Inline Formatting Representation)

Represents a continuous text segment with uniform formatting.

**Structure:**
- `id`: Stable UUID
- `text`: Text content
- `font`: Family, size, bold, italic, underline
- `color`: Text color in hex format
- `index`: Position within paragraph

**Purpose:** Preserves original DOCX formatting while enabling precise Tiptap mark application.

## Data Flow Patterns

### Document Upload and Initial Processing

1. User uploads DOCX via drag-and-drop or file picker
2. Next.js API route `/app/upload/page.js` handles multipart/form-data
3. File proxied to Express server `POST /api/docx/upload`
4. Server routes to WorkerPool (if available) or direct processing
5. XmlDocxProcessor extracts:
   - Text content and paragraph structure via xml2js + PizZip
   - Formatting data from document.xml, styles.xml, settings.xml
   - Semantic structure (headings, citations, references, tables)
6. Server stores original DOCX in Supabase Storage
7. Server creates database record in `documents` table
8. Response returns structured JSON to client
9. Client creates DocumentModel from JSON
10. Client initializes Tiptap editor with `DocumentModel.getTiptapJson()`
11. Client triggers initial APA analysis via TiptapAPAAnalyzer

### Real-Time Editing Flow

1. User types in Tiptap editor
2. Editor emits `onUpdate` event with new ProseMirror document state
3. `useAutoSave` hook debounces changes (300ms delay)
4. Auto-save extracts `editor.getJSON()` (Tiptap format)
5. Saves to IndexedDB immediately for reload safety
6. Saves to Supabase `tiptap_content` column for cloud persistence
7. Clears IndexedDB after successful Supabase save
8. `useAnalysis` hook separately debounces analysis (2000ms delay)
9. TiptapAPAAnalyzer traverses current ProseMirror document tree
10. Issues with exact ProseMirror positions (`pmPosition: {from, to}`) returned
11. `useIssueDecorations` hook converts issues to visual highlights
12. IssueHighlighter plugin renders decorations without mutating content
13. IssuesPanel updates with categorized findings

### Fix Application Flow

**Client-Side Text Fixes (Instant, Preferred):**
1. User clicks "Fix" button in IssuesPanel
2. FixButton extracts `fixValue.textReplacement` with original and replacement text
3. Emits `fixApplied` event with `fixData` and `pmPosition`
4. `useUnifiedDocumentEditor` hook receives event
5. Uses `pmPosition` (if available) to locate exact content
6. Creates ProseMirror transaction: `tr.insertText(replacement, from, to)`
7. Editor applies transaction surgically (no setContent, no reload)
8. Issue immediately removed from highlighting
9. Auto-save persists change to IndexedDB and Supabase
10. Triggers immediate re-analysis (no debounce) for instant feedback

**Server-Side Formatting Fixes (Legacy, Complex):**
1. User clicks formatting fix (e.g., "Fix Font")
2. Client downloads original DOCX from Supabase Storage
3. Sends to Express server `POST /api/docx/modify` with fixAction
4. DocxModifier extracts ZIP, modifies document.xml and styles.xml
5. Returns modified DOCX buffer
6. Client reprocesses modified DOCX through upload pipeline
7. DocumentModel updated with new formatting
8. Editor content refreshed via `setContent()` (rare exception)
9. Re-saves to Supabase

### Analysis Architecture

**TiptapAPAAnalyzer (Client-Side, Position-Aware)**

Traverses ProseMirror document tree directly, calculating exact character positions during traversal.

**Key Features:**
- **Position Calculation:** Tracks absolute character position while traversing nodes
- **Structural Awareness:** Identifies headings, paragraphs, lists via node types
- **Immediate Positions:** Returns issues with `pmPosition: {from, to}` for decoration
- **No Text Extraction:** Works with live editor document, avoiding serialization overhead

**Validation Categories:**
- Formatting: Font family, font size, line spacing, margins, indentation
- Structure: Heading hierarchy, title page elements, section organization
- Citations: Parenthetical format, author-date structure, et al. usage, punctuation
- References: Alphabetization, hanging indents, DOI/URL formatting
- Grammar: Contractions, first-person language, passive voice

**IncrementalAPAAnalyzer (Legacy, Paragraph-Based Caching)**

Paragraph-level caching for performance optimization on large documents.

**Mechanism:**
- Hashes paragraph text content as cache key
- Stores analysis results per paragraph in LRU cache
- Only re-analyzes modified paragraphs
- Invalidates dependent paragraphs (e.g., reference order changes)

**Performance:** 90% faster on subsequent analyses of unchanged content.

### Issue Highlighting System

**IssueHighlighter (Tiptap Extension)**

ProseMirror plugin that manages visual decorations without mutating content.

**Flow:**
1. `useIssueDecorations` hook updates plugin state via `updateIssueHighlights` command
2. Plugin receives issues array and active issue ID
3. `findIssuePositions()` function locates text:
   - **Primary:** Uses `issue.pmPosition` if available (accurate, fast)
   - **Fallback:** Searches document text if position missing/stale
4. Creates `Decoration.inline(from, to, {class, attributes})`
5. Decorations sorted by position to avoid conflicts
6. DecorationSet mapped through document changes automatically
7. Ctrl+click on highlight cycles through overlapping issues
8. Tooltip shows severity and title on hover

**Decoration Classes:**
- `apa-critical`: Red underline for critical issues
- `apa-major`: Orange underline for major issues
- `apa-minor`: Yellow underline for minor issues
- `apa-active`: Bold highlight for currently selected issue

## State Management

### unifiedDocumentStore (Zustand)

Central state container with derived getters and event emitter.

**State:**
- `documentModel`: Current DocumentModel instance
- `processingState`: Upload/analysis/fix operation status
- `snapshots`: Undo/redo history (time-travel debugging)

**Derived Getters:**
- `getIssues()`: Extracts all issues from documentModel
- `getComplianceScore()`: Calculates percentage based on issue severity
- `getStatistics()`: Word count, paragraph count, issue breakdown
- `getEditorContent()`: Converts DocumentModel to Tiptap JSON

**Methods:**
- `createDocument()`: Initializes new DocumentModel from server data
- `updateDocumentContent()`: Syncs editor changes back to model
- `applyFix()`: Coordinates fix application and re-analysis
- `exportDocument()`: Generates DOCX/HTML/Text from current state
- `createSnapshot()`: Captures undo point
- `restoreSnapshot()`: Time-travel to previous state

**Events (StoreEventEmitter):**
- `analysisComplete`: Emitted when validation finishes
- `fixApplied`: Emitted when fix transaction dispatched
- `activeIssueChanged`: Emitted when user selects different issue
- `documentRestored`: Emitted on undo/redo

### Hooks Composition

**useUnifiedDocumentEditor (Orchestrator)**

Initializes and coordinates all editor functionality.

**Responsibilities:**
- Creates Tiptap editor with formatting extensions
- Loads initial content from DocumentModel
- Coordinates auto-save, analysis, and decoration hooks
- Handles fix application via event listener
- Manages editor error states and recovery
- Provides scroll-to-issue functionality

**useAutoSave (Persistence)**

Debounced auto-save with dual-layer persistence.

**Logic:**
- Listens to editor `onUpdate` event
- Debounces 300ms to batch rapid edits
- Extracts `editor.getJSON()` (Tiptap format)
- Saves to IndexedDB immediately (synchronous, fast)
- Saves to Supabase via API (asynchronous, durable)
- Updates save status ('idle' → 'saving' → 'saved' → 'error')
- Clears IndexedDB on successful Supabase save
- Aborts pending save if new edits occur

**useAnalysis (Validation)**

Debounced re-analysis with incremental optimization.

**Logic:**
- Listens to editor `onUpdate` event
- Debounces 2000ms to avoid analysis spam
- Waits for editor initialization before first analysis
- Extracts current editor state
- Runs TiptapAPAAnalyzer with position calculation
- Returns issues with `pmPosition` for decoration
- Caches analysis results by paragraph hash (if incremental enabled)
- Skips analysis during fix application to prevent flickering

**useIssueDecorations (Visual)**

Synchronizes issue array with editor decorations.

**Logic:**
- Watches `issues`, `activeIssueId`, `showHighlighting` state
- Calls `editor.commands.updateIssueHighlights()` when changes detected
- No content mutation - purely visual
- Decorations automatically map through document changes

## Server Processing

### XmlDocxProcessor (DOCX Extraction)

Parses DOCX ZIP archive and extracts structured data.

**Process:**
1. Accepts Buffer or file path
2. Unzips using PizZip (tolerant of corrupt files)
3. Parses XML files using xml2js
4. Extracts from document.xml:
   - Paragraph text and runs
   - Font formatting (family, size, bold, italic, underline, color)
   - Paragraph properties (spacing, indentation, alignment, style)
5. Extracts from styles.xml:
   - Style definitions
   - Default document properties
6. Extracts from settings.xml:
   - Page margins
   - Default tab stops
7. Analyzes structure:
   - Identifies headings by style name
   - Extracts citations via regex patterns
   - Locates references section
   - Finds tables and lists
8. Converts measurements: twips → inches, half-points → points
9. Returns JSON with text, html, formatting, structure

**Error Handling:** Graceful degradation - returns partial data if some XML files corrupt.

### WorkerPool (Concurrent Processing)

Manages Node.js Worker Threads for parallel document processing.

**Architecture:**
- Pool of 4 workers (configurable) using `worker_threads` module
- Job queue with timeout management
- Worker lifecycle: available → busy → available cycle
- Graceful shutdown waits for active jobs (30s timeout)

**Job Flow:**
1. `executeJob(jobData, timeout)` called with document processing task
2. Assigns to available worker or enqueues if all busy
3. Worker processes job in isolated thread (prevents main thread blocking)
4. Worker sends result via `postMessage`
5. Promise resolves with result
6. Worker returned to available pool
7. Next queued job automatically assigned

**Disabled in Serverless:** Vercel and other serverless platforms don't support worker threads, falls back to direct processing.

### DocxModifier (XML Manipulation)

Applies formatting fixes by modifying DOCX XML structure.

**Supported Fixes:**
- `fixFont`: Updates `w:rFonts` elements in runs and styles
- `fixFontSize`: Updates `w:sz` and `w:szCs` elements
- `fixLineSpacing`: Updates `w:spacing` in paragraph properties
- `fixMargins`: Updates page margin settings
- `fixTextContent`: DOM-based text replacement within `w:t` elements

**Process:**
1. Receives DOCX buffer and fix parameters
2. Unzips using PizZip
3. Extracts document.xml
4. Parses with DOMParser (xmldom)
5. Modifies specific elements based on fixAction
6. Serializes back to XML
7. Updates ZIP archive
8. Generates modified DOCX buffer

**Safety:** Uses DOM manipulation (not regex) for text changes to preserve XML structure.

## Supabase Integration

### Database Schema

**documents table:**
- `id`: UUID primary key
- `user_id`: Foreign key to auth.users
- `name`: Original filename
- `file_path`: Supabase Storage path
- `created_at`, `updated_at`: Timestamps
- Row-level security enforces user isolation

**analysis_results table:**
- `id`: UUID primary key
- `document_id`: Foreign key to documents
- `user_id`: Foreign key to auth.users
- `issues`: JSONB array of validation findings
- `compliance_score`: Integer (0-100)
- `document_data`: JSONB with formatting/structure
- `tiptap_content`: JSONB with editor state (auto-save target)
- `content_saved_at`: Timestamp of last edit
- `analyzed_at`: Timestamp of last analysis

**Storage:**
- `user-documents` bucket: Original DOCX files
- Public read access with RLS policies
- Automatic cleanup on document deletion

### Authentication

- Supabase Auth with email/password
- Server-side session validation via cookies
- Middleware protection on /dashboard and /document routes
- JWT token verification for API endpoints

## Performance Optimizations

### Caching Strategies

**Paragraph-Level Analysis Caching:**
- Hash paragraph text as cache key
- Store validation results in Map (max 1000 entries)
- LRU eviction prevents memory bloat
- Invalidation on paragraph text change

**Position Map Caching:**
- Build once per analysis cycle
- Maps text paragraph indices to ProseMirror positions
- Reused across all issues in analysis batch

**Tiptap JSON Caching:**
- DocumentModel caches getTiptapJson() result
- Invalidated on version increment
- Prevents repeated conversion overhead

### Debouncing Policies

**Auto-Save: 300ms**
- Balances responsiveness with API load
- Short enough for invisible latency
- Long enough to batch rapid keystrokes

**Analysis: 2000ms**
- Prevents analysis spam during active typing
- Allows user to finish thought before validation
- Configurable via environment variable

**IndexedDB: Immediate**
- No debounce - saves on every auto-save trigger
- Fast enough for real-time execution
- Provides instant reload safety

### Memory Management

**DocumentModel Optimizations:**
- Paragraphs stored in Map for O(1) lookup
- Runs within paragraphs also use Map
- Tiptap JSON cached to avoid repeated conversion
- Snapshots limited to last 20 states

**Worker Pool Isolation:**
- Each document processed in isolated thread
- Memory freed after job completion
- Worker termination on timeout prevents leaks
- Garbage collection triggered after large operations

**IndexedDB Cleanup:**
- Auto-clears after successful Supabase save
- Background task clears drafts older than 7 days
- Quota monitoring prevents storage exhaustion

## Development Patterns

### Tiptap Custom Extensions

**FormattedParagraph (Custom Node):**
- Replaces default paragraph node
- Preserves DOCX paragraph formatting in ProseMirror attributes
- Maps spacing, indentation, alignment to data attributes
- Renders as HTML with inline styles

**FontFormatting (Custom Mark):**
- Preserves font family, size, color
- Applied as mark alongside bold/italic/underline
- Maps to `<span>` with inline styles

**DocumentDefaults (Extension):**
- Applies document-level defaults
- Provides global formatting context
- Prevents formatting loss on paste

**IssueHighlighter (Decoration Plugin):**
- Pure visual layer - never mutates content
- Decorations automatically remapped on edits
- Supports Ctrl+click for issue navigation
- Tooltip integration for issue details

### Error Boundaries

**EditorErrorBoundary:**
- Catches Tiptap initialization errors
- Provides reload button and fallback UI
- Shows document text preview for recovery

**AnalysisErrorBoundary:**
- Isolates validation errors from editor
- Allows editing to continue if analysis fails
- Logs error context for debugging

**Global ErrorBoundary:**
- Catches unhandled React errors
- Prevents full app crash
- Shows friendly error message with report button

### Event-Driven Communication

**StoreEventEmitter:**
- Decouples components via publish/subscribe
- Prevents prop drilling for deeply nested interactions
- Type-safe event contracts

**Event Types:**
- `analysisComplete`: Analysis → IssuesPanel
- `fixApplied`: FixButton → Editor
- `activeIssueChanged`: IssuesPanel ↔ Editor
- `documentRestored`: Undo/Redo → Editor

## Technical Constraints and Trade-offs

**Maximum Document Size:**
- Upload: 10MB (Next.js route limit)
- Processing: 50MB (server memory limit)
- Editor: 5000 paragraphs (performance threshold)

**Auto-Save Concurrency:**
- AbortController prevents save conflicts
- Latest edit wins (optimistic updates)
- No server-side conflict resolution

**Worker Pool Limitations:**
- Disabled in serverless (Vercel, AWS Lambda)
- Falls back to synchronous processing
- Potential timeout on very large documents

**IndexedDB Quotas:**
- Browser-dependent (typically 10-50% of free disk)
- Quota exceeded error triggers cleanup
- User prompted to clear old drafts

**Position Calculation Precision:**
- ProseMirror positions shift with edits
- Decorations automatically remapped
- Stale positions from cached issues handled via fallback search

## Security Considerations

- Row-level security on all Supabase queries
- User isolation enforced at database level
- File uploads validated for DOCX MIME type
- Storage paths include user ID to prevent unauthorized access
- No user-provided HTML rendered without sanitization
- API routes validate session before processing
- CORS configured for same-origin only
