# Supabase Database Setup

This document provides the complete Supabase setup instructions and SQL schema for the APA Checker application.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings → API
3. Update your `.env` file with the correct values

## Environment Variables

Make sure your `.env` file contains:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Schema

Execute the following SQL in your Supabase SQL Editor to set up the required tables and policies.

### 1. Create Profiles Table

```sql
-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. Create Documents Table

```sql
-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  original_content TEXT DEFAULT '',
  processed_content TEXT DEFAULT '',
  formatting_data JSONB DEFAULT '{}',
  issues JSONB DEFAULT '[]',
  analysis_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'processing' CHECK (status IN ('uploading', 'processing', 'analyzed', 'error')),
  file_size INTEGER DEFAULT 0,
  content_preview TEXT DEFAULT '',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create document policies
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Create Auto-Update Functions

```sql
-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 4. Create Profile Auto-Creation Function

```sql
-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 5. Create Document Statistics View (Optional)

```sql
-- Create a view for document statistics
CREATE OR REPLACE VIEW public.user_document_stats AS
SELECT
  user_id,
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE status = 'analyzed') as analyzed_documents,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_documents,
  COUNT(*) FILTER (WHERE status = 'error') as error_documents,
  AVG(file_size) as avg_file_size,
  MAX(created_at) as last_upload
FROM public.documents
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON public.user_document_stats TO authenticated;
```

### 6. Create Indexes for Performance

```sql
-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON public.documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_user_created ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- GIN index for JSONB columns (for faster JSON queries)
CREATE INDEX IF NOT EXISTS idx_documents_issues_gin ON public.documents USING GIN (issues);
CREATE INDEX IF NOT EXISTS idx_documents_analysis_gin ON public.documents USING GIN (analysis_data);
CREATE INDEX IF NOT EXISTS idx_documents_formatting_gin ON public.documents USING GIN (formatting_data);
```

## Security Configuration

### Row Level Security Policies

The schema includes comprehensive RLS policies that ensure:

1. **Profiles**: Users can only access their own profile data
2. **Documents**: Users can only access documents they own
3. **Auto-creation**: Profiles are automatically created when users sign up

### API Security

The application uses:
- **Authenticated access**: All document operations require authentication
- **User isolation**: All queries are scoped to the authenticated user
- **Input validation**: Client-side and server-side validation

## Testing the Setup

After running the SQL schema, test your setup:

1. **Authentication Test**:
   ```javascript
   // Test sign up
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'testpassword123'
   });
   ```

2. **Profile Test**:
   ```javascript
   // Test profile creation
   const { data: profile } = await supabase
     .from('profiles')
     .select('*')
     .single();
   ```

3. **Document Test**:
   ```javascript
   // Test document creation
   const { data, error } = await supabase
     .from('documents')
     .insert({
       name: 'test-document.docx',
       content_preview: 'Test content...',
       status: 'processing'
     });
   ```

## Migration Commands

If you need to reset or update your schema:

```sql
-- Drop all tables (DESTRUCTIVE - use with caution)
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

## Backup Strategy

Recommended backup approach:

1. **Database Backups**: Use Supabase's built-in backup features
2. **Migration Files**: Keep all schema changes in version-controlled migration files
3. **Environment Separation**: Use separate Supabase projects for development/staging/production

## Performance Optimization

For larger datasets, consider:

1. **Partitioning**: Partition documents table by date if you have many documents
2. **Archiving**: Move old documents to archive tables
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Connection Pooling**: Use Supabase's connection pooling features

## Monitoring

Monitor your database:

1. **Query Performance**: Use Supabase dashboard to monitor slow queries
2. **Storage Usage**: Monitor document storage and implement cleanup policies
3. **Rate Limits**: Monitor API usage and implement rate limiting if needed

---

## Support

If you encounter issues:

1. Check Supabase logs in the dashboard
2. Verify RLS policies are correctly applied
3. Ensure environment variables are set correctly
4. Test authentication flow in isolation

For additional help, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)