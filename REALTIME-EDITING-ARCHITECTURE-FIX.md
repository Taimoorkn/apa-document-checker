# Real-Time Editing Architecture Fix Plan

**Version:** 1.0
**Date:** 2025-10-03
**Target:** APA Document Checker - Fix broken real-time editing
**Complexity:** High - Requires fundamental architecture changes

---

## Executive Summary

The current codebase has **fatal flaws** preventing real-time editing with autosave and re-analysis. The root cause is **bidirectional sync between Tiptap and DocumentModel** that triggers full editor re-renders via `editor.commands.setContent()`, destroying cursor position and creating a horrible UX.

This plan restructures the architecture to make **Tiptap the single source of truth** during editing sessions, with DocumentModel as a passive observer.

---

## Table of Contents

1. [Critical Problems Identified](#1-critical-problems-identified)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Proposed Solution](#3-proposed-solution)
4. [Implementation Plan](#4-implementation-plan)
5. [File-by-File Changes](#5-file-by-file-changes)
6. [Testing & Validation](#6-testing--validation)
7. [Rollback Strategy](#7-rollback-strategy)

---

## 1. Critical Problems Identified

### Problem 1: Full Editor Re-renders on Every Sync

**Location:** `src/hooks/useUnifiedDocumentEditor.js:262-264`

```javascript
// ❌ FATAL: This destroys editor state
editor.commands.setContent(editorContent, false, {
  preserveWhitespace: true
});
```

**Issue:** Every time DocumentModel changes, `editorState.needsSync = true` triggers `syncEditorFromModel()`, which calls `setContent()`. This:
- Destroys cursor position
- Resets text selection
- Causes jarring UI jumps
- Makes typing feel broken

**Trigger Chain:**
```
User types → syncWithEditor() → scheduleIncrementalAnalysis(1s) →
analyzeDocument() → Issues updated → editorState.needsSync = true →
syncEditorFromModel() → editor.setContent() → FULL RERENDER
```

---

### Problem 2: Circular Update Loops

**Locations:**
- `src/store/unifiedDocumentStore.js:523-548` (syncWithEditor)
- `src/hooks/useUnifiedDocumentEditor.js:180-215` (performSync)
- `src/hooks/useUnifiedDocumentEditor.js:455-460` (needsSync effect)

**Issue:** Competing update cycles create infinite loops:

**Loop 1 - Editor to Model:**
```
Tiptap onUpdate (line 75) →
performSync (line 98) →
syncWithEditor (line 194) →
scheduleIncrementalAnalysis (line 548) →
analyzeDocument() →
Issues change →
needsSync = true
```

**Loop 2 - Model to Editor:**
```
needsSync = true →
useEffect (line 456) triggers →
syncEditorFromModel (line 220) →
editor.setContent() →
isInternalUpdateRef prevents onUpdate but →
DOM still re-renders
```

**The `isInternalUpdateRef` flag** (line 77) only prevents the `onUpdate` callback, **not the actual re-render**.

---

### Problem 3: Broken Save Pipeline Timing

**Location:** `src/hooks/useUnifiedDocumentEditor.js:198-203`

```javascript
if (result.hasChanges) {
  // LAYER 2: IndexedDB (2.5s debounce)
  saveToIndexedDB(editorContent);

  // LAYER 3: Supabase (3s debounce)
  scheduleAutoSave(false, 3000);
}
```

**Issue:** Analysis runs **before** saves complete:

1. User types "hello" at t=0ms
2. Sync debounce (300ms) triggers at t=300ms
3. Analysis debounce (1000ms) triggers at t=1000ms
4. **Analysis runs**, finds issues, updates DocumentModel
5. `needsSync = true` set
6. IndexedDB save (2500ms) triggers at t=2800ms
7. Supabase save (3000ms) triggers at t=3300ms
8. **Meanwhile** at t=1100ms: `syncEditorFromModel()` runs with **old content**
9. User's "hello" gets overwritten or jumps around

**Timing Chart:**
```
t=0ms    : User types "hello"
t=300ms  : Sync scheduled
t=1000ms : ❌ Analysis runs (too early!)
t=1100ms : ❌ needsSync triggers rerender (wrong content!)
t=2800ms : IndexedDB save (too late!)
t=3300ms : Supabase save (too late!)
```

---

### Problem 4: Fix Application Destroys Cursor

**Location:** `src/store/unifiedDocumentStore.js:468-479`

```javascript
set(currentState => ({
  processingState: { ... },
  editorState: {
    ...currentState.editorState,
    needsSync: true, // ❌ Forces full rerender
    content: null    // ❌ Clears cached content
  }
}));
```

**Issue:** When user clicks "Apply Fix":
1. Fix applied to DocumentModel instantly (client-side)
2. `needsSync = true` set
3. `syncEditorFromModel()` triggered
4. `editor.setContent()` called → **Full rerender**
5. User was mid-sentence typing → **Cursor lost**

This happens **during active editing**, which is unacceptable.

---

### Problem 5: Abort Controllers Don't Stop Re-renders

**Locations:**
- `src/store/unifiedDocumentStore.js:293-308` (analysis abort)
- `src/store/unifiedDocumentStore.js:696-707` (autosave abort)

```javascript
// Create new AbortController for this analysis
const abortController = new AbortController();
```

**Issue:** Abort controllers stop **network requests** but don't prevent:
- `needsSync = true` from being set
- Next sync/analysis cycle from starting
- Editor re-renders

They're **incomplete protection** against the core issue.

---

### Problem 6: Analysis Timing Kills UX

**Current Debounces:**
- Editor sync: **300ms** (line 99 in useUnifiedDocumentEditor.js)
- Analysis: **1000ms** (line 589 in unifiedDocumentStore.js)
- IndexedDB: **2500ms** (line 173 in useUnifiedDocumentEditor.js)
- Supabase: **3000ms** (line 203 in useUnifiedDocumentEditor.js)

**Problem:** Analysis (1s) runs **before** saves (2.5s/3s), causing:
1. Stale content analysis
2. Premature `needsSync` triggers
3. Re-renders with incorrect content

**Should be:** Analysis ≥ Saves (run after saves complete)

---

## 2. Architecture Analysis

### Current Architecture (Broken)

```
┌─────────────────────────────────────────┐
│  TIPTAP EDITOR                          │
│  - User types                           │
│  - Sends updates to DocumentModel       │
└──────────────┬──────────────────────────┘
               ↓
    ┌──────────────────────────┐
    │  syncWithEditor()        │
    │  (300ms debounce)        │
    └──────────┬───────────────┘
               ↓
┌──────────────────────────────────────────┐
│  DOCUMENT MODEL                          │
│  - Stores changes                        │
│  - Triggers analysis (1s)                │
│  - Triggers autosave (3s)                │
└──────────┬───────────────────────────────┘
           ↓
    ┌─────────────────┐
    │  Analysis       │
    │  completes      │
    └────┬────────────┘
         ↓
    needsSync = true
         ↓
    ┌──────────────────────────┐
    │  syncEditorFromModel()   │
    │  editor.setContent()     │
    └──────────┬───────────────┘
               ↓
    ❌ FULL RERENDER (cursor lost!)
```

**Problems:**
- Bidirectional sync creates loops
- `setContent()` destroys editor state
- Analysis triggers re-renders
- No true single source of truth

---

### Proposed Architecture (Fixed)

```
┌─────────────────────────────────────────┐
│  TIPTAP EDITOR (SOURCE OF TRUTH)        │
│  - User types                           │
│  - Content stays in editor              │
│  - No external updates during editing   │
└──────────────┬──────────────────────────┘
               │
               ├──► useAutoSave Hook (5s debounce)
               │    ├──► IndexedDB (reload safety)
               │    └──► Supabase (cloud backup)
               │
               ├──► useAnalysis Hook (8s debounce)
               │    ├──► Web Worker (background)
               │    └──► Update decorations ONLY
               │         (not content!)
               │
               └──► On "Apply Fix" click
                    └──► Update via ProseMirror transaction
                         (surgical edit, no setContent!)
```

**Benefits:**
- Tiptap is source of truth during editing
- No `setContent()` calls except initial load
- Analysis updates decorations only
- Fixes use transactions, not full replacement
- Save/analysis are passive observers

---

## 3. Proposed Solution

### Core Principles

1. **Tiptap is Source of Truth During Editing**
   - Editor content is authoritative
   - DocumentModel becomes read-only mirror
   - No `setContent()` after initial load

2. **Decorations for Visual Feedback**
   - Issue highlights are decorations (not content changes)
   - Updates don't trigger re-renders
   - Cursor remains stable

3. **Passive Save/Analysis**
   - Save observes editor, doesn't mutate it
   - Analysis runs in background
   - Results update UI via decorations only

4. **Surgical Fixes via Transactions**
   - Use ProseMirror transactions for fixes
   - Target specific positions
   - Preserve cursor and selection

---

### New Component Structure

**Delete from Zustand:**
- `autoSaveState` (lines 88-94)
- `analysisState` (lines 97-104)
- `uiState` (lines 107-111) - Move to React state
- `syncWithEditor()` (lines 523-564)
- `scheduleIncrementalAnalysis()` (lines 589-629)
- `scheduleAutoSave()` (lines 636-680)
- `performAutoSave()` (lines 685-763)

**Create New Hooks:**

```
src/hooks/
  ├── useAutoSave.js          (NEW)
  ├── useAnalysis.js          (NEW)
  └── useIssueDecorations.js  (NEW)
```

**Simplified Zustand Store:**

```javascript
// Keep only:
- documentModel (source for initial load)
- uploadDocument() (one-time upload)
- loadExistingDocument() (one-time load)
- applyFix() (mutation via transaction)
- getIssues() (read-only getter)
```

---

## 4. Implementation Plan

### Phase 1: Create New Hooks (Day 1)

#### Step 1.1: Create `useAutoSave.js`

**File:** `src/hooks/useAutoSave.js`

```javascript
'use client';

import { useEffect, useRef } from 'react';
import { indexedDBManager } from '@/utils/indexedDBManager';
import { createClient } from '@/lib/supabase/client';

/**
 * Auto-save hook - Passive observer of editor changes
 * Saves to IndexedDB and Supabase without mutating editor
 */
export const useAutoSave = (editor, documentId, enabled = true) => {
  const saveTimeoutRef = useRef(null);
  const lastSavedContentRef = useRef(null);

  useEffect(() => {
    if (!editor || !documentId || !enabled) {
      return;
    }

    const handleUpdate = () => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save (5 seconds)
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const currentContent = editor.getJSON();
          const contentString = JSON.stringify(currentContent);

          // Skip if no changes
          if (lastSavedContentRef.current === contentString) {
            return;
          }

          lastSavedContentRef.current = contentString;

          // LAYER 1: IndexedDB (immediate, for reload safety)
          await indexedDBManager.saveToIndexedDB(
            documentId,
            currentContent,
            { lastModified: Date.now() }
          );

          // LAYER 2: Supabase (5s later, for cloud backup)
          setTimeout(async () => {
            const supabase = createClient();
            await supabase
              .from('analysis_results')
              .update({
                tiptap_content: currentContent,
                content_saved_at: new Date().toISOString()
              })
              .eq('document_id', documentId);

            console.log('✅ Auto-saved to Supabase');
          }, 5000);

          console.log('💾 Auto-saved to IndexedDB');
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
        }
      }, 5000); // 5 second debounce
    };

    // Listen to editor updates
    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editor, documentId, enabled]);
};
```

**Key Features:**
- 5 second debounce (user finishes typing first)
- IndexedDB for reload safety
- Supabase for cloud backup
- No DocumentModel updates
- No editor mutations

---

#### Step 1.2: Create `useAnalysis.js`

**File:** `src/hooks/useAnalysis.js`

```javascript
'use client';

import { useState, useEffect, useRef } from 'react';
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';

/**
 * Analysis hook - Runs APA analysis in background
 * Updates issue list without touching editor content
 */
export const useAnalysis = (editor, documentModel, enabled = true) => {
  const [issues, setIssues] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef(null);
  const analyzerRef = useRef(null);
  const lastContentRef = useRef(null);

  // Initialize analyzer once
  useEffect(() => {
    analyzerRef.current = new EnhancedAPAAnalyzer();
  }, []);

  useEffect(() => {
    if (!editor || !documentModel || !enabled) {
      return;
    }

    const handleUpdate = () => {
      // Clear existing timeout
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      // Debounce analysis (8 seconds - after user stops typing)
      analysisTimeoutRef.current = setTimeout(async () => {
        try {
          const currentContent = editor.getJSON();
          const contentString = JSON.stringify(currentContent);

          // Skip if no changes
          if (lastContentRef.current === contentString) {
            return;
          }

          lastContentRef.current = contentString;
          setIsAnalyzing(true);

          // Extract text and formatting from Tiptap JSON
          const documentData = {
            text: editor.getText(),
            html: editor.getHTML(),
            formatting: documentModel.formatting,
            structure: documentModel.structure,
            styles: documentModel.styles
          };

          // Run analysis (synchronous for now, Web Worker in Phase 4)
          const newIssues = analyzerRef.current.analyzeDocument(documentData);

          // Update issues state (triggers decoration update)
          setIssues(newIssues);

          console.log(`🧠 Analysis complete: ${newIssues.length} issues found`);
          setIsAnalyzing(false);
        } catch (error) {
          console.error('❌ Analysis failed:', error);
          setIsAnalyzing(false);
        }
      }, 8000); // 8 second debounce
    };

    // Listen to editor updates
    editor.on('update', handleUpdate);

    // Run initial analysis
    handleUpdate();

    return () => {
      editor.off('update', handleUpdate);
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [editor, documentModel, enabled]);

  return { issues, isAnalyzing };
};
```

**Key Features:**
- 8 second debounce (after typing stops)
- Reads from Tiptap directly
- Updates issue state only
- No editor mutations
- No DocumentModel writes

---

#### Step 1.3: Create `useIssueDecorations.js`

**File:** `src/hooks/useIssueDecorations.js`

```javascript
'use client';

import { useEffect } from 'react';

/**
 * Issue Decorations hook - Updates visual highlights only
 * Does NOT mutate editor content
 */
export const useIssueDecorations = (
  editor,
  issues,
  activeIssueId,
  showHighlighting
) => {
  useEffect(() => {
    if (!editor || !editor.commands.updateIssueHighlights) {
      return;
    }

    try {
      // Update decorations without touching content
      editor.commands.updateIssueHighlights({
        issues,
        activeIssueId,
        showHighlighting
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 Updated decorations for ${issues.length} issues`);
      }
    } catch (error) {
      console.error('❌ Decoration update failed:', error);
    }
  }, [editor, issues, activeIssueId, showHighlighting]);
};
```

**Key Features:**
- Pure decoration updates
- No content changes
- No re-renders
- Cursor stays stable

---

### Phase 2: Simplify Zustand Store (Day 2)

#### Step 2.1: Remove Unused State

**File:** `src/store/unifiedDocumentStore.js`

**DELETE these sections:**

```javascript
// DELETE lines 88-94: autoSaveState
autoSaveState: {
  isSaving: false,
  lastSaveTimestamp: 0,
  lastSaveError: null,
  saveStatus: 'saved',
  autoSaveDebounceTimeout: null,
  autoSaveAbortController: null
},

// DELETE lines 97-104: analysisState
analysisState: {
  lastAnalysisTimestamp: 0,
  pendingAnalysis: false,
  analysisDebounceTimeout: null,
  incrementalMode: true,
  analysisAbortController: null
},

// DELETE lines 107-111: uiState (move to React)
uiState: {
  showIssueHighlighting: true,
  activeIssueId: null,
  selectedIssues: new Set()
},
```

---

#### Step 2.2: Remove Sync/Save/Analysis Methods

**DELETE these methods:**

```javascript
// DELETE lines 523-564: syncWithEditor
syncWithEditor: (tiptapDocument, changesMeta = {}) => { ... },

// DELETE lines 589-629: scheduleIncrementalAnalysis
scheduleIncrementalAnalysis: (debounceMs = 1000) => { ... },

// DELETE lines 636-680: scheduleAutoSave
scheduleAutoSave: (immediate = false, debounceMs = 2000) => { ... },

// DELETE lines 685-763: performAutoSave
performAutoSave: async () => { ... },

// DELETE lines 836-852: setActiveIssue (move to React)
setActiveIssue: (issueId, options = {}) => { ... },

// DELETE lines 857-864: toggleIssueHighlighting (move to React)
toggleIssueHighlighting: () => { ... },
```

---

#### Step 2.3: Simplified Store Structure

**File:** `src/store/unifiedDocumentStore.js`

```javascript
export const useUnifiedDocumentStore = create((set, get) => ({
  // Single source of truth - DocumentModel
  documentModel: null,
  documentService: new DocumentService(),

  // Processing state only
  processingState: {
    isUploading: false,
    isApplyingFix: false,
    lastError: null,
    progress: 0,
    currentFixId: null
  },

  // Editor state (minimal)
  editorState: {
    isInitialized: false
  },

  // Event emitter (keep for fix events)
  events: storeEvents,

  // === DOCUMENT OPERATIONS ===

  uploadDocument: async (file) => {
    // Keep existing implementation
    // Lines 126-218
  },

  loadExistingDocument: async (documentData, issues, supabaseMetadata) => {
    // Keep existing implementation
    // Lines 223-273
    // BUT remove: editorState.needsSync (line 243)
  },

  applyFix: async (issueId) => {
    // MODIFY: Use transaction instead of needsSync
    const state = get();
    const result = await state.documentService.applyFix(
      state.documentModel,
      issueId
    );

    if (result.success) {
      // Emit event for editor to apply transaction
      storeEvents.emit('fixApplied', {
        issueId,
        fixAction: result.fixAction,
        fixData: result.fixData // NEW: contains transaction data
      });
    }

    return result;
  },

  // === GETTERS ===

  getIssues: () => {
    // Keep existing (lines 781-799)
  },

  getDocumentStats: () => {
    // Keep existing (lines 770-776)
  },

  exportDocument: async (format) => {
    // Keep existing (lines 950-957)
  },

  reset: () => {
    // Simplified reset (remove timeout clears)
  }
}));
```

**Total lines removed:** ~400 lines
**New size:** ~200 lines (50% reduction)

---

### Phase 3: Update Editor Hook (Day 3)

#### Step 3.1: Refactor `useUnifiedDocumentEditor.js`

**File:** `src/hooks/useUnifiedDocumentEditor.js`

**REPLACE entire hook with:**

```javascript
'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { FormattedParagraph, FontFormatting, DocumentDefaults } from '@/utils/tiptapFormattingExtensions';
import { IssueHighlighter } from '@/utils/tiptapIssueHighlighter';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';
import { useAutoSave } from './useAutoSave';
import { useAnalysis } from './useAnalysis';
import { useIssueDecorations } from './useIssueDecorations';

export const useUnifiedDocumentEditor = () => {
  const {
    documentModel,
    getEditorContent,
    events
  } = useUnifiedDocumentStore();

  const [editorError, setEditorError] = useState(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  // UI state (moved from Zustand)
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [showHighlighting, setShowHighlighting] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: { levels: [1, 2, 3, 4, 5, 6] }
      }),
      FormattedParagraph,
      FontFormatting,
      DocumentDefaults,
      Underline,
      IssueHighlighter.configure({
        issues: [], // Will be updated by useIssueDecorations
        activeIssueId,
        showHighlighting,
        onIssueClick: (issueId) => setActiveIssueId(issueId)
      })
    ],
    content: '<p>Loading document...</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none min-h-[500px] p-4',
        spellcheck: 'false'
      }
    },
    onCreate: ({ editor }) => {
      setEditorInitialized(true);

      // Load initial content (ONLY TIME setContent is called)
      if (documentModel) {
        const initialContent = getEditorContent();
        if (initialContent) {
          editor.commands.setContent(initialContent, false);
        }
      }
    },
    onError: ({ error }) => {
      console.error('Editor error:', error);
      setEditorError(error);
    }
  });

  // Auto-save hook (passive observer)
  const documentId = documentModel?.supabase?.documentId || documentModel?.id;
  useAutoSave(editor, documentId, !!documentModel);

  // Analysis hook (passive observer)
  const { issues, isAnalyzing } = useAnalysis(editor, documentModel, !!documentModel);

  // Issue decorations (visual only)
  useIssueDecorations(editor, issues, activeIssueId, showHighlighting);

  // Listen for fix application (use transaction, not setContent)
  useEffect(() => {
    const cleanup = events.on('fixApplied', (data) => {
      if (!editor) return;

      const { fixData } = data;

      // Apply fix via ProseMirror transaction (surgical update)
      const tr = editor.state.tr;

      if (fixData.textReplacement) {
        const { from, to, text } = fixData.textReplacement;
        tr.insertText(text, from, to);
      }

      if (fixData.formatting) {
        // Apply formatting changes without content replacement
        const { paragraphIds, property, value } = fixData.formatting;
        // Implementation depends on your ProseMirror schema
      }

      editor.view.dispatch(tr);

      console.log('🔧 Fix applied via transaction');
    });

    return cleanup;
  }, [editor, events]);

  return {
    editor,
    editorError,
    editorInitialized,
    issues,
    isAnalyzing,
    activeIssueId,
    setActiveIssueId,
    showHighlighting,
    toggleHighlighting: () => setShowHighlighting(!showHighlighting)
  };
};
```

**Key Changes:**
- ❌ Removed: `performSync()`, `syncEditorFromModel()`, `saveToIndexedDB()`
- ✅ Added: `useAutoSave()`, `useAnalysis()`, `useIssueDecorations()` hooks
- ✅ Moved: `activeIssueId`, `showHighlighting` to local React state
- ✅ Changed: Fix application uses ProseMirror transactions
- ✅ `setContent()` called ONCE on initial load only

---

### Phase 4: Update DocumentService (Day 4)

#### Step 4.1: Modify `applyFix()` to Return Transaction Data

**File:** `src/services/DocumentService.js`

**MODIFY method starting at line 156:**

```javascript
async applyFix(documentModel, issueId) {
  if (!documentModel || !issueId) {
    throw new Error('Document model and issue ID required');
  }

  const issue = documentModel.issues.issues.get(issueId);
  if (!issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }

  if (!issue.hasFix) {
    throw new Error(`Issue ${issueId} cannot be automatically fixed`);
  }

  const snapshot = documentModel.createSnapshot();

  try {
    let fixResult;

    if (this._isTextFix(issue.fixAction)) {
      // Return transaction data instead of mutating
      fixResult = this._generateTextFixTransaction(documentModel, issue);
    }
    else if (this._isFormattingFix(issue.fixAction)) {
      // Return transaction data instead of mutating
      fixResult = this._generateFormattingFixTransaction(documentModel, issue);
    }
    else {
      // Fallback for unsupported fixes
      throw new Error(`Fix action not supported: ${issue.fixAction}`);
    }

    if (fixResult.success) {
      // Remove issue from DocumentModel
      documentModel.issues.removeIssue(issueId);

      return {
        success: true,
        fixedIssueId: issueId,
        fixAction: issue.fixAction,
        fixData: fixResult.transactionData, // NEW: for ProseMirror
        snapshotId: snapshot.id
      };
    }

    return { success: false, error: fixResult.error };

  } catch (error) {
    console.error('❌ Fix failed:', error);
    documentModel.restoreFromSnapshot(snapshot);
    throw error;
  }
}
```

---

#### Step 4.2: Add Transaction Generators

**File:** `src/services/DocumentService.js`

**ADD new private methods:**

```javascript
/**
 * Generate transaction data for text fixes
 * Returns data for ProseMirror transaction, does NOT mutate
 */
_generateTextFixTransaction(documentModel, issue) {
  const { fixAction, fixValue, location } = issue;

  // Find target paragraph
  let paragraphId = null;
  let paragraphIndex = -1;

  if (location?.paragraphIndex !== undefined) {
    paragraphIndex = location.paragraphIndex;
    if (paragraphIndex < documentModel.paragraphOrder.length) {
      paragraphId = documentModel.paragraphOrder[paragraphIndex];
    }
  }

  // Fallback: Search for text
  if (!paragraphId) {
    const searchText = fixValue?.original || issue.highlightText || issue.text;
    for (let i = 0; i < documentModel.paragraphOrder.length; i++) {
      const id = documentModel.paragraphOrder[i];
      const para = documentModel.paragraphs.get(id);
      if (para && para.text.includes(searchText)) {
        paragraphId = id;
        paragraphIndex = i;
        break;
      }
    }
  }

  if (!paragraphId) {
    return { success: false, error: 'Paragraph not found' };
  }

  const paragraph = documentModel.paragraphs.get(paragraphId);
  const oldText = paragraph.text;

  // Calculate replacement
  let newText = oldText;
  if (fixValue?.original && fixValue?.replacement) {
    newText = oldText.replace(fixValue.original, fixValue.replacement);
  }

  if (oldText === newText) {
    return { success: false, error: 'No changes detected' };
  }

  // Calculate position in document
  // Sum of all previous paragraphs + current position
  let position = 0;
  for (let i = 0; i < paragraphIndex; i++) {
    const prevId = documentModel.paragraphOrder[i];
    const prevPara = documentModel.paragraphs.get(prevId);
    position += prevPara.text.length + 1; // +1 for newline
  }

  // Find text position within paragraph
  const textIndex = oldText.indexOf(fixValue.original);
  const from = position + textIndex;
  const to = from + fixValue.original.length;

  return {
    success: true,
    transactionData: {
      type: 'textReplacement',
      textReplacement: {
        from,
        to,
        text: fixValue.replacement
      }
    }
  };
}

/**
 * Generate transaction data for formatting fixes
 */
_generateFormattingFixTransaction(documentModel, issue) {
  const { fixAction } = issue;

  let property, value;

  switch (fixAction) {
    case 'fixFont':
      property = 'fontFamily';
      value = 'Times New Roman';
      break;
    case 'fixFontSize':
      property = 'fontSize';
      value = '12pt';
      break;
    case 'fixLineSpacing':
      property = 'lineHeight';
      value = '2.0';
      break;
    default:
      return { success: false, error: 'Unsupported formatting fix' };
  }

  return {
    success: true,
    transactionData: {
      type: 'formatting',
      formatting: {
        paragraphIds: documentModel.paragraphOrder, // Apply to all
        property,
        value
      }
    }
  };
}
```

---

### Phase 5: Update Components (Day 5)

#### Step 5.1: Simplify `NewDocumentEditor.js`

**File:** `src/components/NewDocumentEditor.js`

**REPLACE with:**

```javascript
'use client';

import React from 'react';
import { EditorContent } from '@tiptap/react';
import { useUnifiedDocumentEditor } from '@/hooks/useUnifiedDocumentEditor';
import { useUnifiedDocumentStore } from '@/store/unifiedDocumentStore';
import EmptyDocumentState from '@/components/EmptyDocumentState';
import LoadingState from '@/components/LoadingState';
import DocumentControls from '@/components/DocumentControls';
import FormattingToolbar from '@/components/FormattingToolbar';

export const NewDocumentEditor = () => {
  const {
    documentModel,
    processingState
  } = useUnifiedDocumentStore();

  const {
    editor,
    editorError,
    editorInitialized,
    issues,
    isAnalyzing,
    activeIssueId,
    setActiveIssueId,
    showHighlighting,
    toggleHighlighting
  } = useUnifiedDocumentEditor();

  const isLoading = processingState.isUploading;

  if (isLoading) {
    return <LoadingState />;
  }

  if (!documentModel) {
    return <EmptyDocumentState />;
  }

  if (editorError) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold text-lg">Editor Error</h3>
          <p className="text-red-600 mt-1">{editorError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <DocumentControls
        documentText={documentModel.getPlainText()}
        isAnalyzing={isAnalyzing}
        showIssueHighlighting={showHighlighting}
        toggleIssueHighlighting={toggleHighlighting}
        issues={issues}
        editor={editor}
      />

      <FormattingToolbar editor={editor} />

      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6">
          <div className="mx-auto max-w-4xl">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200">
              {!editorInitialized && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-3 text-slate-600">Initializing editor...</p>
                  </div>
                </div>
              )}
              <EditorContent
                editor={editor}
                className="prose max-w-none min-h-[500px] p-8 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDocumentEditor;
```

**Changes:**
- Uses new hook return values
- No `processingState.isAnalyzing` from store
- `isAnalyzing` from `useAnalysis` hook
- Simpler state management

---

#### Step 5.2: Update `IssuesPanel.js`

**File:** `src/components/IssuesPanel.js`

**MODIFY to get issues from parent:**

```javascript
export default function IssuesPanel({ issues, activeIssueId, onIssueClick }) {
  // ... existing implementation

  // Remove:
  // const { getIssues, uiState, setActiveIssue } = useUnifiedDocumentStore();

  // Use props instead:
  // issues, activeIssueId, onIssueClick
}
```

Update parent to pass props:

```javascript
// In DocumentViewerClient.js or wherever IssuesPanel is used
<IssuesPanel
  issues={issues}
  activeIssueId={activeIssueId}
  onIssueClick={setActiveIssueId}
/>
```

---

## 5. File-by-File Changes

### Files to Modify

1. **`src/store/unifiedDocumentStore.js`**
   - Remove: `autoSaveState`, `analysisState`, `uiState`
   - Remove: `syncWithEditor`, `scheduleIncrementalAnalysis`, `scheduleAutoSave`, `performAutoSave`
   - Modify: `applyFix()` to return transaction data
   - Keep: `documentModel`, `uploadDocument`, `loadExistingDocument`, `getIssues`

2. **`src/hooks/useUnifiedDocumentEditor.js`**
   - Remove: `performSync`, `syncEditorFromModel`, `saveToIndexedDB`
   - Replace with: New hooks (`useAutoSave`, `useAnalysis`, `useIssueDecorations`)
   - Add: Local state for `activeIssueId`, `showHighlighting`
   - Modify: Fix application via ProseMirror transactions

3. **`src/services/DocumentService.js`**
   - Modify: `applyFix()` to return transaction data
   - Add: `_generateTextFixTransaction()`
   - Add: `_generateFormattingFixTransaction()`
   - Remove: `_applyTextFixToJSON()` mutation logic
   - Remove: `scheduleAutoSaveCallback` references

4. **`src/components/NewDocumentEditor.js`**
   - Simplify: Use new hook return values
   - Remove: Store-based `isAnalyzing`
   - Use: Hook-based `isAnalyzing`

5. **`src/components/IssuesPanel.js`**
   - Convert to: Receive issues/activeIssueId as props
   - Remove: Direct store access for UI state

### Files to Create

1. **`src/hooks/useAutoSave.js`** (NEW)
   - Auto-save to IndexedDB + Supabase
   - 5 second debounce
   - No editor mutations

2. **`src/hooks/useAnalysis.js`** (NEW)
   - Background APA analysis
   - 8 second debounce
   - Returns issues only

3. **`src/hooks/useIssueDecorations.js`** (NEW)
   - Updates decorations only
   - No content changes
   - Cursor-safe

### Files to Delete

None (we're refactoring, not deleting)

---

## 6. Testing & Validation

### Test Suite 1: Basic Editing

**Test Case 1.1: Type without re-renders**
```
1. Load document
2. Click in editor
3. Type "hello world"
4. Expected: Cursor stays in place, text appears smoothly
5. Verify: No console errors, no re-renders
```

**Test Case 1.2: Multi-line editing**
```
1. Load document
2. Type paragraph 1
3. Press Enter
4. Type paragraph 2
5. Expected: Cursor moves naturally, no jumps
```

**Test Case 1.3: Text selection**
```
1. Load document
2. Select text
3. Continue typing
4. Expected: Selection replaced, cursor at end
5. Verify: No selection loss
```

---

### Test Suite 2: Auto-Save

**Test Case 2.1: IndexedDB save**
```
1. Load document
2. Type "test content"
3. Wait 5 seconds
4. Check IndexedDB
5. Expected: Content saved
6. Verify: No re-render
```

**Test Case 2.2: Supabase save**
```
1. Load document
2. Type "test content"
3. Wait 10 seconds
4. Check Supabase
5. Expected: Content saved to tiptap_content
```

**Test Case 2.3: Reload safety**
```
1. Load document
2. Type "unsaved changes"
3. Wait 3 seconds (IndexedDB saved, Supabase not)
4. Reload page
5. Expected: "unsaved changes" appears (from IndexedDB)
```

---

### Test Suite 3: Analysis

**Test Case 3.1: Background analysis**
```
1. Load document
2. Type text with APA violation
3. Wait 8 seconds
4. Expected: Issue appears in panel
5. Verify: No cursor movement, no re-render
```

**Test Case 3.2: Issue highlighting**
```
1. Load document with issues
2. Wait for analysis
3. Expected: Issues highlighted with decorations
4. Verify: Can still type, cursor stable
```

**Test Case 3.3: Active issue selection**
```
1. Load document with issues
2. Click issue in panel
3. Expected: Editor scrolls to issue, text highlighted
4. Verify: No content change, just visual highlight
```

---

### Test Suite 4: Fix Application

**Test Case 4.1: Text fix via transaction**
```
1. Load document with citation issue
2. Click "Apply Fix"
3. Expected: Text changes, cursor stays in place
4. Verify: Used transaction, not setContent()
```

**Test Case 4.2: Fix during typing**
```
1. Load document with issue
2. Start typing in different paragraph
3. Click "Apply Fix" while typing
4. Expected: Fix applies, cursor doesn't jump
5. Verify: No interruption to typing
```

**Test Case 4.3: Formatting fix**
```
1. Load document with font issue
2. Click "Apply Fix"
3. Expected: Formatting changes visible
4. Verify: No content re-render
```

---

### Performance Benchmarks

**Metric 1: Time to First Edit**
- Current: N/A (broken)
- Target: <100ms from click to cursor

**Metric 2: Typing Latency**
- Current: N/A (broken)
- Target: <16ms (60fps)

**Metric 3: Analysis Time**
- Current: ~1-3 seconds (blocks UI)
- Target: ~2-5 seconds (background, no block)

**Metric 4: Save Time**
- IndexedDB: <50ms
- Supabase: <500ms (background)

---

## 7. Rollback Strategy

### If Issues Arise

**Step 1: Feature Flag**
- Add to `src/config/features.js`:
  ```javascript
  NEW_EDITOR_ARCHITECTURE: getEnvFlag('NEW_EDITOR_ARCHITECTURE', false)
  ```

**Step 2: Conditional Hook**
```javascript
// In useUnifiedDocumentEditor.js
import { FEATURES } from '@/config/features';

export const useUnifiedDocumentEditor = () => {
  if (FEATURES.NEW_EDITOR_ARCHITECTURE) {
    // New hooks (Phase 3)
    return useNewArchitecture();
  } else {
    // Old implementation (current)
    return useOldArchitecture();
  }
};
```

**Step 3: Quick Rollback**
```bash
# Set environment variable
NEXT_PUBLIC_NEW_EDITOR_ARCHITECTURE=false npm run dev
```

---

### Git Strategy

**Branch Structure:**
```
main
  └── feature/realtime-editing-fix
       ├── phase-1-create-hooks
       ├── phase-2-simplify-store
       ├── phase-3-update-editor-hook
       ├── phase-4-update-service
       └── phase-5-update-components
```

**Commit Strategy:**
- Each phase = separate commit
- Can revert individual phases
- Keep old code commented for reference

---

## 8. Migration Checklist

### Pre-Implementation

- [ ] Create feature branch `feature/realtime-editing-fix`
- [ ] Back up current store implementation
- [ ] Document current behavior (video recording)
- [ ] Set up performance monitoring

### Phase 1 (Hooks)

- [ ] Create `src/hooks/useAutoSave.js`
- [ ] Create `src/hooks/useAnalysis.js`
- [ ] Create `src/hooks/useIssueDecorations.js`
- [ ] Test each hook independently
- [ ] Verify no regressions

### Phase 2 (Store)

- [ ] Remove `autoSaveState` from store
- [ ] Remove `analysisState` from store
- [ ] Remove `uiState` from store
- [ ] Remove `syncWithEditor()` method
- [ ] Remove `scheduleIncrementalAnalysis()` method
- [ ] Remove `scheduleAutoSave()` method
- [ ] Remove `performAutoSave()` method
- [ ] Test store still works for upload/load

### Phase 3 (Editor Hook)

- [ ] Replace `useUnifiedDocumentEditor.js` implementation
- [ ] Remove `performSync()` method
- [ ] Remove `syncEditorFromModel()` method
- [ ] Remove `saveToIndexedDB()` method
- [ ] Add new hook integrations
- [ ] Add fix application listener
- [ ] Test editor initialization
- [ ] Test typing without re-renders

### Phase 4 (Service)

- [ ] Modify `applyFix()` to return transaction data
- [ ] Add `_generateTextFixTransaction()` method
- [ ] Add `_generateFormattingFixTransaction()` method
- [ ] Remove old mutation logic
- [ ] Test fix generation
- [ ] Test transaction application

### Phase 5 (Components)

- [ ] Update `NewDocumentEditor.js`
- [ ] Update `IssuesPanel.js`
- [ ] Update `DocumentViewerClient.js`
- [ ] Remove store dependencies
- [ ] Use props for issue data
- [ ] Test component rendering

### Post-Implementation

- [ ] Run full test suite
- [ ] Performance benchmarking
- [ ] Memory leak testing
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitor error rates

---

## 9. Expected Outcomes

### User Experience

**Before:**
- ❌ Cursor jumps on every analysis
- ❌ Text disappears/reappears
- ❌ Typing feels laggy
- ❌ Clicking "Apply Fix" destroys cursor
- ❌ Can't edit during analysis

**After:**
- ✅ Cursor stays stable
- ✅ Smooth, natural typing
- ✅ Background analysis (no interruption)
- ✅ Fixes apply without cursor loss
- ✅ True real-time editing

---

### Technical Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Editor re-renders per edit | 3-5 | 0 | 100% |
| Cursor stability | 0% | 100% | ∞ |
| Analysis debounce | 1s | 8s | 8x better UX |
| Save debounce | 3s | 5s | More time to type |
| Fix application time | 500ms + rerender | 50ms (transaction) | 10x faster |

---

## 10. Conclusion

This architecture fix transforms the editor from **unusable** to **production-ready** by:

1. **Making Tiptap the source of truth** - No more bidirectional sync hell
2. **Eliminating `setContent()` calls** - No more cursor destruction
3. **Using decorations for issues** - Visual feedback without content changes
4. **Applying fixes via transactions** - Surgical updates, not full replacement
5. **Passive save/analysis** - Background operations, no UI blocking

**Implementation time:** 5 days (1 phase per day)
**Lines of code changed:** ~800 lines
**Lines of code removed:** ~400 lines
**Net complexity:** -200 lines (simpler!)

---

## Appendix A: Key Imports Reference

```javascript
// Zustand Store
import { create } from 'zustand';
import { DocumentService } from '@/services/DocumentService';
import { DocumentModel } from '@/models/DocumentModel';

// Editor Hook
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { FormattedParagraph, FontFormatting, DocumentDefaults } from '@/utils/tiptapFormattingExtensions';
import { IssueHighlighter } from '@/utils/tiptapIssueHighlighter';

// New Hooks
import { indexedDBManager } from '@/utils/indexedDBManager';
import { createClient } from '@/lib/supabase/client';
import { EnhancedAPAAnalyzer } from '@/utils/enhancedApaAnalyzer';
```

---

## Appendix B: Event Flow Diagrams

### Current (Broken) Flow

```
User types "hello"
    ↓
onUpdate() (300ms debounce)
    ↓
performSync()
    ↓
syncWithEditor()
    ↓
scheduleIncrementalAnalysis(1s)
    ↓
analyzeDocument()
    ↓
Issues updated in DocumentModel
    ↓
needsSync = true
    ↓
useEffect triggers
    ↓
syncEditorFromModel()
    ↓
editor.setContent() ❌
    ↓
FULL RE-RENDER (cursor lost)
```

### New (Fixed) Flow

```
User types "hello"
    ↓
Tiptap updates (instant, in-memory)
    ↓
│
├─► useAutoSave (5s debounce)
│   ├─► IndexedDB (reload safety)
│   └─► Supabase (cloud backup)
│
├─► useAnalysis (8s debounce)
│   ├─► Extract text from editor
│   ├─► Run analysis
│   └─► Update decorations ONLY
│
└─► User continues typing
    (NO interruption, NO re-render)
```

---

**END OF DOCUMENT**
