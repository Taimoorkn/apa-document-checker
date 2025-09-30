-- Supabase Database Schema for APA Document Checker
-- Execute this SQL in the Supabase SQL Editor after creating your project

-- ============================================================================
-- TABLE: documents
-- Stores metadata about uploaded documents
-- ============================================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- ============================================================================
-- TABLE: analysis_results
-- Stores APA analysis results for documents
-- ============================================================================
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  compliance_score INTEGER,
  issue_count INTEGER,
  issues JSONB,
  document_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analysis_results_document_id ON analysis_results(document_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Documents Policies: Users can only see their own documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Analysis Results Policies: Users can only see analysis for their documents
CREATE POLICY "Users can view own analysis"
  ON analysis_results FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own analysis"
  ON analysis_results FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STORAGE BUCKET: user-documents
-- Manual Setup Required (cannot be created via SQL):
-- 1. Go to Storage > Create a new bucket
-- 2. Name it: "user-documents"
-- 3. Set Public: No (private)
-- 4. File size limit: 52428800 (50MB)
-- 5. Allowed MIME types: application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- ============================================================================

-- Storage Policies (execute AFTER creating the bucket)
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can download own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================
-- 1. Create Supabase account at https://supabase.com
-- 2. Create a new project (note the project URL and anon key)
-- 3. Go to SQL Editor and execute this entire script
-- 4. Go to Storage > Create bucket "user-documents" with settings above
-- 5. Copy environment variables to .env.local and server/.env
-- 6. Enable Email Authentication in Authentication > Providers
-- ============================================================================
