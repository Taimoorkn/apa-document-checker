'use client';

import { useEffect, useRef } from 'react';
import { indexedDBManager } from '@/utils/indexedDBManager';
import { createClient } from '@/lib/supabase/client';

/**
 * Auto-save hook - Passive observer of editor changes
 * Saves to IndexedDB and Supabase without mutating editor
 */
export const useAutoSave = (editor, documentId, enabled = true) => {
  const lastSavedContentRef = useRef(null);
  const activeSaveAbortRef = useRef(null); // Track active save operation
  const debounceTimeoutRef = useRef(null); // Minimal debounce to batch rapid keystrokes

  useEffect(() => {
    if (!editor || !documentId || !enabled) {
      return;
    }

    const handleUpdate = () => {
      // Clear debounce timer
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Minimal debounce (300ms) - just enough to batch rapid keystrokes
      debounceTimeoutRef.current = setTimeout(async () => {
        // Abort any in-flight save operation
        if (activeSaveAbortRef.current) {
          activeSaveAbortRef.current.abort();
          activeSaveAbortRef.current = null;
        }

        try {
          const currentContent = editor.getJSON();
          const contentString = JSON.stringify(currentContent);

          // Skip if no changes
          if (lastSavedContentRef.current === contentString) {
            return;
          }

          lastSavedContentRef.current = contentString;

          // Create abort controller for this save operation
          const abortController = new AbortController();
          activeSaveAbortRef.current = abortController;

          // LAYER 1: IndexedDB (local, instant)
          await indexedDBManager.saveToIndexedDB(
            documentId,
            currentContent,
            { lastModified: Date.now() }
          );

          console.log('💾 Auto-saved to IndexedDB');

          // Check if aborted before starting network request
          if (abortController.signal.aborted) {
            console.log('🔄 Save cancelled (newer edit detected)');
            return;
          }

          // LAYER 2: Supabase (cloud backup, abortable)
          try {
            const supabase = createClient();
            const { error } = await supabase
              .from('analysis_results')
              .update({
                tiptap_content: currentContent,
                content_saved_at: new Date().toISOString()
              })
              .eq('document_id', documentId)
              .abortSignal(abortController.signal);

            if (error) throw error;

            console.log('✅ Auto-saved to Supabase');
            activeSaveAbortRef.current = null;
          } catch (error) {
            if (error.name === 'AbortError') {
              console.log('🔄 Supabase save cancelled (newer edit detected)');
            } else {
              console.error('❌ Supabase save failed:', error);
            }
            activeSaveAbortRef.current = null;
          }

        } catch (error) {
          console.error('❌ Auto-save failed:', error);
          activeSaveAbortRef.current = null;
        }
      }, 300); // Minimal debounce to batch rapid keystrokes
    };

    // Listen to editor updates
    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Cancel any active save operation on unmount
      if (activeSaveAbortRef.current) {
        activeSaveAbortRef.current.abort();
      }
    };
  }, [editor, documentId, enabled]);
};
