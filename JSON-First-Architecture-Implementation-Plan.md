# JSON-First Architecture Implementation Plan
## APA Document Checker - Performance Optimization

**Objective:** Migrate from DOCX-as-source-of-truth to JSON-as-source-of-truth architecture to achieve <100ms fix application and 1–2s edit-to-analysis cycles.

**Industry Standard:** This approach is used by Google Docs, Notion, Overleaf, Microsoft Office Online, and all modern collaborative editors.

---

## Architecture Philosophy

### Current (Broken) Architecture
```
Edit → DOCX Manipulation → XML Parsing → Re-extraction → Client Update
└─ 3–5 seconds per operation
```

### Target (Industry Standard) Architecture
```
Edit → JSON Mutation → Tiptap Re-render → Background Save → Analysis
└─ <100ms perceived latency
```

**Key Principle:** Serialization formats (DOCX, PDF) are **output artifacts**, not runtime data structures. JSON is the single source of truth; DOCX generated on-demand for export.

---

## Implementation Phases

### Phase 1: Client-Side Fix Application (Priority: CRITICAL)
**Duration:** 2–3 days
**Impact:** 98% of fixes become <100ms (down from 3–5s)

#### 1.1 Text-Based Fixes (JSON Search/Replace)

**Affected Fix Actions:**
- `addCitationComma`: Add comma between author and year
- `fixParentheticalConnector`: Replace "and" with "&" in citations
- `fixEtAlFormatting`: Remove comma before "et al."
- `fixReferenceConnector`: Replace "and" with "&" in references
- `fixAllCapsHeading`: Convert ALL CAPS to Title Case
- `addPageNumber`: Insert page number placeholder in quotes

**Implementation Location:** `src/services/DocumentService.js`

**New Method:**
```javascript
/**
 * Apply text-based fix by mutating paragraph text in DocumentModel
 * @param {DocumentModel} documentModel
 * @param {Object} issue - Issue with fixAction and fixValue
 * @returns {Object} Success result with clientSide: true
 */
_applyTextFixToJSON(documentModel, issue) {
  const { fixAction, fixValue, location } = issue;

  // Find target paragraph
  const paragraphId = location?.paragraphIndex !== undefined
    ? documentModel.paragraphOrder[location.paragraphIndex]
    : null;

  if (!paragraphId) {
    return { success: false, error: 'Paragraph not found' };
  }

  const paragraph = documentModel.paragraphs.get(paragraphId);

  // Apply text replacement
  const oldText = paragraph.text;
  const newText = oldText.replace(
    fixValue.original,
    fixValue.replacement
  );

  if (oldText === newText) {
    return { success: false, error: 'No changes applied' };
  }

  // Update paragraph
  paragraph.update({ text: newText });

  // Update runs if present
  if (paragraph.runs && paragraph.runs.length > 0) {
    paragraph.runs.forEach(run => {
      if (run.text.includes(fixValue.original)) {
        run.text = run.text.replace(
          fixValue.original,
          fixValue.replacement
        );
      }
    });
  }

  // Remove issue
  documentModel.issues.removeIssue(issue.id);
  documentModel.version++;

  // Trigger auto-save (non-blocking)
  this.scheduleAutoSave(documentModel, 1000);

  return {
    success: true,
    clientSide: true,
    paragraphId,
    oldText,
    newText
  };
}
```

**Integration Point:** Modify `applyFix()` method:
```javascript
async applyFix(documentModel, issueId) {
  const issue = documentModel.issues.issues.get(issueId);

  if (!issue || !issue.hasFix) {
    throw new Error('Issue cannot be fixed');
  }

  // Create snapshot for undo
  const snapshot = documentModel.createSnapshot();

  try {
    // Route to appropriate handler
    if (this._isTextFix(issue.fixAction)) {
      return this._applyTextFixToJSON(documentModel, issue);
    }
    else if (this._isFormattingFix(issue.fixAction)) {
      return this._applyFormattingFixToJSON(documentModel, issue);
    }
    else {
      // Fallback to server (legacy, for edge cases)
      return await this._applyServerFormattingFix(documentModel, issue);
    }
  } catch (error) {
    documentModel.restoreFromSnapshot(snapshot);
    throw error;
  }
}

_isTextFix(fixAction) {
  return [
    'addCitationComma',
    'fixParentheticalConnector',
    'fixEtAlFormatting',
    'fixReferenceConnector',
    'fixAllCapsHeading',
    'addPageNumber'
  ].includes(fixAction);
}

_isFormattingFix(fixAction) {
  return [
    'fixFont',
    'fixFontSize',
    'fixLineSpacing',
    'fixMargins',
    'fixIndentation'
  ].includes(fixAction);
}
```

---

#### 1.2 Formatting Fixes (JSON Property Updates)

**Affected Fix Actions:**
- `fixFont`: Set document font to Times New Roman
- `fixFontSize`: Set font size to 12pt
- `fixLineSpacing`: Set line spacing to 2.0 (double)
- `fixMargins`: Set margins to 1 inch all sides
- `fixIndentation`: Set first-line indent to 0.5 inches

**Implementation:**
```javascript
/**
 * Apply formatting fix by updating DocumentModel properties
 * @param {DocumentModel} documentModel
 * @param {Object} issue
 * @returns {Object} Success result
 */
_applyFormattingFixToJSON(documentModel, issue) {
  const { fixAction } = issue;

  switch (fixAction) {
    case 'fixFont':
      // Update document-level default
      documentModel.formatting.document.font.family = 'Times New Roman';

      // Update all paragraph runs
      documentModel.paragraphOrder.forEach(id => {
        const para = documentModel.paragraphs.get(id);
        if (para.runs) {
          para.runs.forEach(run => {
            run.font.family = 'Times New Roman';
          });
        }
      });
      break;

    case 'fixFontSize':
      documentModel.formatting.document.font.size = 12;

      documentModel.paragraphOrder.forEach(id => {
        const para = documentModel.paragraphs.get(id);
        if (para.runs) {
          para.runs.forEach(run => {
            run.font.size = 12;
          });
        }
      });
      break;

    case 'fixLineSpacing':
      documentModel.formatting.document.spacing.line = 2.0;

      documentModel.paragraphOrder.forEach(id => {
        const para = documentModel.paragraphs.get(id);
        if (para.formatting) {
          para.formatting.spacing = para.formatting.spacing || {};
          para.formatting.spacing.line = 2.0;
        }
      });
      break;

    case 'fixMargins':
      documentModel.formatting.document.margins = {
        top: 1.0,
        bottom: 1.0,
        left: 1.0,
        right: 1.0
      };
      break;

    case 'fixIndentation':
      // Apply to all body paragraphs (exclude headings)
      documentModel.paragraphOrder.forEach(id => {
        const para = documentModel.paragraphs.get(id);
        if (para.formatting && !para.style?.includes('heading')) {
          para.formatting.indentation = para.formatting.indentation || {};
          para.formatting.indentation.firstLine = 0.5;
        }
      });
      break;

    default:
      return { success: false, error: `Unknown formatting fix: ${fixAction}` };
  }

  // Remove issue and increment version
  documentModel.issues.removeIssue(issue.id);
  documentModel.version++;
  documentModel.lastModified = Date.now();

  // Trigger editor re-render via store update
  // (Store will call getTiptapJson() which reflects updated formatting)

  // Save to Supabase
  this.scheduleAutoSave(documentModel, 1000);

  return {
    success: true,
    clientSide: true,
    fixAction,
    requiresEditorRefresh: true
  };
}
```

**Tiptap Integration:** Ensure custom extensions read from DocumentModel:
```javascript
// In tiptapFormattingExtensions.js - already partially implemented
export const FontFormatting = Mark.create({
  name: 'fontFormatting',

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: element => element.style.fontFamily,
        renderHTML: attributes => {
          if (!attributes.fontFamily) return {};
          return {
            style: `font-family: ${attributes.fontFamily}`
          };
        }
      },
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return {
            style: `font-size: ${attributes.fontSize}`
          };
        }
      }
    };
  }
});
```

---

### Phase 2: Direct Supabase Auto-Save (Priority: CRITICAL)
**Duration:** 1 day
**Impact:** Removes 4–5s backend dependency from save cycle

#### 2.1 Implement Client-Side Supabase Save

**File:** `src/services/DocumentService.js`

**Add Method:**
```javascript
/**
 * Save document JSON directly to Supabase (no backend)
 * @param {DocumentModel} documentModel
 * @returns {Promise<Object>} Save result
 */
async autoSaveDocument(documentModel) {
  if (!documentModel) {
    throw new Error('No document model provided');
  }

  // Check if Supabase metadata exists
  if (!documentModel.supabase.documentId) {
    console.warn('No Supabase document ID - skipping auto-save');
    return { success: false, error: 'No document ID' };
  }

  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Extract Tiptap JSON
    const tiptapJson = documentModel.getTiptapJson();

    // Save to analysis_results table
    const { data, error } = await supabase
      .from('analysis_results')
      .update({
        tiptap_content: tiptapJson,
        content_saved_at: new Date().toISOString()
      })
      .eq('document_id', documentModel.supabase.documentId)
      .select();

    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }

    // Update or insert if not exists
    if (!data || data.length === 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('analysis_results')
        .insert({
          document_id: documentModel.supabase.documentId,
          tiptap_content: tiptapJson,
          content_saved_at: new Date().toISOString(),
          issues: documentModel.issues.getAllIssues(),
          compliance_score: this._calculateComplianceScore(documentModel.issues.getAllIssues())
        })
        .select();

      if (insertError) throw insertError;
    }

    console.log('✅ Auto-save successful');

    return {
      success: true,
      savedAt: Date.now(),
      documentId: documentModel.supabase.documentId
    };

  } catch (error) {
    console.error('❌ Auto-save failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedule auto-save with configurable debounce
 * @param {DocumentModel} documentModel
 * @param {number} debounceMs - Debounce delay in milliseconds
 */
scheduleAutoSave(documentModel, debounceMs = 2000) {
  // Clear existing timeout
  if (this._autoSaveTimeout) {
    clearTimeout(this._autoSaveTimeout);
  }

  // Schedule new save
  this._autoSaveTimeout = setTimeout(() => {
    this.autoSaveDocument(documentModel).catch(err => {
      console.error('Auto-save error:', err);
    });
  }, debounceMs);
}
```

#### 2.2 Update Store Integration

**File:** `src/store/unifiedDocumentStore.js`

**Modify `performAutoSave` method:**
```javascript
performAutoSave: async () => {
  const state = get();

  if (!state.documentModel || state.autoSaveState.isSaving) {
    return;
  }

  set(currentState => ({
    autoSaveState: {
      ...currentState.autoSaveState,
      isSaving: true,
      saveStatus: 'saving',
      lastSaveError: null
    }
  }));

  try {
    const result = await state.documentService.autoSaveDocument(state.documentModel);

    if (result.success) {
      set(currentState => ({
        autoSaveState: {
          ...currentState.autoSaveState,
          isSaving: false,
          lastSaveTimestamp: result.savedAt,
          saveStatus: 'saved',
          lastSaveError: null
        }
      }));

      storeEvents.emit('documentSaved', { timestamp: result.savedAt });
      console.log('✅ Auto-save completed successfully');
    } else {
      throw new Error(result.error || 'Auto-save failed');
    }

  } catch (error) {
    console.error('❌ Auto-save failed:', error);

    set(currentState => ({
      autoSaveState: {
        ...currentState.autoSaveState,
        isSaving: false,
        saveStatus: 'error',
        lastSaveError: error.message
      }
    }));
  }
}
```

---

### Phase 3: Smart Incremental Analysis (Priority: HIGH)
**Duration:** 2–3 days
**Impact:** 50–70% analysis time reduction

#### 3.1 Validator Categorization System

**File:** `src/utils/IncrementalAPAAnalyzer.js`

**Add Categorization Constants:**
```javascript
// Validator categorization by scope
const VALIDATOR_SCOPES = {
  DOCUMENT_LEVEL: [
    'formatting',      // Font, margins, spacing
    'headerFooter',    // Running heads, page numbers
    'structure'        // Document sections, heading hierarchy
  ],

  CROSS_PARAGRAPH: [
    'references',      // Reference list validation
    'tableFigure',     // Table/figure numbering
    'citations'        // Citation cross-checking with references
  ],

  PARAGRAPH_LEVEL: [
    'quotations',      // Direct quotes
    'statistical',     // Statistical notation
    'biasFree',        // Bias-free language
    'lists',           // Serial commas, parallel structure
    'abbreviations',   // Abbreviation definitions
    'advancedCitation' // et al., secondary sources
  ]
};

// Cache invalidation triggers
const INVALIDATION_TRIGGERS = {
  formattingChanged: ['DOCUMENT_LEVEL'],
  referenceSectionChanged: ['CROSS_PARAGRAPH'],
  citationAddedRemoved: ['CROSS_PARAGRAPH'],
  tableFigureChanged: ['CROSS_PARAGRAPH'],
  paragraphEdited: ['PARAGRAPH_LEVEL']
};
```

**Modify `_performIncrementalAnalysis` method:**
```javascript
_performIncrementalAnalysis(documentData, changedParagraphs) {
  const issues = [];

  // Detect what changed
  const changes = this._detectChanges(documentData, changedParagraphs);

  // 1. Document-level issues (cached unless formatting changed)
  if (changes.formattingChanged) {
    console.log('🔄 Formatting changed - re-analyzing document level');
    const documentIssues = this._analyzeDocumentLevel(documentData);
    this.documentCache.set(this._hashDocumentStructure(documentData), documentIssues);
    issues.push(...documentIssues);
  } else {
    // Use cached document-level issues
    const cachedIssues = this.documentCache.get(this._hashDocumentStructure(documentData));
    if (cachedIssues) {
      console.log('✅ Using cached document-level issues');
      issues.push(...cachedIssues);
    } else {
      // Cache miss - analyze and cache
      const documentIssues = this._analyzeDocumentLevel(documentData);
      this.documentCache.set(this._hashDocumentStructure(documentData), documentIssues);
      issues.push(...documentIssues);
    }
  }

  // 2. Cross-paragraph issues (cached unless dependencies changed)
  if (changes.referenceSectionChanged || changes.citationChanged || changes.tableChanged) {
    console.log('🔄 Cross-paragraph dependencies changed - re-analyzing');
    const crossIssues = this._analyzeCrossParagraphDependencies(documentData);
    this.crossParagraphCache.set(this._hashCrossContent(documentData), crossIssues);
    issues.push(...crossIssues);
  } else {
    // Use cached cross-paragraph issues
    const cachedIssues = this.crossParagraphCache.get(this._hashCrossContent(documentData));
    if (cachedIssues) {
      console.log('✅ Using cached cross-paragraph issues');
      issues.push(...cachedIssues);
    } else {
      const crossIssues = this._analyzeCrossParagraphDependencies(documentData);
      this.crossParagraphCache.set(this._hashCrossContent(documentData), crossIssues);
      issues.push(...crossIssues);
    }
  }

  // 3. Paragraph-level issues (only changed paragraphs)
  const changedParagraphIds = new Set(changedParagraphs.map(p => p.id));
  console.log(`🔍 Analyzing ${changedParagraphs.length} changed paragraphs`);

  if (documentData.formatting?.paragraphs) {
    documentData.formatting.paragraphs.forEach((paragraph, index) => {
      const paragraphId = changedParagraphs.find(cp => cp.index === index)?.id;

      if (paragraphId && changedParagraphIds.has(paragraphId)) {
        // Changed paragraph - re-analyze
        const paragraphIssues = this._analyzeParagraphWithCache(paragraph, index, documentData, true);
        issues.push(...paragraphIssues);
      } else {
        // Unchanged paragraph - use cache
        const paragraphHash = this._hashParagraph(paragraph);
        const cachedIssues = this.paragraphCache.get(paragraphHash);

        if (cachedIssues) {
          issues.push(...cachedIssues);
          this.performanceStats.cacheHitCount++;
        } else {
          // Cache miss - analyze and cache
          const paragraphIssues = this._analyzeParagraphWithCache(paragraph, index, documentData);
          issues.push(...paragraphIssues);
        }
      }
    });
  }

  return {
    issues,
    analysisType: 'incremental',
    cacheStats: {
      documentCacheHit: !changes.formattingChanged,
      crossParagraphCacheHit: !(changes.referenceSectionChanged || changes.citationChanged),
      paragraphCacheHits: this.performanceStats.cacheHitCount
    }
  };
}

/**
 * Detect what changed in the document
 */
_detectChanges(documentData, changedParagraphs) {
  const changes = {
    formattingChanged: false,
    referenceSectionChanged: false,
    citationChanged: false,
    tableChanged: false
  };

  // Check for formatting changes (font, margins, spacing)
  const currentFormattingHash = this._hashDocumentStructure(documentData);
  if (currentFormattingHash !== this._lastFormattingHash) {
    changes.formattingChanged = true;
    this._lastFormattingHash = currentFormattingHash;
  }

  // Check changed paragraphs for specific content
  changedParagraphs.forEach(para => {
    const text = para.text?.toLowerCase() || '';

    // Reference section
    if (text.includes('references') || text.includes('bibliography')) {
      changes.referenceSectionChanged = true;
    }

    // Citations added/removed
    const citationCount = (para.text?.match(/\([^)]+,\s*\d{4}\)/g) || []).length;
    if (citationCount > 0) {
      changes.citationChanged = true;
    }

    // Tables or figures
    if (text.includes('table ') || text.includes('figure ')) {
      changes.tableChanged = true;
    }
  });

  return changes;
}

/**
 * Hash cross-paragraph content for cache key
 */
_hashCrossContent(documentData) {
  const crossContent = {
    citations: documentData.structure?.citations || [],
    references: documentData.structure?.references || [],
    tables: documentData.structure?.tables || [],
    figures: documentData.structure?.figures || []
  };

  return this._hashObject(crossContent);
}

_hashObject(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
```

---

### Phase 4: Optimized Debounce Timings (Priority: HIGH)
**Duration:** 1 day
**Impact:** Reduces artificial latency from 8s to 2s

#### 4.1 Dynamic Debounce Strategy

**File:** `src/store/unifiedDocumentStore.js`

**Update Debounce Methods:**
```javascript
/**
 * Schedule auto-save with smart debounce
 * - 2s for continuous typing
 * - Instant for explicit save button
 */
scheduleAutoSave: (immediate = false) => {
  const state = get();

  // Mark as unsaved immediately
  set(currentState => ({
    autoSaveState: {
      ...currentState.autoSaveState,
      saveStatus: 'unsaved'
    }
  }));

  // Clear existing timeout
  if (state.autoSaveState.autoSaveDebounceTimeout) {
    clearTimeout(state.autoSaveState.autoSaveDebounceTimeout);
  }

  // Immediate save for explicit action
  if (immediate) {
    get().performAutoSave();
    return;
  }

  // Debounced save for typing
  const timeoutId = setTimeout(async () => {
    await get().performAutoSave();
  }, 2000); // Reduced from 5s to 2s

  set(currentState => ({
    autoSaveState: {
      ...currentState.autoSaveState,
      autoSaveDebounceTimeout: timeoutId
    }
  }));
},

/**
 * Schedule incremental analysis with smart debounce
 * - 1s for typing
 * - 100ms after auto-save completes
 */
scheduleIncrementalAnalysis: (debounceMs = 1000) => {
  const state = get();

  // Clear existing timeout
  if (state.analysisState.analysisDebounceTimeout) {
    clearTimeout(state.analysisState.analysisDebounceTimeout);
  }

  const timeoutId = setTimeout(async () => {
    try {
      await get().analyzeDocument({ incrementalOnly: true });
    } catch (error) {
      console.error('Scheduled analysis failed:', error);
    }
  }, debounceMs); // Reduced from 3s to 1s

  set(currentState => ({
    analysisState: {
      ...currentState.analysisState,
      analysisDebounceTimeout: timeoutId,
      pendingAnalysis: true
    }
  }));
}
```

**Update `performAutoSave` to trigger faster analysis:**
```javascript
performAutoSave: async () => {
  // ... existing save logic ...

  if (result.success) {
    set(currentState => ({
      autoSaveState: { /* ... */ }
    }));

    // Trigger fast analysis after save
    get().scheduleIncrementalAnalysis(100); // Quick analysis after save

    storeEvents.emit('documentSaved', { timestamp: result.savedAt });
  }
}
```

---

### Phase 5: DOCX Export on Demand (Priority: MEDIUM)
**Duration:** 2–3 days
**Impact:** Enables full JSON workflow without backend DOCX dependency

#### 5.1 Install DOCX Generation Library

**Command:**
```bash
npm install docx@8.5.0
```

**Library:** [docx.js](https://docx.js.org) - Official OOXML generation library, used in production by thousands of projects.

#### 5.2 Implement Export Service

**File:** `src/services/DocxExportService.js` (NEW FILE)

**Implementation:**
```javascript
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * DOCX Export Service - Generate DOCX from DocumentModel JSON
 */
export class DocxExportService {

  /**
   * Convert DocumentModel to DOCX buffer
   * @param {DocumentModel} documentModel
   * @returns {Promise<Uint8Array>} DOCX file buffer
   */
  async exportToDocx(documentModel) {
    if (!documentModel) {
      throw new Error('No document model provided');
    }

    console.log('📄 Generating DOCX from JSON...');
    const startTime = Date.now();

    // Build DOCX sections
    const sections = [{
      properties: {
        page: {
          margin: {
            top: this._inchesToTwip(documentModel.formatting.document.margins.top || 1.0),
            bottom: this._inchesToTwip(documentModel.formatting.document.margins.bottom || 1.0),
            left: this._inchesToTwip(documentModel.formatting.document.margins.left || 1.0),
            right: this._inchesToTwip(documentModel.formatting.document.margins.right || 1.0)
          }
        }
      },
      children: this._buildParagraphs(documentModel)
    }];

    // Create document
    const doc = new Document({
      sections,
      styles: {
        default: {
          document: {
            run: {
              font: documentModel.formatting.document.font.family || 'Times New Roman',
              size: (documentModel.formatting.document.font.size || 12) * 2 // Convert to half-points
            },
            paragraph: {
              spacing: {
                line: (documentModel.formatting.document.spacing.line || 2.0) * 240,
                before: 0,
                after: 0
              }
            }
          }
        }
      }
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    const exportTime = Date.now() - startTime;
    console.log(`✅ DOCX generated in ${exportTime}ms`);

    return buffer;
  }

  /**
   * Build paragraphs from DocumentModel
   */
  _buildParagraphs(documentModel) {
    const paragraphs = [];

    documentModel.paragraphOrder.forEach(id => {
      const para = documentModel.paragraphs.get(id);
      if (!para) return;

      // Determine if heading or paragraph
      const isHeading = para.style?.toLowerCase().includes('heading');
      const headingLevel = this._extractHeadingLevel(para.style);

      // Build text runs
      const children = this._buildTextRuns(para);

      // Create paragraph
      const paragraphConfig = {
        children,
        spacing: {
          line: (para.formatting?.spacing?.line || 2.0) * 240,
          before: 0,
          after: 0
        }
      };

      // Add indentation if present
      if (para.formatting?.indentation?.firstLine) {
        paragraphConfig.indent = {
          firstLine: this._inchesToTwip(para.formatting.indentation.firstLine)
        };
      }

      // Add alignment if present
      if (para.formatting?.alignment) {
        paragraphConfig.alignment = this._convertAlignment(para.formatting.alignment);
      }

      // Create heading or paragraph
      if (isHeading && headingLevel) {
        paragraphConfig.heading = this._convertHeadingLevel(headingLevel);
        paragraphs.push(new Paragraph(paragraphConfig));
      } else {
        paragraphs.push(new Paragraph(paragraphConfig));
      }
    });

    return paragraphs;
  }

  /**
   * Build text runs from paragraph
   */
  _buildTextRuns(paragraph) {
    const runs = [];

    if (paragraph.runs && paragraph.runs.length > 0) {
      // Use runs if available
      paragraph.runs.forEach(run => {
        if (!run.text) return;

        runs.push(new TextRun({
          text: run.text,
          font: run.font?.family || 'Times New Roman',
          size: (run.font?.size || 12) * 2,
          bold: run.font?.bold || false,
          italics: run.font?.italic || false,
          underline: run.font?.underline ? {} : undefined,
          color: run.color ? run.color.replace('#', '') : undefined
        }));
      });
    } else if (paragraph.text) {
      // Fallback to plain text
      runs.push(new TextRun({
        text: paragraph.text,
        font: 'Times New Roman',
        size: 24 // 12pt
      }));
    }

    return runs;
  }

  // Helper methods
  _inchesToTwip(inches) {
    return Math.round(inches * 1440);
  }

  _extractHeadingLevel(style) {
    if (!style) return null;
    const match = style.match(/heading\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  _convertHeadingLevel(level) {
    const mapping = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6
    };
    return mapping[level] || HeadingLevel.HEADING_1;
  }

  _convertAlignment(align) {
    const mapping = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      both: AlignmentType.JUSTIFIED,
      justify: AlignmentType.JUSTIFIED
    };
    return mapping[align] || AlignmentType.LEFT;
  }
}
```

#### 5.3 Integrate Export Service

**File:** `src/services/DocumentService.js`

**Update `exportDocument` method:**
```javascript
async exportDocument(documentModel, format = 'html') {
  if (!documentModel) {
    throw new Error('Document model required');
  }

  switch (format.toLowerCase()) {
    case 'docx': {
      console.log('📄 Exporting to DOCX from JSON...');

      // Use DOCX export service
      const { DocxExportService } = await import('./DocxExportService');
      const exportService = new DocxExportService();

      const buffer = await exportService.exportToDocx(documentModel);

      return {
        success: true,
        format: 'docx',
        content: buffer,
        filename: `${documentModel.metadata.name || 'document'}.docx`
      };
    }

    case 'html': {
      return {
        success: true,
        format: 'html',
        content: this._generateHtmlExport(documentModel),
        filename: `${documentModel.metadata.name || 'document'}.html`
      };
    }

    case 'text': {
      return {
        success: true,
        format: 'text',
        content: documentModel.getPlainText(),
        filename: `${documentModel.metadata.name || 'document'}.txt`
      };
    }

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
```

---

### Phase 6: Remove Backend DOCX Dependencies (Priority: LOW)
**Duration:** 1 day
**Impact:** Code cleanup, reduces backend complexity

#### 6.1 Deprecate DOCX Manipulation Endpoints

**File:** `server/routes/docx.js`

**Update `/api/apply-fix` endpoint:**
```javascript
router.post('/apply-fix', async (req, res) => {
  console.warn('⚠️ DEPRECATED: /api/apply-fix endpoint called');

  // Return deprecation notice
  res.status(410).json({
    success: false,
    deprecated: true,
    message: 'This endpoint is deprecated. Fixes are now applied client-side.',
    migration: {
      oldFlow: 'Client → /api/apply-fix → DOCX manipulation → Reprocess',
      newFlow: 'Client → JSON mutation → Tiptap re-render → Auto-save',
      documentation: 'See JSON-First-Architecture-Implementation-Plan.md'
    },
    code: 'ENDPOINT_DEPRECATED'
  });
});
```

**Keep `/api/upload-docx` endpoint** - still needed for initial file processing.

#### 6.2 Optional: Backend DOCX Export Service

If you want server-side DOCX generation (for heavy documents or server-side exports):

**File:** `server/routes/docx.js` (NEW ENDPOINT)

```javascript
router.post('/export-docx', async (req, res) => {
  try {
    const { tiptapContent, metadata } = req.body;

    if (!tiptapContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing tiptapContent',
        code: 'MISSING_CONTENT'
      });
    }

    // Use same DocxExportService logic on server
    // (Install docx package in server package.json)
    const { DocxExportService } = require('../services/DocxExportService');
    const exportService = new DocxExportService();

    // Convert to DocumentModel format
    const documentModel = this._tiptapToDocumentModel(tiptapContent, metadata);

    const buffer = await exportService.exportToDocx(documentModel);

    // Return as downloadable file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.name || 'document'}.docx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      details: error.message
    });
  }
});
```

---

## Testing Strategy

### Phase 1 Testing: Fix Application
**Test Cases:**
1. Apply text fix (citation comma) → Verify <100ms response
2. Apply formatting fix (font) → Verify editor re-renders immediately
3. Apply multiple fixes in sequence → Verify no DOCX calls in network tab
4. Undo fix → Verify snapshot restoration works
5. Verify auto-save triggers after fix

**Success Criteria:**
- All fixes complete in <500ms
- No `/api/apply-fix` requests in network inspector
- Editor content updates without full reload

---

### Phase 2 Testing: Auto-Save
**Test Cases:**
1. Edit text → Wait 2s → Verify Supabase update
2. Rapid typing → Verify only one save request (debounced)
3. Save while offline → Verify graceful error handling
4. Reload page → Verify `tiptap_content` loads correctly

**Success Criteria:**
- Supabase `analysis_results.tiptap_content` column updated
- `content_saved_at` timestamp reflects save time
- No backend API calls for save

---

### Phase 3 Testing: Incremental Analysis
**Test Cases:**
1. Edit paragraph → Verify only that paragraph re-analyzed
2. Edit non-citation text → Verify reference validation skipped
3. Edit References section → Verify full cross-paragraph re-analysis
4. Large document (5000+ words) → Verify analysis <1s

**Success Criteria:**
- Console shows "Using cached document-level issues"
- Cache hit rate >80% for typical edits
- Analysis time <1s for single paragraph edit

---

### Phase 4 Testing: Debounce Optimization
**Test Cases:**
1. Type continuously → Verify no analysis until 1s pause
2. Stop typing → Verify analysis starts at 1s mark
3. Apply fix → Verify instant save, 100ms analysis delay

**Success Criteria:**
- Edit → Analysis cycle <2s total
- No excessive API calls during typing

---

### Phase 5 Testing: DOCX Export
**Test Cases:**
1. Export simple document → Verify DOCX opens in Word
2. Export with formatting → Verify fonts, spacing, margins preserved
3. Export with citations → Verify text accuracy
4. Large document export → Verify <5s generation time

**Success Criteria:**
- Generated DOCX opens in Microsoft Word without errors
- Formatting matches Tiptap editor preview
- No content loss during export

---

## Rollback Plan

### If Critical Issues Arise

**Immediate Rollback (Git Revert):**
```bash
git revert HEAD~5  # Revert last 5 commits
git push origin main --force-with-lease
```

**Selective Rollback (Feature Flags):**

**File:** `src/config/features.js`
```javascript
export const FEATURES = {
  CLIENT_SIDE_FIXES: process.env.NEXT_PUBLIC_ENABLE_CLIENT_FIXES !== 'false',
  SUPABASE_AUTO_SAVE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE_SAVE !== 'false',
  SMART_INCREMENTAL_ANALYSIS: process.env.NEXT_PUBLIC_ENABLE_SMART_ANALYSIS !== 'false',
  JSON_DOCX_EXPORT: process.env.NEXT_PUBLIC_ENABLE_JSON_EXPORT !== 'false'
};
```

**Use in Code:**
```javascript
if (FEATURES.CLIENT_SIDE_FIXES && this._isTextFix(fixAction)) {
  return this._applyTextFixToJSON(documentModel, issue);
} else {
  // Fallback to legacy backend fix
  return await this._applyServerFormattingFix(documentModel, issue);
}
```

**Disable Feature via Environment Variable:**
```bash
# .env.local
NEXT_PUBLIC_ENABLE_CLIENT_FIXES=false
```

---

## Performance Benchmarks

### Target Metrics (Post-Implementation)

| Operation | Current | Target | Success Criteria |
|-----------|---------|--------|------------------|
| Text fix application | 3–5s | <100ms | 30x faster |
| Formatting fix | 3–5s | <200ms | 15x faster |
| Edit → Analysis cycle | 8–10s | 1.5–2s | 4–5x faster |
| Auto-save | 5s + network | 2s + 200ms | 2x faster |
| Large doc analysis (5000 words) | 2–3s | 0.8–1.2s | 2x faster |
| DOCX export (new) | N/A | 2–3s | Acceptable |

### Monitoring

**Add Performance Logging:**
```javascript
// In DocumentService.js
async applyFix(documentModel, issueId) {
  const startTime = performance.now();

  // ... fix logic ...

  const duration = performance.now() - startTime;
  console.log(`⚡ Fix applied in ${Math.round(duration)}ms`);

  // Send to analytics (optional)
  if (window.gtag) {
    window.gtag('event', 'fix_applied', {
      fix_action: issue.fixAction,
      duration_ms: Math.round(duration),
      client_side: result.clientSide
    });
  }
}
```

---

## Migration Checklist

### Pre-Implementation
- [ ] Backup production database
- [ ] Create feature branch: `feature/json-first-architecture`
- [ ] Set up staging environment for testing
- [ ] Document current performance baselines

### Phase 1: Client-Side Fixes
- [ ] Implement `_applyTextFixToJSON()` method
- [ ] Implement `_applyFormattingFixToJSON()` method
- [ ] Update `applyFix()` routing logic
- [ ] Add fix type classification helpers
- [ ] Test all 10 fix types
- [ ] Verify Tiptap re-render behavior

### Phase 2: Supabase Auto-Save
- [ ] Implement `autoSaveDocument()` with Supabase client
- [ ] Add error handling for offline scenarios
- [ ] Update `performAutoSave()` in store
- [ ] Test save/load cycle
- [ ] Verify RLS policies work correctly

### Phase 3: Smart Incremental Analysis
- [ ] Add validator categorization constants
- [ ] Implement `_detectChanges()` method
- [ ] Update `_performIncrementalAnalysis()` with caching
- [ ] Add cache invalidation logic
- [ ] Test cache hit rates

### Phase 4: Debounce Optimization
- [ ] Update `scheduleAutoSave()` to 2s
- [ ] Update `scheduleIncrementalAnalysis()` to 1s
- [ ] Add immediate save option for explicit actions
- [ ] Test typing scenarios

### Phase 5: DOCX Export
- [ ] Install `docx` npm package
- [ ] Create `DocxExportService.js`
- [ ] Implement paragraph/run conversion
- [ ] Update `exportDocument()` method
- [ ] Test export with various document types

### Phase 6: Cleanup
- [ ] Deprecate `/api/apply-fix` endpoint
- [ ] Add deprecation warnings
- [ ] Update API documentation
- [ ] Remove unused DOCX manipulation code (optional)

### Post-Implementation
- [ ] Run full test suite
- [ ] Performance benchmarking
- [ ] User acceptance testing
- [ ] Update documentation
- [ ] Deploy to staging → production
- [ ] Monitor error rates and performance metrics

---

## Risk Assessment

### High Risk Items
1. **Tiptap rendering with formatting changes** - Ensure custom extensions handle all font/spacing updates
2. **DOCX export accuracy** - Verify generated DOCX matches original formatting
3. **Cache invalidation bugs** - Could show stale issues if detection logic fails

### Mitigation
- Extensive testing with diverse document types
- Feature flags for gradual rollout
- Comprehensive error logging
- Fallback to legacy backend fix if client-side fails

---

## Success Metrics

### User Experience
- Edit-to-feedback latency: 8–10s → **1.5–2s** (75% reduction)
- Fix application speed: 3–5s → **<100ms** (30x improvement)
- User satisfaction: Measure via feedback/surveys

### Technical
- Client-side fix success rate: **>95%**
- Cache hit rate: **>80%** for incremental analysis
- Auto-save reliability: **>99.5%**
- DOCX export accuracy: **100%** (verified with Word)

### Business
- Server load reduction: **70–80%** (fewer backend calls)
- Offline capability: **Enabled**
- Scalability: Handle 10x more concurrent users

---

## Next Steps

1. **Review this plan** with development team
2. **Set up development environment** with staging database
3. **Create GitHub issues** for each phase
4. **Begin Phase 1 implementation** (highest priority)
5. **Establish testing protocols** before deployment

---

## Support and Resources

**Documentation:**
- Tiptap: https://tiptap.dev/docs
- docx.js: https://docx.js.org/
- Supabase: https://supabase.com/docs

**Key Files to Modify:**
- `src/services/DocumentService.js` (main implementation)
- `src/store/unifiedDocumentStore.js` (store integration)
- `src/utils/IncrementalAPAAnalyzer.js` (analysis optimization)
- `src/services/DocxExportService.js` (new file)

**Estimated Total Implementation Time:** 10–15 days (full-stack developer)

---

**End of Implementation Plan**
