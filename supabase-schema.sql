-- APA Document Checker - Database Schema Setup
-- This script sets up all necessary tables, policies, and functions for the application
-- Safe to run multiple times (uses IF NOT EXISTS and handles errors gracefully)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure RLS is enabled on auth.users (may already be enabled)
DO $$ BEGIN
    ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN
        -- RLS might already be enabled, which is fine
        NULL;
END $$;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Create policies for user_profiles (users can only see/edit their own profile)
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Document analysis results
  analysis_score INTEGER,
  total_issues INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  major_issues INTEGER DEFAULT 0,
  minor_issues INTEGER DEFAULT 0,

  -- Document content (stored as JSON)
  document_data JSONB,
  issues_data JSONB,

  -- Document stats
  word_count INTEGER DEFAULT 0,
  char_count INTEGER DEFAULT 0,
  paragraph_count INTEGER DEFAULT 0,

  -- File storage
  file_path TEXT, -- Path to stored document file
  processed_file_path TEXT -- Path to processed/fixed document
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing document policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Create policies for documents (users can only see/edit their own documents)
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create document_history table for tracking changes
CREATE TABLE IF NOT EXISTS public.document_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'upload', 'analyze', 'fix_applied', 'export'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on document_history
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

-- Drop existing document_history policies if they exist
DROP POLICY IF EXISTS "Users can view their own document history" ON public.document_history;
DROP POLICY IF EXISTS "Users can insert their own document history" ON public.document_history;

-- Create policies for document_history
CREATE POLICY "Users can view their own document history" ON public.document_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document history" ON public.document_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON public.documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_document_history_document_id ON public.document_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_history_created_at ON public.document_history(created_at DESC);

-- Create storage bucket for documents (with better error handling)
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Check if bucket already exists
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'documents'
    ) INTO bucket_exists;

    -- Only create if it doesn't exist
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'documents',
            'documents',
            false,
            52428800, -- 50MB limit
            ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
        );
        RAISE NOTICE '📁 Created storage bucket: documents';
    ELSE
        RAISE NOTICE '📁 Storage bucket "documents" already exists - skipping';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️  Cannot create storage bucket due to permissions.';
        RAISE NOTICE '   Please create manually in Dashboard: Storage > Create bucket';
        RAISE NOTICE '   Name: documents, Private: true, Size: 50MB';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Storage bucket creation failed: %', SQLERRM;
        RAISE NOTICE '   Please create manually in Dashboard: Storage > Create bucket';
END $$;

-- Attempt to create storage policies (may fail due to permissions)
DO $$
BEGIN
    -- Drop existing storage policies if they exist
    DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

    -- Create storage policies
    CREATE POLICY "Users can upload their own documents" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'documents'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );

    CREATE POLICY "Users can view their own documents" ON storage.objects
        FOR SELECT USING (
            bucket_id = 'documents'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );

    CREATE POLICY "Users can update their own documents" ON storage.objects
        FOR UPDATE USING (
            bucket_id = 'documents'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );

    CREATE POLICY "Users can delete their own documents" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'documents'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );

    RAISE NOTICE '🔒 Created storage security policies';

EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️  Cannot create storage policies due to permissions.';
        RAISE NOTICE '   Storage will still work, but policies may need manual setup.';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Storage policies creation failed: %', SQLERRM;
        RAISE NOTICE '   Storage will still work, but may need manual policy setup.';
END $$;

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_last_modified ON public.documents;
CREATE TRIGGER update_documents_last_modified
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Final success message
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===== APA Document Checker Setup Complete! =====';
    RAISE NOTICE '✅ Database tables: user_profiles, documents, document_history';
    RAISE NOTICE '🔒 Row Level Security policies configured';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🔧 Auto-profile creation trigger installed';
    RAISE NOTICE '';
    RAISE NOTICE '📦 Storage bucket setup attempted';
    RAISE NOTICE '   If you see warnings above, create bucket manually:';
    RAISE NOTICE '   Dashboard > Storage > Create bucket > "documents" (Private)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your authentication system is ready!';
    RAISE NOTICE '   Next: Set up your .env.local file with Supabase keys';
    RAISE NOTICE '';
END $$;