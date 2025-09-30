# APA Document Checker - Complete Workflow Documentation

## Overview

The APA Document Checker is a sophisticated full-stack application that validates academic documents against APA 7th edition guidelines using advanced XML-based processing, real-time issue highlighting, and a rich text editor. The system employs a **unified document model architecture** with bidirectional synchronization between the backend, frontend state management, and interactive editor.

---

## Architecture Summary

### Technology Stack

**Frontend:**
- Next.js 15 with React 19 (JavaScript, App Router)
- Tiptap 3.4.2 (Rich text editor with ProseMirror)
- Zustand 5.0.8 (State management)
- Tailwind CSS 3.4.16 (Styling)

**Backend:**
- Express 4.21.2 (API server)
- PizZip 3.2.0 (DOCX extraction)
- xml2js 0.6.2 (XML parsing)
- @xmldom/xmldom 0.8.11 (XML manipulation)

**Key Design Patterns:**
- **Single Source of Truth**: DocumentModel class
- **Service Layer**: DocumentService for business logic
- **Specialized Validators**: 11 modular APA validators
- **Event-Driven Architecture**: Store events for cross-component communication
- **Bidirectional Sync**: DocumentModel ↔ Tiptap Editor

---

## Complete End-to-End Workflow

### Phase 1: Document Upload & Server Processing

```
USER ACTION
    ↓
[User selects .docx file via Header.js file picker]
    ↓
src/components/Header.js:102-139 → handleFileUpload()
    │
    ├─ Validation (client-side)
    │  ├─ File extension check (.docx only)
    │  ├─ Size limit check (10MB max)
    │  └─ Error display if validation fails
    ↓
src/store/unifiedDocumentStore.js:107-199 → uploadDocument(file)
    │
    ├─ Update processingState (isUploading: true, progress updates)
    ├─ Compress file buffer using CompressionUtils
    ↓
src/services/DocumentService.js:31-107 → loadDocument(file)
    │
    ├─ Create FormData with document
    ├─ HTTP POST → /api/upload-docx (2 min timeout)
    ↓
```

**SERVER SIDE:**

```
server/index.js:58 → Imports and mounts docx routes
    ↓
server/routes/docx.js:63-216 → POST /api/upload-docx handler
    │
    ├─ Multer middleware validates upload
    │  ├─ File type filter (DOCX/octet-stream)
    │  ├─ 10MB size limit
    │  └─ Memory/disk storage (Vercel vs local)
    │
    ├─ ZIP signature validation → isValidDocxFile()
    ↓
server/processors/XmlDocxProcessor.js:114-173 → processDocument()
    │
    ├─ Read file as buffer
    ├─ Load with PizZip
    │
    ├─ Extract XML files:
    │  ├─ word/document.xml → extractDocumentXml() (line 178)
    │  ├─ word/styles.xml → extractStylesXml() (line 191)
    │  ├─ word/settings.xml → extractSettingsXml() (line 204)
    │  ├─ word/header*.xml → extractHeadersFooters() (line 351)
    │  └─ word/footer*.xml → extractHeadersFooters() (line 351)
    │
    ├─ Parse & Extract:
    │  ├─ Plain text → extractPlainText() (line 217)
    │  ├─ Formatted HTML → convertToHtml() (line 253)
    │  ├─ Formatting details → extractFormattingDetails() (line 301)
    │  │  ├─ Document-level: font, spacing, margins, indentation
    │  │  ├─ Paragraph-level: style, alignment, runs
    │  │  └─ APA compliance score → calculateAPACompliance() (line 1207)
    │  │
    │  ├─ Structure → extractDocumentStructure() (line 521)
    │  │  ├─ Headings (with levels)
    │  │  ├─ Sections (abstract, methods, references)
    │  │  ├─ Citations (author, year, position)
    │  │  ├─ References (type, formatting)
    │  │  ├─ Tables (with border info)
    │  │  └─ Figures
    │  │
    │  ├─ Tables with borders → extractTablesWithFormatting() (line 572)
    │  ├─ Italicized text → extractItalicizedText() (line 656)
    │  └─ Styles → processStyles() (line 1151)
    │
    └─ Return comprehensive document data:
       {
         html: '<div>...</div>',
         text: 'Plain text content...',
         formatting: { document: {...}, paragraphs: [...], compliance: {...} },
         structure: { headings: [...], sections: [...], citations: [...], ... },
         styles: { styles: [...], defaultStyle: {...} },
         headersFooters: { headers: [...], footers: [...], runningHead: {...} },
         processingInfo: { timestamp, fileSize, wordCount, processor }
       }
```

---

### Phase 2: Client-Side Document Model Creation

```
RESPONSE RECEIVED
    ↓
src/services/DocumentService.js:84 → DocumentModel.fromServerData()
    ↓
src/models/DocumentModel.js:52-105 → static fromServerData()
    │
    ├─ Create new DocumentModel instance
    │  ├─ Generate unique ID (UUID)
    │  ├─ Store original buffer (compressed)
    │  └─ Initialize metadata
    │
    ├─ Initialize document-level formatting
    │  └─ FormattingModel.initializeFromServer() (line 435)
    │
    ├─ Create ParagraphModel instances from formatting.paragraphs
    │  └─ For each paragraph:
    │     └─ src/models/ParagraphModel.js:23 → fromServerData()
    │        ├─ Extract: text, font, spacing, indentation, alignment
    │        ├─ Create Run models for formatted text segments
    │        └─ Store in paragraphs Map + paragraphOrder array
    │
    ├─ Initialize structure data
    │  └─ StructureModel.initializeFromServer() (line 472)
    │
    ├─ Initialize styles
    │  └─ StylesModel.initializeFromServer() (line 492)
    │
    └─ Record creation in ChangeLog
```

**Data Structure Created:**

```javascript
DocumentModel {
  id: 'uuid-v4',
  version: 1,
  originalBuffer: Uint8Array (compressed),
  currentBuffer: Uint8Array (compressed),

  paragraphs: Map {
    'para-id-1': ParagraphModel {
      id: 'para-id-1',
      index: 0,
      text: 'Paragraph content...',
      formatting: { font, spacing, indentation, alignment },
      runs: Map { 'run-id-1': RunModel {...}, ... }
    },
    'para-id-2': ParagraphModel {...},
    ...
  },
  paragraphOrder: ['para-id-1', 'para-id-2', ...],

  formatting: FormattingModel {
    document: { font, spacing, margins, indentation },
    compliance: { font: {...}, spacing: {...}, margins: {...}, overall: 85 }
  },

  structure: StructureModel {
    headings: [...],
    sections: [...],
    citations: [...],
    references: [...],
    tables: [...],
    italicizedText: [...]
  },

  issues: IssueTracker {
    issues: Map(),
    paragraphIssues: Map()
  }
}
```

---

### Phase 3: State Management & Editor Initialization

```
DOCUMENT MODEL CREATED
    ↓
src/store/unifiedDocumentStore.js:142-178 → Store updates
    │
    ├─ Set documentModel in store
    ├─ Update processingState (isUploading: false, progress: 100)
    ├─ Set editorState.needsSync = true
    ├─ Create initial snapshot for undo
    └─ Auto-trigger analysis (1 second delay)
    ↓
COMPONENT RENDERS
    ↓
src/app/page.js:7-80 → Home component renders
    │
    ├─ Header component
    ├─ NewDocumentEditor component (left panel)
    └─ IssuesPanel component (right panel)
    ↓
src/components/NewDocumentEditor.js:16-122 → NewDocumentEditor
    │
    ├─ Consumes store via useUnifiedDocumentStore()
    ├─ Initializes editor via useUnifiedDocumentEditor()
    ↓
src/hooks/useUnifiedDocumentEditor.js:15-534 → Editor hook
    │
    ├─ useEditor() with extensions:
    │  ├─ StarterKit (basic editing)
    │  ├─ FormattedParagraph (custom node)
    │  ├─ FontFormatting (custom mark)
    │  ├─ DocumentDefaults (document settings)
    │  ├─ Underline
    │  └─ IssueHighlighter (real-time highlighting)
    │
    ├─ onCreate callback (line 107):
    │  └─ Triggers syncEditorFromModel()
    ↓
src/hooks/useUnifiedDocumentEditor.js:168-240 → syncEditorFromModel()
    │
    ├─ Call getEditorContent() from store
    ↓
src/store/unifiedDocumentStore.js:434-441 → getEditorContent()
    ↓
src/models/DocumentModel.js:138-167 → getTiptapJson()
    │
    ├─ Convert each ParagraphModel to Tiptap node
    │  └─ ParagraphModel.toTiptapNode()
    │     ├─ Create paragraph node with formatting attrs
    │     └─ Convert runs to text nodes with marks
    │
    └─ Return Tiptap JSON:
       {
         type: 'doc',
         content: [
           {
             type: 'paragraph',
             attrs: { fontFamily, fontSize, lineHeight, alignment, ... },
             content: [
               { type: 'text', text: 'Sample', marks: [{ type: 'bold' }, ...] },
               ...
             ]
           },
           ...
         ]
       }
    ↓
EDITOR RENDERS
    │
    └─ Set editor content with setContent()
    └─ Update issue highlights via IssueHighlighter
```

---

### Phase 4: Automatic APA Analysis

```
AUTO-TRIGGER (1 second after upload)
    ↓
src/store/unifiedDocumentStore.js:204-306 → analyzeDocument()
    │
    ├─ Update processingState (isAnalyzing: true)
    ├─ Determine analysis type (full vs incremental)
    ↓
src/services/DocumentService.js:112-151 → analyzeDocument()
    │
    ├─ Extract data for analysis:
    │  ├─ _extractFormattingForAnalysis() (line 663)
    │  ├─ _extractStructureForAnalysis() (line 689)
    │  └─ _extractStylesForAnalysis() (line 700)
    │
    ├─ Call APA analyzer:
    ↓
src/utils/enhancedApaAnalyzer.js:70-292 → analyzeDocument()
    │
    ├─ Run 11 specialized validators in sequence:
    │
    │  1. analyzeFormatting() (line 313)
    │     └─ Check: font family, font size, line spacing, margins, indentation
    │        → Issues: "Incorrect font family", "Incorrect font size", etc.
    │
    │  2. analyzeStructure() (line 501)
    │     └─ Check: required sections, heading hierarchy
    │        → Issues: "Missing abstract", "Improper heading hierarchy"
    │
    │  3. analyzeBasicCitations() (line 656)
    │     └─ Check: comma placement, ampersand usage, et al. formatting
    │        → Issues: "Missing comma in citation", "Incorrect connector"
    │
    │  4. ReferenceValidator.validateReferences() (line 169)
    │     └─ Check: alphabetical order, hanging indent, cross-referencing
    │        → Issues: "References not alphabetized", "Missing hanging indent"
    │
    │  5. TableFigureValidator.validateTablesAndFigures() (line 181)
    │     └─ Check: numbering, title case, in-text callouts, borders
    │        → Issues: "Table not numbered", "Vertical lines in table"
    │
    │  6. HeaderFooterValidator.validateHeadersFooters() (line 198)
    │     └─ Check: running heads, page numbers, placement
    │        → Issues: "Missing running head", "Incorrect page number position"
    │
    │  7. AdvancedCitationValidator.validateAdvancedCitations() (line 209)
    │     └─ Check: et al. rules, secondary sources, personal communication
    │        → Issues: "Incorrect et al. usage", "Missing secondary source format"
    │
    │  8. QuotationValidator.validateQuotations() (line 219)
    │     └─ Check: block quotes, ellipsis, square brackets, page numbers
    │        → Issues: "Direct quote missing page number", "Incorrect ellipsis"
    │
    │  9. StatisticalValidator.validateStatistical() (line 230)
    │     └─ Check: italicization, decimal places, leading zeros
    │        → Issues: "p-value not italicized", "Incorrect decimal places"
    │
    │  10. BiasFreeLanguageValidator.validateBiasFreeLanguage() (line 241)
    │      └─ Check: gendered language, person-first language, inclusive terms
    │         → Issues: "Use gender-neutral language", "Person-first language preferred"
    │
    │  11. ComprehensiveValidator + AdditionalAPARules (line 253-278)
    │      └─ Check: lists, abbreviations, appendices, footnotes, equations
    │         → Issues: "Serial comma missing", "Abbreviation not defined"
    │
    └─ Deduplicate and prioritize issues:
       └─ prioritizeAndDeduplicateIssues() (line 1136)
          ├─ Remove duplicates by title + text
          └─ Sort by: severity (Critical > Major > Minor) → category
```

**Issue Data Structure:**

```javascript
{
  id: 'formatting-Major-0',
  title: 'Incorrect font family',
  description: 'Document uses "Arial" instead of Times New Roman',
  text: 'Introduction\nThe purpose of this study...',
  highlightText: 'Introduction',
  severity: 'Major',  // Critical | Major | Minor
  category: 'formatting',  // formatting | structure | citations | references
  location: {
    type: 'document',  // or 'paragraph', 'citation', etc.
    section: 'font',
    paragraphIndex: 0,
    charOffset: 0,
    length: 50
  },
  hasFix: true,
  fixAction: 'fixFont',
  fixValue: { fontFamily: 'Times New Roman' },
  explanation: 'APA 7th edition requires Times New Roman 12pt font throughout the document.'
}
```

**Analysis Flow Continues:**

```
src/services/DocumentService.js:137-150 → After analysis
    │
    ├─ Update document model with issues
    │  └─ _updateDocumentIssues() (line 443)
    │     ├─ Clear existing issues
    │     ├─ Add each issue to IssueTracker
    │     └─ Associate issues with paragraphs
    │
    ├─ Calculate compliance score (line 479)
    │  └─ Formula: 100 - (critical×8 + major×4 + minor×1.5)
    │
    └─ Return analysis result
    ↓
src/store/unifiedDocumentStore.js:266-305 → Update store
    │
    ├─ Update processingState (isAnalyzing: false)
    ├─ Set lastAnalysisTimestamp
    └─ Emit 'analysisComplete' event
    ↓
EDITOR RESPONDS TO EVENT
    ↓
src/hooks/useUnifiedDocumentEditor.js:468-483 → Event listener
    │
    └─ Update issue highlights in editor
       └─ updateIssueHighlights() (line 245)
          └─ IssueHighlighter extension updates decorations
```

---

### Phase 5: Real-Time Issue Highlighting

```
ISSUES UPDATED IN STORE
    ↓
src/utils/tiptapIssueHighlighter.js → IssueHighlighter Extension
    │
    ├─ decorations() method creates ProseMirror decorations
    │  │
    │  └─ For each issue:
    │     ├─ Extract search text (highlightText or text)
    │     ├─ Handle truncation (ends with '...')
    │     │
    │     ├─ Search strategy:
    │     │  ├─ If paragraphIndex specified → search in specific paragraph
    │     │  └─ Else → search entire document
    │     │
    │     ├─ Find positions in document:
    │     │  └─ doc.descendants() to traverse nodes
    │     │     ├─ Match text content
    │     │     ├─ Calculate from/to positions
    │     │     └─ Handle truncated text (match + 20 chars)
    │     │
    │     └─ Create decoration:
    │        └─ Decoration.inline(from, to, {
    │              class: 'apa-issue-highlight severity-{Critical|Major|Minor}',
    │              'data-issue-id': issue.id,
    │              'data-severity': issue.severity,
    │              onclick: setActiveIssue(issue.id)
    │            })
    │
    └─ Return DecorationSet with all highlights
    ↓
RENDERED IN EDITOR
    │
    └─ CSS styling (src/styles/tiptap.css):
       ├─ Critical: red background (rgba(239, 68, 68, 0.2))
       ├─ Major: orange background (rgba(251, 146, 60, 0.2))
       └─ Minor: blue background (rgba(59, 130, 246, 0.15))
```

---

### Phase 6: Issues Panel Display

```
ISSUES AVAILABLE IN STORE
    ↓
src/components/IssuesPanel.js:26-502 → IssuesPanel component
    │
    ├─ Get issues via getIssues() (line 38)
    │  └─ src/store/unifiedDocumentStore.js:487-505
    │     └─ Corrects hasFix based on actual implementation
    │        └─ DocumentService.isFixImplemented() (line 510)
    │
    ├─ Group issues by severity (line 56):
    │  ├─ groupedIssues.Critical
    │  ├─ groupedIssues.Major
    │  └─ groupedIssues.Minor
    │
    ├─ Separate document formatting issues (line 58)
    │  └─ location.type === 'document' && category === 'formatting'
    │
    ├─ Calculate statistics:
    │  ├─ Compliance score → getComplianceScore() (line 41)
    │  └─ Document stats → getDocumentStats() (line 40)
    │
    ├─ Render tabs (line 222):
    │  ├─ Issues tab (default)
    │  └─ Overview/Stats tab
    │
    └─ For each issue category:
       └─ IssueCategory component (line 505)
          └─ Expandable/collapsible
          └─ For each issue:
             └─ IssueItem component (line 577)
                ├─ Display: title, description, text excerpt, explanation
                ├─ Click handler → setActiveIssue() (line 590)
                │  └─ Triggers highlighting + scrolling
                │
                └─ "Apply Fix" button (if hasFix) (line 615)
                   └─ Calls applyFix(issue.id)
```

---

### Phase 7: User Interaction - Selecting an Issue

```
USER CLICKS ON ISSUE
    ↓
src/components/IssuesPanel.js:590 → onClick handler
    ↓
src/store/unifiedDocumentStore.js:542-558 → setActiveIssue()
    │
    ├─ Update uiState.activeIssueId
    └─ Emit 'activeIssueChanged' event with shouldScroll: true
    ↓
EDITOR RESPONDS
    ↓
src/hooks/useUnifiedDocumentEditor.js:423-433 → Event listener
    │
    └─ Trigger scrollToIssue() (line 269)
       │
       ├─ Find issue by ID
       ├─ Extract search text (highlightText or text)
       ├─ Search document using same logic as highlighter
       │  ├─ If paragraphIndex → search specific paragraph
       │  └─ Else → search entire document
       │
       └─ Scroll to position:
          └─ editor.chain()
               .focus()
               .setTextSelection({ from, to })
               .scrollIntoView()
               .run()
    ↓
ISSUES PANEL AUTO-SCROLL
    ↓
src/components/IssuesPanel.js:94-155 → useEffect for activeIssueId
    │
    ├─ Find issue severity
    ├─ Auto-expand category if collapsed
    ├─ Scroll issue into view in panel
    └─ Add highlight animation (CSS class)
```

---

### Phase 8: User Interaction - Applying a Fix

```
USER CLICKS "Apply Fix" BUTTON
    ↓
src/components/IssuesPanel.js:618-620 → onClick handler
    ↓
src/store/unifiedDocumentStore.js:311-381 → applyFix(issueId)
    │
    ├─ Update processingState (isApplyingFix: true, currentFixId)
    ├─ Create snapshot for undo
    ↓
src/services/DocumentService.js:156-214 → applyFix()
    │
    ├─ Get issue from document model
    ├─ Validate hasFix and fixAction
    │
    ├─ Determine fix type:
    │  ├─ Server formatting fix? (line 489)
    │  │  └─ fixFont, fixFontSize, fixLineSpacing, fixMargins, fixIndentation
    │  │
    │  └─ Client content fix? (line 496)
    │     └─ addCitationComma, fixParentheticalConnector, fixEtAlFormatting
    │
    └─ Route to appropriate handler:
```

**Path A: Server Formatting Fix**

```
src/services/DocumentService.js:514-614 → _applyServerFormattingFix()
    │
    ├─ Decompress document buffer
    ├─ Convert to base64
    ├─ HTTP POST → /api/apply-fix
    │  └─ Body: { documentBuffer, fixAction, fixValue, originalFilename }
    ↓
SERVER SIDE
    ↓
server/routes/docx.js:222-465 → POST /api/apply-fix handler
    │
    ├─ Validate request (line 268)
    ├─ Convert base64 to buffer (line 288)
    ├─ Check buffer size limit (50MB)
    │
    ├─ Call DocxModifier.applyFormattingFix() (line 331)
    ↓
server/processors/DocxModifier.js:19-52 → applyFormattingFix()
    │
    ├─ Create PizZip from buffer (line 34)
    ├─ Call modifyDocumentXML() (line 38)
    ↓
server/processors/DocxModifier.js:57-133 → modifyDocumentXML()
    │
    ├─ Get word/document.xml (line 62)
    ├─ Read as text (line 69)
    │
    ├─ Apply fix based on fixAction:
    │  ├─ fixFont → fixFontFamily() (line 75, 138)
    │  │  └─ Regex replace: <w:rFonts w:ascii="..." w:hAnsi="..."/>
    │  │
    │  ├─ fixFontSize → fixFontSize() (line 79, 166)
    │  │  └─ Regex replace: <w:sz w:val="24"/> (24 half-points = 12pt)
    │  │
    │  ├─ fixLineSpacing → fixLineSpacing() (line 83, 202)
    │  │  └─ Regex replace: <w:spacing w:line="480" w:lineRule="auto"/>
    │  │
    │  ├─ Content fixes (citations) → fixTextContent() (line 88-109, 270)
    │  │  └─ DOM-based text replacement in <w:t> elements
    │  │     └─ DOMParser → find w:t elements → replace text → serialize
    │  │
    │  └─ Update word/styles.xml if needed (line 120)
    │
    ├─ Update ZIP with modified XML (line 117)
    └─ Generate modified DOCX buffer (line 41)
    ↓
server/routes/docx.js:375-406 → Reprocess modified document
    │
    ├─ Call XmlDocxProcessor.processDocumentBuffer() (line 375)
    │  └─ Full XML processing (same as upload)
    │     → Returns updated document data
    │
    └─ Return response:
       {
         success: true,
         document: { html, text, formatting, structure, styles, ... },
         modifiedDocumentBuffer: base64String,
         fixApplied: fixAction
       }
    ↓
CLIENT RECEIVES RESPONSE
    ↓
src/services/DocumentService.js:545-613 → Update DocumentModel
    │
    ├─ Update formatting (line 549)
    ├─ Update structure (line 555)
    ├─ Update styles (line 561)
    ├─ Update HTML and text (line 567-574)
    │
    ├─ Rebuild paragraphs from server data (line 578):
    │  └─ Clear existing paragraphs
    │  └─ Create new ParagraphModel instances
    │
    ├─ Update document buffer (line 597)
    ├─ Increment version (line 604)
    └─ Return success
    ↓
src/store/unifiedDocumentStore.js:335-361 → After fix applied
    │
    ├─ Remove fixed issue from document model (line 187)
    ├─ Update processingState (isApplyingFix: false)
    ├─ Set editorState.needsSync = true
    └─ Emit 'fixApplied' event
    ↓
EDITOR RESPONDS
    ↓
src/hooks/useUnifiedDocumentEditor.js:452-465 → Event listener
    │
    └─ Sync editor from updated model
       └─ syncEditorFromModel() (line 168)
          └─ getTiptapJson() → setContent()
          └─ User sees updated content with fix applied!
```

**Path B: Client Content Fix**

```
src/services/DocumentService.js:616-661 → _applyClientContentFix()
    │
    ├─ Find paragraph containing issue text
    ├─ Apply fix based on fixAction:
    │  │
    │  ├─ addCitationComma (line 632)
    │  │  └─ Replace: (Author YEAR) → (Author, YEAR)
    │  │
    │  ├─ fixParentheticalConnector (line 634)
    │  │  └─ Replace: ' and ' → ' & '
    │  │
    │  └─ fixEtAlFormatting (line 636)
    │     └─ Replace: ', et al.' → ' et al.'
    │
    ├─ Update paragraph text in document model
    └─ Return success (updatedDocument: false)
    ↓
src/store/unifiedDocumentStore.js:335-361 → After fix applied
    │
    ├─ Remove fixed issue (line 187)
    ├─ Set editorState.needsSync = true
    ├─ Emit 'fixApplied' event
    └─ Schedule incremental analysis (line 358)
    ↓
EDITOR & ANALYSIS UPDATE
    │
    ├─ Editor syncs from model (updated paragraph text)
    └─ Incremental analysis revalidates changed paragraph
```

---

### Phase 9: Real-Time Editing & Incremental Analysis

```
USER TYPES IN EDITOR
    ↓
src/hooks/useUnifiedDocumentEditor.js:72-106 → onUpdate callback
    │
    ├─ Skip if internal update (from sync)
    ├─ Get current editor JSON
    ├─ Check if content changed (compare with lastContentRef)
    │
    └─ Debounce sync (300ms) to avoid excessive updates
       └─ setTimeout → performSync() (line 99)
    ↓
src/hooks/useUnifiedDocumentEditor.js:133-163 → performSync()
    │
    └─ Call syncWithEditor() from store
    ↓
src/store/unifiedDocumentStore.js:388-429 → syncWithEditor()
    ↓
src/services/DocumentService.js:258-283 → syncWithEditor()
    ↓
src/models/DocumentModel.js:206-279 → applyEditorChanges()
    │
    ├─ For each paragraph in editor JSON:
    │  ├─ Find corresponding ParagraphModel by index
    │  ├─ Extract text from Tiptap node
    │  ├─ Compare with existing text
    │  │
    │  └─ If changed:
    │     ├─ Update paragraph.text
    │     ├─ Update runs (formatted text segments)
    │     ├─ Mark paragraph as modified (lastModified timestamp)
    │     └─ Add to affectedParagraphs set
    │
    ├─ Handle new paragraphs (added in editor)
    ├─ Handle deleted paragraphs (removed from editor)
    │
    ├─ If hasChanges:
    │  ├─ Increment document version
    │  ├─ Record in ChangeLog
    │  └─ Invalidate issues for affected paragraphs
    │
    └─ Return: { success, hasChanges, changedParagraphs, needsReanalysis }
    ↓
src/store/unifiedDocumentStore.js:399-415 → After sync
    │
    ├─ Update editorState (lastSyncTimestamp, needsSync: false)
    ├─ Set analysisState.pendingAnalysis
    └─ Call scheduleIncrementalAnalysis()
    ↓
src/store/unifiedDocumentStore.js:446-469 → scheduleIncrementalAnalysis()
    │
    ├─ Clear existing timeout
    └─ setTimeout (3 seconds debounce) → analyzeDocument({ incrementalOnly: true })
    ↓
src/services/DocumentService.js:399-441 → _performIncrementalAnalysis()
    │
    ├─ Get existing issues
    ├─ Invalidate issues for changed paragraphs
    │
    ├─ Re-analyze with full context but focus on changes:
    │  └─ enhancedApaAnalyzer.analyzeDocument(documentData)
    │     └─ Validators run on full document (with changedParagraphs hint)
    │
    ├─ Merge results:
    │  ├─ Keep: unchanged issues
    │  └─ Add: new issues from reanalysis
    │
    └─ Return merged issue list
    ↓
ISSUES UPDATED
    │
    ├─ Document model issues updated
    ├─ Store emits 'analysisComplete' event
    └─ Editor updates highlights automatically
```

---

### Phase 10: Document Export

```
USER CLICKS "Export" BUTTON
    ↓
src/components/Header.js:141-153 → handleExport(format)
    ↓
src/store/unifiedDocumentStore.js:655-662 → exportDocument(format)
    ↓
src/services/DocumentService.js:288-327 → exportDocument()
    │
    ├─ Switch on format:
    │
    │  ├─ format === 'html' (line 294):
    │  │  └─ Generate HTML export:
    │  │     └─ _generateHtmlExport() (line 715)
    │  │        ├─ Wrap in <!DOCTYPE html>
    │  │        ├─ Add APA-compliant styles
    │  │        └─ Include formatted HTML from document model
    │  │
    │  ├─ format === 'docx' (line 302):
    │  │  ├─ Decompress currentBuffer
    │  │  └─ Return binary buffer for download
    │  │
    │  └─ format === 'text' (line 317):
    │     └─ Return plain text from document model
    │
    └─ Return: { success, format, content, filename }
    ↓
src/components/Header.js:146 → Create download
    │
    ├─ Create Blob from content
    ├─ Create download URL
    ├─ Trigger browser download
    └─ Revoke URL after download
```

---

## Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                USER INTERFACE                                 │
│  ┌─────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐  │
│  │   Header.js     │  │ NewDocumentEditor.js │  │   IssuesPanel.js       │  │
│  │                 │  │                      │  │                        │  │
│  │  • File Upload  │  │  • Tiptap Editor     │  │  • Issue Categories    │  │
│  │  • Export       │  │  • Real-time Edit    │  │  • Apply Fix Buttons   │  │
│  │  • Statistics   │  │  • Highlighting      │  │  • Compliance Score    │  │
│  └────────┬────────┘  └──────────┬───────────┘  └───────────┬────────────┘  │
└───────────┼───────────────────────┼──────────────────────────┼───────────────┘
            │                       │                          │
            │                       │                          │
            ▼                       ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           STATE MANAGEMENT (Zustand)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │              unifiedDocumentStore.js (Single Source of Truth)          │  │
│  │                                                                         │  │
│  │  • documentModel: DocumentModel (primary state)                        │  │
│  │  • processingState: { isUploading, isAnalyzing, isApplyingFix, ... }  │  │
│  │  • editorState: { content, needsSync, lastSyncTimestamp, ... }        │  │
│  │  • uiState: { activeIssueId, showIssueHighlighting, ... }             │  │
│  │                                                                         │  │
│  │  Actions:                                                               │  │
│  │  ├─ uploadDocument(file) ──────────────┐                              │  │
│  │  ├─ analyzeDocument(options) ──────────┼──────────────┐               │  │
│  │  ├─ applyFix(issueId) ─────────────────┼──────────────┼───┐           │  │
│  │  ├─ syncWithEditor(tiptapDoc) ─────────┼──────────────┼───┼───┐       │  │
│  │  ├─ setActiveIssue(id) ────────────────┼──────────────┼───┼───┼─┐     │  │
│  │  └─ exportDocument(format) ────────────┼──────────────┼───┼───┼─┼─┐   │  │
│  └────────────────────────────────────────┼──────────────┼───┼───┼─┼─┼───┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │              │   │   │ │ │
                                            ▼              ▼   ▼   ▼ ▼ ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             SERVICE LAYER                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        DocumentService.js                              │  │
│  │                                                                         │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────┐  ┌─────────────┐│  │
│  │  │ loadDocument │  │analyzeDocument│  │  applyFix  │  │exportDocument││  │
│  │  │              │  │               │  │            │  │              ││  │
│  │  │ • HTTP POST  │  │ • Extract data│  │ • Server   │  │ • HTML       ││  │
│  │  │ • Create     │  │ • Call        │  │   format   │  │ • DOCX       ││  │
│  │  │   Model      │  │   analyzer    │  │ • Client   │  │ • Text       ││  │
│  │  │              │  │ • Update      │  │   content  │  │              ││  │
│  │  └──────┬───────┘  └───────┬───────┘  └──────┬─────┘  └──────────────┘│  │
│  └─────────┼──────────────────┼──────────────────┼────────────────────────┘  │
└────────────┼──────────────────┼──────────────────┼───────────────────────────┘
             │                  │                  │
             ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DOMAIN MODELS                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                           DocumentModel.js                             │  │
│  │                                                                         │  │
│  │  • paragraphs: Map<id, ParagraphModel>                                │  │
│  │  • paragraphOrder: string[]                                            │  │
│  │  • formatting: FormattingModel                                         │  │
│  │  • structure: StructureModel                                           │  │
│  │  • issues: IssueTracker                                                │  │
│  │  • changeLog: ChangeLog                                                │  │
│  │                                                                         │  │
│  │  Methods:                                                               │  │
│  │  ├─ getPlainText() ─────────────────────────────────┐                 │  │
│  │  ├─ getFormattedHtml() ─────────────────────────────┼──────┐          │  │
│  │  ├─ getTiptapJson() ────────────────────────────────┼──────┼──────┐   │  │
│  │  ├─ updateParagraph(id, changes) ───────────────────┼──────┼──────┼─┐ │  │
│  │  ├─ applyEditorChanges(tiptapDoc) ──────────────────┼──────┼──────┼─┤ │  │
│  │  ├─ getStatistics() ────────────────────────────────┼──────┼──────┼─┤ │  │
│  │  ├─ createSnapshot() ───────────────────────────────┼──────┼──────┼─┤ │  │
│  │  └─ restoreFromSnapshot(snapshot) ──────────────────┼──────┼──────┼─┤ │  │
│  └─────────────────────────────────────────────────────┼──────┼──────┼─┼─┘  │
└────────────────────────────────────────────────────────┼──────┼──────┼─┼────┘
                                                         │      │      │ │
                                                         ▼      ▼      ▼ ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         APA VALIDATION ENGINE                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    enhancedApaAnalyzer.js                              │  │
│  │                                                                         │  │
│  │  11 Specialized Validators:                                            │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 1. ReferenceValidator        → Alphabetical, Hanging Indent      │ │  │
│  │  │ 2. AdvancedCitationValidator → Et al., Secondary Sources         │ │  │
│  │  │ 3. TableFigureValidator      → Numbering, Borders, Callouts      │ │  │
│  │  │ 4. QuotationValidator        → Block Quotes, Page Numbers        │ │  │
│  │  │ 5. StatisticalValidator      → Italics, Decimals, p-values       │ │  │
│  │  │ 6. BiasFreeLanguageValidator → Inclusive Language, Person-First  │ │  │
│  │  │ 7. HeaderFooterValidator     → Running Heads, Page Numbers       │ │  │
│  │  │ 8. ComprehensiveValidator    → Lists, Abbreviations, Appendices  │ │  │
│  │  │ 9. AdditionalAPARules        → Footnotes, Equations, Legal       │ │  │
│  │  │10. Basic Structure           → Sections, Hierarchy               │ │  │
│  │  │11. Formatting Analysis       → Font, Spacing, Margins            │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                         │  │
│  │  Output: Issue[]                                                        │  │
│  │  ├─ Deduplicated by title + text                                       │  │
│  │  └─ Prioritized by severity and category                               │  │
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EDITOR EXTENSIONS                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                   Tiptap + Custom Extensions                           │  │
│  │                                                                         │  │
│  │  ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────┐│  │
│  │  │ FormattedParagraph  │  │  FontFormatting Mark │  │IssueHighlighter││  │
│  │  │                     │  │                      │  │                ││  │
│  │  │ • Custom node       │  │ • Custom mark        │  │ • Decorations  ││  │
│  │  │ • Preserves:        │  │ • Attributes:        │  │ • Real-time    ││  │
│  │  │   - Font family     │  │   - fontFamily       │  │ • Click events ││  │
│  │  │   - Font size       │  │   - fontSize         │  │ • Severity     ││  │
│  │  │   - Line height     │  │   - color            │  │   colors       ││  │
│  │  │   - Alignment       │  │   - bold/italic      │  │                ││  │
│  │  │   - Indentation     │  │                      │  │                ││  │
│  │  └─────────────────────┘  └──────────────────────┘  └───────────────┘│  │
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      Express Server (port 3001)                        │  │
│  │                                                                         │  │
│  │  Routes:                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────────┐      │  │
│  │  │ POST /api/upload-docx                                       │      │  │
│  │  │ ├─ Multer file upload (10MB limit)                          │      │  │
│  │  │ ├─ ZIP signature validation                                 │      │  │
│  │  │ └─ XmlDocxProcessor.processDocument()                       │      │  │
│  │  │    ├─ PizZip extraction                                      │      │  │
│  │  │    ├─ XML parsing (xml2js)                                   │      │  │
│  │  │    ├─ Extract: text, HTML, formatting, structure, styles    │      │  │
│  │  │    └─ Return comprehensive document data                    │      │  │
│  │  └─────────────────────────────────────────────────────────────┘      │  │
│  │                                                                         │  │
│  │  ┌─────────────────────────────────────────────────────────────┐      │  │
│  │  │ POST /api/apply-fix                                         │      │  │
│  │  │ ├─ Receive: documentBuffer (base64), fixAction, fixValue    │      │  │
│  │  │ ├─ DocxModifier.applyFormattingFix()                        │      │  │
│  │  │    ├─ Load ZIP from buffer                                   │      │  │
│  │  │    ├─ Modify word/document.xml                               │      │  │
│  │  │    │  └─ Regex/DOM manipulation                              │      │  │
│  │  │    ├─ Update word/styles.xml if needed                       │      │  │
│  │  │    └─ Generate modified DOCX buffer                          │      │  │
│  │  │ ├─ XmlDocxProcessor.processDocumentBuffer()                 │      │  │
│  │  │ └─ Return: updated document data + modifiedDocumentBuffer   │      │  │
│  │  └─────────────────────────────────────────────────────────────┘      │  │
│  │                                                                         │  │
│  │  ┌─────────────────────────────────────────────────────────────┐      │  │
│  │  │ GET /api/health                                             │      │  │
│  │  │ └─ Server health and status                                 │      │  │
│  │  └─────────────────────────────────────────────────────────────┘      │  │
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DOCUMENT PROCESSORS                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      XmlDocxProcessor.js                               │  │
│  │                                                                         │  │
│  │  ┌──────────────────┐  ┌────────────────┐  ┌────────────────────────┐│  │
│  │  │ PizZip           │  │ xml2js Parser  │  │ Data Extraction        ││  │
│  │  │                  │  │                │  │                        ││  │
│  │  │ • ZIP extraction │  │ • Parse:       │  │ • Plain text           ││  │
│  │  │ • Read XML files │  │   - document.xml│  │ • Formatted HTML       ││  │
│  │  │ • word/*.xml     │  │   - styles.xml │  │ • Formatting details   ││  │
│  │  │   access         │  │   - settings   │  │ • Document structure   ││  │
│  │  │                  │  │   - headers    │  │ • Tables & borders     ││  │
│  │  │                  │  │   - footers    │  │ • Italicized text      ││  │
│  │  └──────────────────┘  └────────────────┘  └────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                       DocxModifier.js                                  │  │
│  │                                                                         │  │
│  │  ┌──────────────────┐  ┌────────────────┐  ┌────────────────────────┐│  │
│  │  │ PizZip           │  │ XML Manipulation│  │ Supported Fixes        ││  │
│  │  │                  │  │                │  │                        ││  │
│  │  │ • Load from      │  │ • DOMParser    │  │ • fixFont              ││  │
│  │  │   buffer         │  │ • XMLSerializer│  │ • fixFontSize          ││  │
│  │  │ • Modify XML     │  │ • Regex replace│  │ • fixLineSpacing       ││  │
│  │  │ • Generate ZIP   │  │ • Safe escaping│  │ • fixMargins           ││  │
│  │  │                  │  │                │  │ • fixIndentation       ││  │
│  │  │                  │  │                │  │ • Citation text fixes  ││  │
│  │  └──────────────────┘  └────────────────┘  └────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Technical Details

### 1. **Bidirectional Synchronization**

The system maintains synchronization between DocumentModel and Tiptap editor:

- **Model → Editor**: `DocumentModel.getTiptapJson()` converts paragraph models to Tiptap JSON
- **Editor → Model**: `DocumentModel.applyEditorChanges()` updates paragraph models from editor JSON
- **Debouncing**: 300ms for editor sync, 3s for analysis to optimize performance

### 2. **Issue Highlighting Algorithm**

Located in `src/utils/tiptapIssueHighlighter.js`:

```javascript
// For each issue:
1. Extract searchText = issue.highlightText || issue.text
2. Handle truncation (if ends with '...')
3. Search strategy:
   - If paragraphIndex specified → search in specific paragraph
   - Else → traverse entire document
4. Find all occurrences using doc.descendants()
5. Create Decoration.inline(from, to, attrs)
6. Apply severity-based CSS class
7. Add click handler → setActiveIssue()
```

### 3. **Memory Management**

- **Compression**: DOCX buffers compressed with gzip (browser CompressionStream API)
- **Cleanup**: Temporary files deleted after processing
- **Garbage Collection**: Explicit `global.gc()` calls after heavy operations
- **Cache Invalidation**: Statistics cached by document version

### 4. **Error Handling Strategy**

Multi-layered approach:
1. **Component-level**: Error boundaries (ErrorBoundary.js, EditorErrorBoundary.js, AnalysisErrorBoundary.js)
2. **Validator-level**: Try-catch with standardized error issues
3. **API-level**: HTTP error codes with user-friendly messages
4. **File processing**: Validation before processing, cleanup on error

### 5. **Incremental Analysis Performance**

90% faster than full analysis:
- Tracks changed paragraphs by timestamp
- Only revalidates affected content
- Preserves unchanged issues
- Uses same validators with focused context

### 6. **Snapshot System for Undo**

```javascript
Snapshot = {
  id: UUID,
  timestamp: Date.now(),
  version: documentModel.version,
  paragraphs: Map (shallow copy),
  paragraphOrder: Array (copy),
  formatting: FormattingModel (cloned),
  issues: IssueTracker (cloned)
}
```

Maximum 10 snapshots stored (FIFO queue).

---

## API Endpoints

### POST `/api/upload-docx`

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with `document` field (.docx file)

**Response:**
```json
{
  "success": true,
  "document": {
    "html": "<div class=\"docx-document\">...</div>",
    "text": "Plain text content...",
    "formatting": {
      "document": { "font": {...}, "spacing": {...}, ... },
      "paragraphs": [ {...}, ... ],
      "compliance": { "overall": 85, ... }
    },
    "structure": {
      "headings": [...],
      "sections": [...],
      "citations": [...],
      "references": [...],
      "tables": [...],
      "italicizedText": [...]
    },
    "styles": { "styles": [...], "defaultStyle": {...} },
    "headersFooters": { "headers": [...], "footers": [...] },
    "processingInfo": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "fileSize": 52480,
      "wordCount": 1250,
      "processor": "XmlDocxProcessor"
    }
  }
}
```

### POST `/api/apply-fix`

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
```json
{
  "documentBuffer": "base64-encoded-docx-buffer",
  "fixAction": "fixFont",
  "fixValue": { "fontFamily": "Times New Roman" },
  "originalFilename": "document.docx"
}
```

**Response:**
```json
{
  "success": true,
  "document": { /* Updated document data */ },
  "modifiedDocumentBuffer": "base64-encoded-modified-buffer",
  "fixApplied": "fixFont",
  "message": "Successfully applied fixFont and reprocessed document"
}
```

### GET `/api/health`

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "memory": { "heapUsed": 45678, ... },
  "services": {
    "xmlProcessor": "healthy",
    "docxModifier": "healthy",
    "fileSystem": "healthy"
  }
}
```

---

## Issue Categories & Severity Levels

### Severity Classification

1. **Critical** (Red) - Blocks APA compliance
   - Examples: Missing references section, empty document, major formatting violations

2. **Major** (Orange) - Important APA violations
   - Examples: Incorrect font, wrong line spacing, improper heading hierarchy

3. **Minor** (Blue) - Style improvements
   - Examples: Missing comma in citation, spacing issues, bias-free language suggestions

### Issue Categories

- **formatting**: Font, spacing, margins, indentation
- **structure**: Sections, headings, organization
- **citations**: In-text citation format
- **references**: Reference list formatting
- **tables**: Table and figure compliance
- **content**: Text content issues
- **system**: Analysis errors

---

## Performance Optimizations

### Client-Side

1. **Async Document Conversion**: UI yielding with MessageChannel/setTimeout
2. **Batch Processing**: 50-100 paragraph batches for large documents
3. **Debounced Analysis**: 3s delay for real-time editing
4. **Debounced Editor Sync**: 300ms for responsive editing
5. **Memory Monitoring**: Checks with gc recommendations
6. **Statistics Caching**: Cached by document version

### Server-Side

1. **Memory-Based Processing**: No persistent file storage
2. **Streaming XML Parsing**: Efficient for large documents
3. **Efficient ZIP Handling**: PizZip optimized operations
4. **Request Size Limits**: 50MB with proper error handling
5. **Automatic Cleanup**: Temporary files deleted immediately
6. **Timeout Protection**: 60s for fix application, 2min for upload

---

## File Structure Reference

```
src/
├── app/
│   ├── globals.css
│   ├── layout.js                 # Root layout with ErrorBoundary
│   └── page.js                   # Main page with split panels
│
├── components/
│   ├── Header.js                 # File upload, export, user menu
│   ├── NewDocumentEditor.js      # Main editor component
│   ├── IssuesPanel.js            # Issue display with categories
│   ├── LoadingState.js           # Upload/analysis progress
│   ├── EmptyDocumentState.js     # Empty state prompt
│   ├── DocumentControls.js       # Document actions toolbar
│   ├── FormattingToolbar.js      # Text formatting controls
│   ├── ErrorBoundary.js          # General error boundary
│   ├── EditorErrorBoundary.js    # Editor-specific errors
│   └── AnalysisErrorBoundary.js  # Analysis-specific errors
│
├── store/
│   └── unifiedDocumentStore.js   # Zustand store (single source of truth)
│
├── services/
│   └── DocumentService.js        # Business logic & API calls
│
├── models/
│   ├── DocumentModel.js          # Main document model with nested classes
│   └── ParagraphModel.js         # Paragraph model with runs
│
├── hooks/
│   ├── useUnifiedDocumentEditor.js  # Tiptap editor integration
│   ├── useKeyboardShortcuts.js      # Keyboard navigation
│   └── useTextReplacement.js        # Text replacement utilities
│
├── utils/
│   ├── enhancedApaAnalyzer.js    # Main analyzer orchestrator
│   ├── referenceValidator.js     # Reference list validation
│   ├── advancedCitationValidator.js  # Complex citation rules
│   ├── tableFigureValidator.js   # Table/figure formatting
│   ├── quotationValidator.js     # Quote formatting
│   ├── statisticalValidator.js   # Statistical notation
│   ├── biasFreeLanguageValidator.js  # Inclusive language
│   ├── headerFooterValidator.js  # Headers/footers/running heads
│   ├── comprehensiveValidator.js # Lists/abbreviations/appendices
│   ├── additionalApaRules.js     # Footnotes/equations/legal
│   ├── tiptapFormattingExtensions.js  # Custom Tiptap nodes/marks
│   ├── tiptapIssueHighlighter.js # Real-time highlighting
│   ├── ChangeTracker.js          # Change tracking utilities
│   ├── IncrementalAPAAnalyzer.js # Incremental analysis engine
│   └── errorHandler.js           # Error processing utilities
│
├── styles/
│   └── tiptap.css                # Tiptap-specific styles
│
└── config/
    └── features.js               # Feature flags

server/
├── index.js                      # Express server setup
├── routes/
│   └── docx.js                   # Document processing routes
└── processors/
    ├── XmlDocxProcessor.js       # DOCX to data extraction
    └── DocxModifier.js           # DOCX modification for fixes
```

---

## Summary

The APA Document Checker is a comprehensive system that:

1. **Uploads** .docx files and processes them server-side with XML parsing
2. **Creates** a unified DocumentModel as the single source of truth
3. **Renders** the document in a Tiptap rich text editor with preserved formatting
4. **Analyzes** against 11 specialized APA validators
5. **Highlights** issues in real-time with color-coded severity
6. **Applies** fixes either server-side (formatting) or client-side (content)
7. **Syncs** bidirectionally between editor and document model
8. **Reanalyzes** incrementally when content changes (90% faster)
9. **Exports** documents in multiple formats (HTML, DOCX, TXT)
10. **Tracks** changes with snapshots for undo functionality

The architecture emphasizes:
- **Single Source of Truth**: DocumentModel
- **Modular Validators**: 11 specialized APA checkers
- **Bidirectional Sync**: Editor ↔ Model
- **Real-Time Feedback**: Instant highlighting + incremental analysis
- **Performance**: Debouncing, caching, compression, incremental updates
- **Error Resilience**: Multi-layered error boundaries
- **User Experience**: Clear feedback, loading states, helpful messages

---

*Generated: 2024*
*Application: APA Document Checker*
*Architecture: Full-stack JavaScript with unified document model*
