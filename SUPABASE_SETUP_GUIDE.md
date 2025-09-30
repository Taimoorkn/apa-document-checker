# Supabase Setup Guide

## Phase 2: Supabase Integration Setup

This guide will walk you through setting up Supabase for the APA Document Checker application.

---

## Step 1: Create Supabase Account and Project

### 1.1 Sign Up for Supabase
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign In"
3. Sign up with GitHub, Google, or email

### 1.2 Create New Project
1. Click "New Project"
2. Fill in project details:
   - **Name**: `apa-document-checker` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., US East, EU West)
   - **Pricing Plan**: Free tier is sufficient for development
3. Click "Create new project"
4. Wait 2-3 minutes for project provisioning

---

## Step 2: Get Your API Keys

### 2.1 Find Your Project URL and Keys
1. In your Supabase project dashboard, click "Settings" (gear icon in sidebar)
2. Click "API" under Project Settings
3. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (safe for browser use)
   - **service_role**: `eyJhbGc...` (⚠️ NEVER expose in browser - backend only)

### 2.2 Save These Values
Copy these three values - you'll need them in the next step:
- Project URL
- anon public key
- service_role key

---

## Step 3: Configure Environment Variables

### 3.1 Create `.env.local` (Root Directory - Frontend)
In the root of your project (`C:\Users\Taimoor\Documents\GitHub\apa-document-checker`):

```bash
# Copy .env.example to .env.local
cp .env.example .env.local
```

Then edit `.env.local` and replace with your actual values:

```env
# Supabase Configuration (Frontend)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Worker Pool Configuration
WORKER_POOL_SIZE=4
MAX_PROCESSING_TIME=60000

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 3.2 Create `server/.env` (Server Directory - Backend)
In the server directory (`C:\Users\Taimoor\Documents\GitHub\apa-document-checker\server`):

```bash
# Copy server/.env.example to server/.env
cp server/.env.example server/.env
```

Then edit `server/.env` and replace with your actual values:

```env
# Supabase Configuration (Backend - Service Role Key)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Worker Pool Configuration
WORKER_POOL_SIZE=4
MAX_PROCESSING_TIME=60000

# Server Configuration
PORT=3001
NODE_ENV=development
```

⚠️ **IMPORTANT**:
- `.env.local` and `server/.env` are already in `.gitignore` - never commit these files
- Use `NEXT_PUBLIC_` prefix only for values safe to expose in browser
- `service_role` key should NEVER have `NEXT_PUBLIC_` prefix

---

## Step 4: Set Up Database Schema

### 4.1 Execute SQL Schema
1. In Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Open `supabase-schema.sql` from your project root
4. Copy the ENTIRE contents of the file
5. Paste into the SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for confirmation: "Success. No rows returned"

This creates:
- `documents` table (stores document metadata)
- `analysis_results` table (stores APA analysis data)
- All necessary indexes for performance
- Row Level Security (RLS) policies for user data isolation

### 4.2 Verify Tables Created
1. Click "Table Editor" in the left sidebar
2. You should see two tables:
   - `documents`
   - `analysis_results`

---

## Step 5: Set Up Storage Bucket

### 5.1 Create Storage Bucket
1. In Supabase dashboard, click "Storage" in the left sidebar
2. Click "Create a new bucket"
3. Configure bucket:
   - **Name**: `user-documents`
   - **Public bucket**: ❌ **OFF** (keep it private)
   - **File size limit**: `52428800` (50 MB)
   - **Allowed MIME types**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. Click "Create bucket"

### 5.2 Configure Storage Policies
1. Click on the `user-documents` bucket
2. Click "Policies" tab
3. The policies were already created in Step 4.1 (via SQL)
4. Verify you see three policies:
   - "Users can upload own documents"
   - "Users can download own documents"
   - "Users can delete own documents"

If policies are missing, go back to SQL Editor and run only the storage policy section from `supabase-schema.sql`.

---

## Step 6: Enable Email Authentication

### 6.1 Configure Auth Provider
1. In Supabase dashboard, click "Authentication" in the left sidebar
2. Click "Providers"
3. Find "Email" provider
4. Toggle it to **Enabled** (should be enabled by default)
5. Configure settings:
   - **Enable email confirmations**: ✅ ON (for production) or ❌ OFF (for development)
   - **Secure email change**: ✅ ON (recommended)
   - **Secure password change**: ✅ ON (recommended)
6. Click "Save"

### 6.2 Configure Email Templates (Optional)
1. Click "Email Templates" under Authentication
2. Customize confirmation email, reset password email, etc.
3. For development, you can use default templates

---

## Step 7: Test Supabase Connection

### 7.1 Restart Development Server
Since you've added new environment variables, restart your dev server:

```bash
# Stop current server (Ctrl+C if running)
# Then start again
npm run dev
```

### 7.2 Verify Environment Variables Loaded
Check the terminal output - it should show no errors about missing environment variables.

### 7.3 Test Authentication (Later)
Authentication will be tested after implementing login/signup pages in the next steps.

---

## Step 8: Security Checklist

### ✅ Before Proceeding, Verify:
- [ ] `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `server/.env` contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Both `.env.local` and `server/.env` are in `.gitignore`
- [ ] `service_role` key is NEVER in files with `NEXT_PUBLIC_` prefix
- [ ] Database tables `documents` and `analysis_results` exist
- [ ] Storage bucket `user-documents` exists and is private
- [ ] Row Level Security (RLS) is enabled on both tables
- [ ] Email authentication is enabled

---

## What Was Installed

### New NPM Packages:
- `@supabase/supabase-js` - Core Supabase client library
- `@supabase/ssr` - Server-side rendering utilities for Next.js

### New Files Created:
1. **`supabase-schema.sql`** - Database schema and RLS policies
2. **`.env.example`** - Template for frontend environment variables
3. **`server/.env.example`** - Template for backend environment variables
4. **`src/lib/supabase/client.js`** - Browser-side Supabase client
5. **`src/lib/supabase/server.js`** - Next.js server-side Supabase client
6. **`server/utils/supabaseClient.js`** - Express backend Supabase client
7. **`SUPABASE_SETUP_GUIDE.md`** - This file

---

## Next Steps

After completing this setup, you're ready for:

**Phase 2 Continuation**:
- ✅ Supabase project created
- ✅ Database schema configured
- ✅ Storage bucket created
- ✅ Environment variables set
- ⏳ Next: Implement authentication (login/signup pages)

**Phase 3: Authentication & Dashboard**:
- Create login page (`src/app/login/page.js`)
- Create signup page (`src/app/signup/page.js`)
- Create auth callback handler (`src/app/auth/callback/route.js`)
- Add route protection middleware (`src/middleware.js`)
- Create dashboard UI (`src/app/dashboard/page.js`)

---

## Troubleshooting

### Issue: "Invalid API key"
- **Solution**: Verify you copied the correct keys from Settings > API
- Check for extra spaces or missing characters

### Issue: "Table does not exist"
- **Solution**: Re-run the SQL schema in SQL Editor
- Verify in Table Editor that tables were created

### Issue: "Storage bucket not found"
- **Solution**: Manually create bucket in Storage section
- Ensure name is exactly `user-documents`

### Issue: Environment variables not loading
- **Solution**: Restart development server (`npm run dev`)
- Verify file names are exactly `.env.local` and `server/.env`
- Check files are in correct directories

### Issue: RLS policy errors
- **Solution**: Verify RLS policies were created in SQL Editor
- Check Authentication > Policies in Supabase dashboard

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Next.js with Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

**Setup Status**: ✅ Complete - Ready for authentication implementation
