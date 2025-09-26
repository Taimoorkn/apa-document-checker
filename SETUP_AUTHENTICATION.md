# Authentication & Document Management Setup

This guide will help you set up the complete authentication and document management system for APA Checker Pro.

## Prerequisites

- Node.js 18+
- A Supabase account (free tier is sufficient)
- npm or yarn

## 1. Install Required Dependencies

```bash
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js zustand uuid lucide-react
```

## 2. Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization and fill in project details:
   - **Name**: `apa-checker-pro`
   - **Database Password**: Generate a secure password
   - **Region**: Choose closest to your users
5. Wait for the project to be set up (2-3 minutes)

### Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (anon key)
   - **Project API Keys** > **anon** > **public**

### Step 3: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For enhanced security in production
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ Important**:
- Never commit `.env.local` to version control
- Add `.env.local` to your `.gitignore` file
- In production, set these as environment variables in your deployment platform

### Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy and paste the entire contents of `supabase-schema.sql`
3. Click **Run** to execute the schema

This will create:
- `documents` table with RLS policies
- `user_profiles` table
- Automatic triggers for user profile creation
- Proper indexes for performance

## 3. Authentication Configuration

### Email Templates (Optional)

1. Go to **Authentication** > **Email Templates**
2. Customize the email templates for:
   - Confirm signup
   - Magic link
   - Change email address
   - Reset password

### URL Configuration

1. Go to **Authentication** > **URL Configuration**
2. Set your site URL:
   - **Development**: `http://localhost:3000`
   - **Production**: `https://your-domain.com`
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

## 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see:
- New marketing-focused landing page
- Authentication system (Sign Up/Sign In)
- Protected app routes
- User dashboard with document management

## 5. Testing the Authentication System

### Test User Registration:
1. Click "Sign Up" on the landing page
2. Enter email and password
3. Check your email for confirmation link
4. Click the link to activate your account

### Test Document Management:
1. Sign in to your account
2. Go to the dashboard to see your documents
3. Upload a document in the app (`/app`)
4. Save the document to see it appear in your dashboard
5. Test document deletion with the confirmation modal

## 6. Features Implemented

### ✅ Authentication System
- Email/password registration and login
- Session persistence across page reloads
- Automatic redirect after login
- Secure logout functionality

### ✅ Route Protection
- Landing page for unauthenticated users
- Protected app routes redirect to login
- Redirect path preservation after login

### ✅ Document Management
- Save processed documents to user accounts
- Dashboard with document listing
- Document metadata (created/modified dates, issue counts)
- Delete documents with confirmation modal
- Auto-save functionality in the editor

### ✅ UI/UX Improvements
- Professional marketing-focused landing page
- Clean authentication forms with validation
- Loading states and error handling
- Success/error notifications
- Responsive design

## 7. Database Schema Details

### Documents Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- name: VARCHAR(255) - Document display name
- original_filename: VARCHAR(500) - Original file name
- content: TEXT - Plain text content
- html_content: TEXT - Processed HTML
- document_buffer: TEXT - Base64 encoded DOCX buffer
- formatting_data: JSONB - Rich formatting information
- analysis_results: JSONB - APA validation issues
- metadata: JSONB - File size, word count, etc.
- processing_info: JSONB - Processing metadata
- created_at/updated_at: TIMESTAMP WITH TIME ZONE
```

### Security (RLS Policies)
- Users can only access their own documents
- All CRUD operations are secured by Row Level Security
- Automatic user profile creation on signup

## 8. Deployment Notes

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy - the app is ready for production!

### Supabase Production
1. Upgrade to Supabase Pro if needed for production usage
2. Configure custom domain for auth (optional)
3. Set up proper backup strategies
4. Monitor usage in Supabase dashboard

## 9. Troubleshooting

### Common Issues:

**"Invalid JWT" errors**:
- Check your Supabase URL and anon key
- Ensure environment variables are properly set
- Clear browser local storage and try again

**Database connection errors**:
- Verify your database is active in Supabase
- Check if RLS policies are properly configured
- Ensure the schema was applied correctly

**Authentication redirects not working**:
- Verify URL configuration in Supabase dashboard
- Check that redirect URLs match exactly
- Ensure `next/navigation` is being used correctly

**Document saving fails**:
- Check browser console for detailed errors
- Verify user is properly authenticated
- Ensure document data is not exceeding size limits

## 10. Next Steps

The authentication and document management system is now complete! Consider these enhancements:

- Add email verification reminders
- Implement password reset functionality
- Add user profile management
- Enable document sharing features
- Add subscription/billing integration
- Implement real-time collaborative editing

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase project is properly configured
4. Check the Network tab for failed API requests