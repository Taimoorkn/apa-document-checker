● Critical Issues Found: Why Real-time Editing is Broken

  I've analyzed your entire codebase. Your architecture has fundamental design flaws that make true real-time editing impossible. Here's what's wrong:

  ---
  🚨 MAJOR PROBLEMS

  1. Document Rerendering Hell (The Main Problem)

  Current Flow:
  User Edit → Tiptap onChange → syncWithEditor() →
  scheduleAutoSave(3s) → Supabase save →
  scheduleIncrementalAnalysis(1s) → Full Document Reanalysis →
  Document Model Updated → needsSync=true →
  syncEditorFromModel() → editor.commands.setContent() → FULL RERENDER

  The Issue: Every edit triggers a full editor content replacement via editor.commands.setContent(), which:
  - Destroys cursor position
  - Causes jarring UI jumps
  - Loses user selection
  - Makes typing feel laggy/broken

  Location: useUnifiedDocumentEditor.js:261-265

  ---
  2. Circular Update Loops

  You have multiple competing update cycles:

  Loop 1 - Editor to Model:
  Tiptap onUpdate → syncWithEditor() → scheduleIncrementalAnalysis() →
  analyzeDocument() → Document issues updated →
  issueSignature changes → useEffect triggers → updateIssueHighlights()

  Loop 2 - Model to Editor:
  Analysis complete → editorState.needsSync = true →
  useEffect triggers → syncEditorFromModel() →
  editor.setContent() → isInternalUpdateRef prevents onUpdate BUT →
  lastContentRef updated → next user edit comparison fails

  The Problem: The isInternalUpdateRef flag doesn't prevent re-renders, just prevents the onUpdate callback. The editor still fully re-renders the DOM.

  ---
  3. Three-Layer Save Architecture is Broken

  Your intended architecture:
  Layer 1: Tiptap (in-memory, immediate)
  Layer 2: IndexedDB (reload safety, 2.5s debounce)
  Layer 3: Supabase (long-term, 3s debounce)

  What actually happens:
  Edit → 300ms debounce (sync) →
  2.5s IndexedDB save + 3s Supabase save (both scheduled) →
  1s analysis debounce → Analysis runs →
  editorState.needsSync = true →
  syncEditorFromModel() BEFORE saves complete →
  Editor reloads with stale content → User edits lost

  Location: useUnifiedDocumentEditor.js:197-203

  ---
  4. Analysis Timing Kills Editing

  Current:
  - Analysis debounce: 1000ms (1 second)
  - Auto-save debounce: 3000ms (3 seconds)
  - Editor sync debounce: 300ms

  The Problem: Analysis runs before save completes, causing:
  1. User types "hello"
  2. After 300ms: sync scheduled
  3. After 1000ms: analysis runs, finds issues
  4. Analysis triggers needsSync = true
  5. Editor re-renders with OLD content (save hasn't finished)
  6. User's "hello" disappears or jumps around

  Location: unifiedDocumentStore.js:589 (analysis debounce), useUnifiedDocumentEditor.js:99 (sync debounce)

  ---
  5. Fix Application is a Disaster

  Current flow for "Apply Fix":
  User clicks "Apply Fix" → applyFix() →
  _applyTextFixToJSON() (client-side, instant) → 
  Issues removed → editorState.needsSync = true → 
  syncEditorFromModel() → editor.setContent() → FULL RERENDER → 
  Cursor lost, user was mid-sentence editing

  The Problem: Fixes force immediate full re-renders even when user is actively typing.

  Location: unifiedDocumentStore.js:468-479

  ---
  6. Abort Controllers Don't Work

  You have abort controllers for:
  - Analysis (analysisAbortController)
  - Auto-save (autoSaveAbortController)

  But they don't prevent the core issue:
  - Aborting analysis doesn't stop needsSync = true from being set
  - Aborting save doesn't prevent the next sync/analysis cycle
  - No coordination between aborts and the sync mechanism

  Location: unifiedDocumentStore.js:293-308, 696-707

  ---
  🔥 WHY IT FEELS BROKEN TO USERS

  1. Cursor jumps - Every re-render loses cursor position
  2. Text disappears - Stale content replaces fresh edits
  3. Laggy typing - Multiple debounces stack (300ms + 1s + 3s)
  4. Janky scrolling - Re-renders reset scroll position
  5. Lost selections - User selects text → analysis runs → selection gone

  ---
  ✅ ARCHITECTURAL SOLUTIONS

  Solution 1: Stop Using setContent() for Syncs

  Current (WRONG):
  // This DESTROYS the editor state
  editor.commands.setContent(editorContent, false, {
    preserveWhitespace: true
  });

  Correct Approach:
  // Use Tiptap transactions for surgical updates
  editor.commands.updateIssueDecorations(newIssues);
  // OR use ProseMirror transactions directly
  const tr = editor.state.tr;
  // ... apply minimal changes
  editor.view.dispatch(tr);

  Action: Refactor syncEditorFromModel() to use decorations and marks, not full content replacement.

  ---
  Solution 2: Separate Analysis from Rendering

  New Flow:
  User Edit → Tiptap (no sync to model) →
  (Background) 5s debounce → Analyze in Web Worker →
  Update ONLY issue decorations (no content change) →
  (Background) 8s debounce → Save to Supabase

  Key Changes:
  - Analysis updates decorations only (doesn't touch document content)
  - Analysis runs in Web Worker to avoid blocking UI
  - No automatic sync from model to editor during editing
  - Only sync on: initial load, fix application (when user explicitly requests)

  ---
  Solution 3: Fix the Save Pipeline

  New Architecture:
  Layer 1: Tiptap state (source of truth during editing)
  Layer 2: Optimistic local state (DocumentModel follows Tiptap)
  Layer 3: IndexedDB (5s debounce, reload safety)
  Layer 4: Supabase (10s debounce, cloud backup)

  Critical: Tiptap becomes the source of truth during editing sessions. DocumentModel is read-only until save completes.

  ---
  Solution 4: Decouple Issue Highlighting

  Current: Issues stored in DocumentModel → require full sync to update

  Better:
  // Store issues separately from content
  const [editorIssues, setEditorIssues] = useState([]);

  // Update ONLY decorations when issues change
  useEffect(() => {
    editor.commands.updateIssueDecorations(editorIssues);
  }, [editorIssues, editor]);

  No needsSync required - issues are pure decorations, not part of content.

  ---
  Solution 5: Debounce Timing Fix

  Current (BROKEN):
  - Sync: 300ms
  - Analysis: 1000ms
  - Auto-save: 3000ms

  Correct Timing:
  // Edit sync: NEVER (Tiptap is source of truth)
  // Analysis: 5000ms (5 seconds, non-blocking)
  // IndexedDB: 5000ms (5 seconds, reload safety)
  // Supabase: 10000ms (10 seconds, cloud backup)

  Why: Gives user time to finish thoughts before expensive operations run.

  ---
  📋 IMPLEMENTATION PLAN

  Phase 1: Stop the Re-renders (Day 1)

  1. Remove syncEditorFromModel() from automatic triggers
  2. Make scheduleIncrementalAnalysis() update decorations only
  3. Increase analysis debounce to 5s minimum

  Phase 2: Fix the Save Pipeline (Day 2)

  1. Make Tiptap the source of truth during edits
  2. Only write to DocumentModel on explicit save
  3. IndexedDB saves Tiptap JSON directly (not via DocumentModel)

  Phase 3: Decouple Issues (Day 3)

  1. Store issues in separate React state
  2. Update issue decorations without touching document
  3. Remove needsSync flag entirely

  Phase 4: Web Worker Analysis (Day 4)

  1. Move APA analysis to Web Worker
  2. Non-blocking background analysis
  3. Decorations update on worker message

  ---

● 🎯 ROOT CAUSE SUMMARY

  Your codebase tries to be too smart with bidirectional syncing between Tiptap and DocumentModel. This creates:

  1. Competing sources of truth - Both Tiptap and DocumentModel think they own the content
  2. Render cascades - Analysis → Model update → Editor sync → Re-render
  3. Timing race conditions - Save/analysis/sync all fighting over state
  4. Full re-renders - setContent() nukes editor state on every sync

  The fix: Make Tiptap the single source of truth during editing. DocumentModel becomes a read-only mirror that updates after the user stops typing, never during.

  ---