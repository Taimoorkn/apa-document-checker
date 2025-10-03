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

          console.log('💾 Auto-saved to IndexedDB');

          // LAYER 2: Supabase (5s later, for cloud backup)
          setTimeout(async () => {
            try {
              const supabase = createClient();
              await supabase
                .from('analysis_results')
                .update({
                  tiptap_content: currentContent,
                  content_saved_at: new Date().toISOString()
                })
                .eq('document_id', documentId);

              console.log('✅ Auto-saved to Supabase');
            } catch (error) {
              console.error('❌ Supabase save failed:', error);
            }
          }, 5000);

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
