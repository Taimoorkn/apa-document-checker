# APA Document Checker - Simple Authentication Setup

This guide will help you set up email-only authentication with Supabase for the APA Document Checker application.

## 🚀 What You'll Get

- **Email/Password Authentication**: Simple signup and login
- **Protected Routes**: Users must be authenticated to access the app
- **Document Persistence**: Documents are saved and linked to user accounts
- **User Dashboard**: Manage saved documents and view analysis history
- **Modern Landing Page**: Beautiful landing page for visitors

## 🔧 Quick Setup (5 minutes)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `apa-document-checker`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to you
4. Click **"Create new project"** and wait ~2 minutes

### 2. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql` from your project
3. Paste it in the SQL Editor and click **"Run"**
4. You should see success messages with checkmarks ✅
5. Verify tables were created in **Database > Tables**

### 2.5. Create Storage Bucket (Manual Step)

1. Go to **Storage** in your Supabase dashboard
2. Click **"Create new bucket"**
3. Set:
   - **Name**: `documents`
   - **Public**: ❌ **Uncheck** this (keep it private)
   - **File size limit**: `50MB`
   - **Allowed MIME types**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. Click **"Create bucket"**

### 3. Configure Authentication

1. Go to **Authentication > Settings** in Supabase
2. Under **"Auth Providers"**:
   - ✅ **Email** should already be enabled
   - ❌ **Disable** email confirmation for development (leave **"Enable email confirmations"** unchecked)

3. Under **"URL Configuration"**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: `http://localhost:3000/auth/callback`

### 4. Get Your API Keys

1. Go to **Settings > API** in Supabase
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API Keys > anon public**: `eyJhbGciOi...`

### 5. Set Environment Variables

1. In your project root, copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NODE_ENV=development
   ```

### 6. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the landing page!

## 🎯 How It Works

### For Visitors (Not Logged In)
- See beautiful landing page with signup/login buttons
- Can't access document checking features

### For Users (Logged In)
- Redirected to dashboard automatically
- Can upload and analyze documents
- Documents are saved to their account
- Can view, search, and delete document history

### Authentication Flow
1. Click **"Sign Up"** or **"Sign In"** on landing page
2. Enter email and password in modal
3. For signup: account created instantly (no email verification in development)
4. Automatically redirected to dashboard
5. Documents uploaded are saved to user's account

## 🔧 Database Tables Created

The SQL schema creates these tables automatically:

- **`user_profiles`** - Store user information
- **`documents`** - Store document metadata and analysis results
- **`document_history`** - Track all document actions
- **Storage bucket** - Store actual document files securely

All tables have Row Level Security (RLS) - users can only see their own data.

## 🐛 Troubleshooting

### "Invalid API key" error
- Check your `.env.local` file has correct values
- Make sure you copied the **anon** key, not the service role key
- Restart the dev server: `npm run dev`

### Can't sign up/login
- Check Supabase **Authentication > Users** to see if account was created
- Look at browser console for error messages
- Verify the SQL schema was run successfully

### Documents not saving
- Check **Database > Tables** to see if tables exist
- Look at browser Network tab for API errors
- Ensure you're logged in (check user avatar in top right)

## 🎉 You're Done!

That's it! You now have:
- ✅ User authentication with email/password
- ✅ Protected app that requires login
- ✅ Document persistence linked to user accounts
- ✅ User dashboard with document management
- ✅ Secure database with proper access controls

The setup is much simpler without Google OAuth, but still provides all the core functionality you need for a production-ready application.

## 🚀 Production Deployment

For production (like Vercel):

1. **Update Supabase URLs**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

2. **Enable email confirmation**:
   - Go to **Authentication > Settings**
   - ✅ Check **"Enable email confirmations"**

3. **Add environment variables to Vercel**:
   - Same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Set `NODE_ENV=production`