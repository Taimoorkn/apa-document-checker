-- Migration: Add Tiptap JSON Content Storage
-- Date: 2025-10-01
-- Description: Migrate from DOCX-centric to JSON-first architecture
-- This enables fast auto-save, offline support, and eliminates DOCX manipulation issues

-- ============================================================================
-- PHASE 1: Add new columns to analysis_results table
-- ============================================================================

-- Add tiptap_content as JSONB (source of truth for edited documents)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS tiptap_content JSONB;

-- Add column to track document editor version (for future migrations)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS editor_version INTEGER DEFAULT 1;

-- Add timestamp for when content was last saved
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS content_saved_at TIMESTAMP DEFAULT NOW();

-- Add index for faster JSONB queries (optional, for future analytics)
CREATE INDEX IF NOT EXISTS idx_analysis_results_tiptap_content_gin
ON analysis_results USING GIN (tiptap_content);

-- ============================================================================
-- PHASE 2: Update existing policies (no changes needed, but verify)
-- ============================================================================

-- RLS policies remain the same - users can only access their own analysis results

-- ============================================================================
-- PHASE 3: Create function to auto-update timestamps
-- ============================================================================

-- Update content_saved_at whenever tiptap_content is modified
CREATE OR REPLACE FUNCTION update_content_saved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tiptap_content IS DISTINCT FROM NEW.tiptap_content THEN
    NEW.content_saved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_content_saved_at ON analysis_results;
CREATE TRIGGER trigger_update_content_saved_at
  BEFORE UPDATE ON analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION update_content_saved_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify migration success:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'analysis_results';
-- SELECT * FROM pg_indexes WHERE tablename = 'analysis_results';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS trigger_update_content_saved_at ON analysis_results;
-- DROP FUNCTION IF EXISTS update_content_saved_at();
-- DROP INDEX IF EXISTS idx_analysis_results_tiptap_content_gin;
-- ALTER TABLE analysis_results DROP COLUMN IF EXISTS content_saved_at;
-- ALTER TABLE analysis_results DROP COLUMN IF EXISTS editor_version;
-- ALTER TABLE analysis_results DROP COLUMN IF EXISTS tiptap_content;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration is NON-DESTRUCTIVE - existing data is not modified
-- 2. document_data column remains for backward compatibility
-- 3. New auto-save flow will populate tiptap_content
-- 4. Export functionality will use tiptap_content when available, fallback to document_data
-- 5. DOCX files in storage remain unchanged (used as reference/original only)
