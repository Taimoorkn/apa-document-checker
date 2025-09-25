# APA Document Checker - Authentication Setup Guide

This guide will help you set up the full authentication system with Supabase for the APA Document Checker application.

## 🚀 What's Been Implemented

### ✅ Core Features
- **User Authentication**: Complete signup/login system with email/password and Google OAuth
- **Protected Routes**: Users must be authenticated to access document checking features
- **Document Persistence**: Documents are saved to Supabase and linked to user accounts
- **User Dashboard**: Manage saved documents, view analysis history, and delete documents
- **Modern Landing Page**: Beautiful landing page for unauthenticated users
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### ✅ Technical Implementation
- **Supabase Integration**: Database, authentication, and file storage
- **Zustand State Management**: Extended existing stores with authentication
- **Next.js App Router**: Full support for modern Next.js routing
- **Row Level Security**: Database policies ensure users can only see their own data
- **Real-time Updates**: Document management with real-time UI updates

## 🔧 Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new account
2. Click "New Project"
3. Fill in project details:
   - **Organization**: Choose or create one
   - **Project Name**: `apa-document-checker` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Wait for project to be created (usually 1-2 minutes)

### 2. Configure Authentication

1. In your Supabase dashboard, go to **Authentication > Settings**
2. Under "Auth Providers", configure:

#### Email Provider:
- ✅ Enable email provider
- Set "Confirm email" to **disabled** for development (enable for production)

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```
7. Copy Client ID and Client Secret
8. In Supabase, paste them in Google provider settings
9. Enable Google provider

#### Site URL Configuration:
- **Site URL**: `http://localhost:3000` (development)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### 3. Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from the project root
3. Run the SQL to create all necessary tables and policies
4. Verify tables are created in **Database > Tables**

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   # Get these from Supabase Dashboard > Settings > API
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

   # Optional: Service role key for server-side operations
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   NODE_ENV=development
   ```

3. To find your Supabase credentials:
   - Go to **Settings > API** in your Supabase dashboard
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **Project API Keys > anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Install Dependencies

The required Supabase packages are already installed:
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 6. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🎯 How It Works

### Authentication Flow
1. **Unauthenticated users** see the landing page with signup/login options
2. **Authentication** happens via Supabase (email/password or Google OAuth)
3. **Authenticated users** are redirected to the dashboard
4. **Protected routes** automatically redirect to landing page if not authenticated

### Document Management
1. **Upload documents** in the editor view
2. **Documents are automatically saved** to Supabase after analysis
3. **View document history** in the dashboard management panel
4. **Delete documents** with confirmation dialog
5. **Search documents** by title or filename

### Database Structure
- **user_profiles**: Store additional user information
- **documents**: Store document metadata and analysis results
- **document_history**: Track document actions (upload, analyze, fix, export)
- **Storage bucket**: Store actual document files securely

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only see their own documents and profiles
- Database policies automatically filter data by user ID
- Server-side validation for all operations

### File Storage Security
- Documents stored in private Supabase storage bucket
- Access controlled through RLS policies
- 50MB file size limit with MIME type validation

### Authentication Security
- JWT tokens managed automatically by Supabase
- Secure OAuth flows with Google
- Session management with automatic refresh

## 🚀 Production Deployment

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NODE_ENV=production
```

### Supabase Production Settings
1. **Authentication > Settings**:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`
   - Enable email confirmation for production

2. **Database**:
   - Review and adjust RLS policies if needed
   - Set up database backups
   - Monitor usage and performance

### Vercel Deployment
1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 🐛 Troubleshooting

### Common Issues

#### "Invalid API key" error:
- Double-check environment variables in `.env.local`
- Ensure you're using the anon key, not service role key for client-side

#### Google OAuth not working:
- Verify redirect URIs in Google Cloud Console
- Check that Google provider is enabled in Supabase
- Ensure correct Client ID and Secret

#### Database permission errors:
- Run the SQL schema again to ensure RLS policies are created
- Check that user_profiles are created automatically

#### Documents not saving:
- Verify database tables exist
- Check browser network tab for API errors
- Ensure user is authenticated

### Debug Steps
1. Check browser console for JavaScript errors
2. Check Supabase logs in dashboard
3. Verify environment variables are loaded
4. Test authentication in Supabase dashboard

## 📚 Key Files and Components

### Authentication Components
- `src/components/AuthProvider.js` - Initializes auth state
- `src/components/AuthModal.js` - Login/signup modal
- `src/components/LandingPage.js` - Landing page for unauthenticated users
- `src/app/auth/callback/page.js` - OAuth callback handler

### Stores (State Management)
- `src/store/authStore.js` - Authentication state and actions
- `src/store/documentPersistenceStore.js` - Document CRUD operations
- `src/store/enhancedDocumentStore.js` - Extended with user context

### Dashboard Components
- `src/app/dashboard/page.js` - Main dashboard with dual modes
- `src/components/DocumentManagementPanel.js` - Document list and search

### Configuration
- `src/lib/supabase.js` - Supabase client configuration
- `supabase-schema.sql` - Database schema and policies
- `.env.example` - Environment variables template

## 🎉 You're All Set!

Once you've completed these steps, you'll have a fully functional authentication system with:
- Secure user registration and login
- Google OAuth integration
- Document persistence and management
- User dashboard with document history
- Protected routes and data

The application now requires users to authenticate before they can use the APA checking features, and all documents are saved to their personal account for future reference.

## 🔄 Next Steps

Consider these enhancements for production:
- Email confirmation for new signups
- Password reset functionality
- User profile management
- Document sharing between users
- Export document history
- Usage analytics and limits