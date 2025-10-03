# APA Document Checker

A real-time web application for validating and fixing Word documents against APA 7th Edition formatting standards. Upload a DOCX file, get instant feedback on compliance issues, and apply automated fixes through an integrated rich-text editor.

## What It Does

APA Document Checker analyzes academic papers for compliance with APA 7th Edition guidelines and provides:

**Validation:** Identifies formatting issues (fonts, spacing, margins), structural problems (heading hierarchy, missing sections), citation errors (punctuation, author-date format), and reference formatting issues (alphabetization, hanging indents, DOI format).

**Real-Time Editing:** Built-in Tiptap rich-text editor allows direct editing with live issue highlighting. Changes auto-save to the cloud every 300ms.

**Automated Fixes:** One-click fixes for common issues like incorrect fonts, missing commas in citations, improper heading capitalization, and text formatting problems.

**Compliance Scoring:** Real-time scoring system (0-100) based on issue severity with categorized breakdowns by formatting, structure, citations, and references.

**Export:** Download edited documents as DOCX, HTML, or plain text with all changes preserved.

## Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router and Server Components
- **Tiptap**: ProseMirror-based rich text editor with custom formatting extensions
- **Zustand**: State management for document model and UI state
- **Tailwind CSS**: Utility-first styling with custom components
- **Lucide Icons**: Modern icon library

### Backend
- **Express.js**: API server for document processing
- **PizZip + xml2js**: DOCX parsing and XML manipulation
- **Worker Threads**: Parallel document processing via worker pool
- **Supabase**: PostgreSQL database, authentication, and file storage

### Document Processing
- **XmlDocxProcessor**: Extracts text, formatting, and structure from DOCX
- **TiptapAPAAnalyzer**: Client-side validation with position-aware issue detection
- **DocxModifier**: Server-side XML manipulation for formatting fixes
- **DocxExportService**: Generates DOCX from editor state

### Storage
- **IndexedDB**: Browser-local persistence for reload safety
- **Supabase Database**: Cloud storage for Tiptap JSON content
- **Supabase Storage**: Original DOCX file preservation

## Setup and Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

### Environment Variables

Create `.env.local` in project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server Configuration
EXPRESS_PORT=3001
NODE_ENV=development

# Optional
NEXT_PUBLIC_ENABLE_INCREMENTAL_ANALYSIS=true
```

### Installation Steps

```bash
# Clone repository
git clone <repository-url>
cd apa-document-checker

# Install dependencies
npm install

# Run database migrations (Supabase)
# See /supabase/migrations for schema

# Start development servers
npm run dev
```

This starts:
- Next.js dev server on `http://localhost:3000`
- Express API server on `http://localhost:3001`

### Supabase Setup

1. Create new Supabase project
2. Run migrations from `/supabase/migrations`
3. Configure storage bucket:
   - Name: `user-documents`
   - Public: Yes
   - File size limit: 10MB
4. Enable Email/Password authentication
5. Copy project URL and keys to `.env.local`

## Project Structure

```
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.js              # Landing page
│   │   ├── dashboard/           # User document dashboard
│   │   ├── document/[id]/       # Document editor page
│   │   └── upload/              # Upload interface
│   │
│   ├── components/               # React components
│   │   ├── IssuesPanel.js       # Issue list with filters and fixes
│   │   ├── NewDocumentEditor.js # Tiptap editor wrapper
│   │   ├── DocumentControls.js  # Export and analysis controls
│   │   └── SavingIndicator.js   # Auto-save status
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useUnifiedDocumentEditor.js  # Editor orchestration
│   │   ├── useAutoSave.js       # Dual-layer auto-save
│   │   ├── useAnalysis.js       # Debounced validation
│   │   └── useIssueDecorations.js # Visual highlighting
│   │
│   ├── store/                    # State management
│   │   └── unifiedDocumentStore.js # Zustand store with events
│   │
│   ├── models/                   # Data models
│   │   ├── DocumentModel.js     # Document representation
│   │   └── ParagraphModel.js    # Paragraph with runs
│   │
│   ├── services/                 # Business logic services
│   │   ├── DocumentService.js   # CRUD operations
│   │   └── DocxExportService.js # DOCX generation
│   │
│   └── utils/                    # Utilities and analyzers
│       ├── tiptapApaAnalyzer.js # Position-aware APA validator
│       ├── tiptapIssueHighlighter.js # Decoration plugin
│       ├── tiptapFormattingExtensions.js # Custom Tiptap nodes/marks
│       ├── indexedDBManager.js  # Local persistence
│       └── positionCalculator.js # Text-to-ProseMirror position mapping
│
├── server/                       # Express backend
│   ├── index.js                 # Server entry point
│   ├── routes/
│   │   └── docx.js              # Document processing routes
│   ├── processors/
│   │   ├── XmlDocxProcessor.js  # DOCX extraction
│   │   └── DocxModifier.js      # XML manipulation
│   ├── analyzers/
│   │   └── ApaAnalyzer.js       # Server-side validation
│   ├── workers/
│   │   ├── WorkerPool.js        # Thread pool manager
│   │   └── documentProcessor.worker.js # Worker implementation
│   └── utils/
│       └── supabaseClient.js    # Supabase admin client
│
└── public/                       # Static assets
```

## Key Features

### Real-Time Editor with Auto-Save

The Tiptap editor preserves original DOCX formatting while enabling real-time edits. Changes auto-save to IndexedDB (instant) and Supabase (cloud) every 300ms after typing stops. Page reloads recover unsaved edits automatically.

### Position-Aware Issue Detection

TiptapAPAAnalyzer traverses the ProseMirror document tree during analysis, calculating exact character positions for each issue. This enables:
- Precise highlighting without text search
- Ctrl+click navigation to issues
- Surgical fix application via transactions
- Automatic position remapping as document changes

### Incremental Analysis Caching

For large documents, IncrementalAPAAnalyzer caches validation results per paragraph (keyed by content hash). Only modified paragraphs are re-analyzed, providing 90% performance improvement on subsequent checks.

### Three-Layer Persistence

**Browser (IndexedDB):** Instant local backup for reload safety.
**Cloud (Supabase):** Long-term storage with version history.
**Storage (Original DOCX):** Immutable reference file.

Edited content stored as Tiptap JSON. DOCX generated on-demand for export only.

### Automated and Manual Fixes

**Client-Side Text Fixes (Instant):**
- Missing citation commas
- Incorrect et al. formatting
- Improper parenthetical connectors
- All-caps heading correction

Applied via ProseMirror transactions at exact issue positions. No page reload required.

**Server-Side Formatting Fixes (Legacy):**
- Font family changes
- Font size adjustments
- Line spacing correction
- Margin modifications

Require DOCX reprocessing (slower but handles document-wide formatting).

### Multi-Category Validation

**Formatting:** Font family/size, line spacing, margins, indentation, alignment
**Structure:** Heading hierarchy, title page elements, section ordering
**Citations:** Author-date format, et al. usage, punctuation, parenthetical structure
**References:** Alphabetization, hanging indents, DOI/URL format, title capitalization
**Grammar:** Contractions, first-person language, passive voice

### Export Options

**DOCX:** Full-fidelity export with all formatting preserved via docx.js library
**HTML:** Styled HTML with inline CSS for web publishing
**Text:** Plain text extraction for analysis tools

## Development Workflow

### Running in Development

```bash
# Start both Next.js and Express servers
npm run dev

# Run servers separately
npm run dev:next    # Next.js on port 3000
npm run dev:server  # Express on port 3001
```

### Building for Production

```bash
# Build Next.js application
npm run build

# Start production servers
npm start           # Starts both servers
```

### Environment-Specific Behavior

**Development:**
- Verbose logging to console
- Source maps enabled
- Hot module replacement
- Worker pool enabled (if not serverless)

**Production:**
- Minimal logging
- Optimized bundles
- Static generation where possible
- Worker pool disabled on Vercel (serverless)

### Database Migrations

Supabase migrations are in `/supabase/migrations`. Apply via Supabase CLI or dashboard:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Architecture Patterns

### Tiptap-First Editing

Unlike traditional DOCX editors that repeatedly parse files, this application treats DOCX as an immutable input. The Tiptap editor owns content during active sessions, with changes persisted as JSON. DOCX files are generated fresh on export only.

**Benefits:** Instant edits, no file I/O overhead, surgical updates, collaboration-ready.

### Event-Driven Component Communication

Components communicate via StoreEventEmitter rather than prop drilling:
- `analysisComplete`: Triggers issue panel refresh
- `fixApplied`: Triggers editor transaction
- `activeIssueChanged`: Syncs issue selection across UI
- `documentRestored`: Handles undo/redo

### Hook Composition

Editor functionality split across specialized hooks:
- `useUnifiedDocumentEditor`: Orchestrates editor lifecycle
- `useAutoSave`: Handles persistence logic
- `useAnalysis`: Manages validation cycle
- `useIssueDecorations`: Controls visual highlighting

Each hook focuses on a single concern, enabling independent testing and reuse.

### Graceful Degradation

**Worker Pool Unavailable:** Falls back to synchronous processing
**IndexedDB Unsupported:** Skips local caching, uses cloud only
**Supabase Offline:** Edits accumulate in IndexedDB until reconnection
**Analysis Errors:** Isolated via error boundaries, editing continues

## Performance Considerations

**Document Size Limits:**
- Upload: 10MB (Next.js route limit)
- Processing: 50MB (server memory)
- Editor: 5000 paragraphs (performance threshold)

**Optimization Strategies:**
- Paragraph-level analysis caching (90% faster re-analysis)
- Debounced auto-save (300ms) and analysis (2000ms)
- Worker pool for parallel processing (disabled in serverless)
- LRU cache eviction (max 1000 cached paragraphs)
- IndexedDB cleanup on successful cloud save

**Memory Management:**
- Maps for O(1) paragraph lookup
- Cached Tiptap JSON invalidated on version change
- Snapshot history limited to 20 states
- Worker thread isolation prevents main thread blocking

## Contributing

This is an active development project. Key areas for contribution:
- Additional APA validation rules
- Performance optimization for large documents
- Collaboration features (multiplayer editing)
- PDF export support
- Citation database integration

## License

MIT License - see LICENSE file for details
