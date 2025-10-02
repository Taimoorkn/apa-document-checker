# User Profiles Table Setup Instructions

This document explains how to set up the user profiles table in your Supabase database and what changes have been made to the codebase.

## Step 1: Execute SQL Schema in Supabase

1. Go to your Supabase Dashboard → SQL Editor
2. Open the file `supabase-profiles-schema.sql`
3. Copy ALL the SQL code from that file
4. Paste it into the Supabase SQL Editor
5. Click "Run" to execute the SQL

### What this SQL does:
- Creates a `profiles` table with fields: id, email, display_name, full_name, avatar_url, bio, phone, preferences, created_at, updated_at
- Sets up Row Level Security (RLS) policies so users can only see/edit their own profile
- Creates a trigger that automatically creates a profile when a new user signs up
- Creates a trigger that automatically updates the `updated_at` timestamp

## Step 2: Verify the Setup

After running the SQL:

1. Go to Supabase Dashboard → Table Editor
2. You should now see a new table called `profiles`
3. The table should have RLS enabled (green shield icon)
4. Try signing up a new user - a profile should be automatically created

## Step 3: Test the Profile Page

1. Sign in to your application
2. Navigate to the Profile page (sidebar navigation)
3. You should see:
   - Display Name field
   - Full Name field
   - Phone Number field
   - Bio field (textarea)
   - Email (read-only)
   - Member Since date (read-only)
4. Click "Edit Profile" button
5. Fill in the fields and click "Save Changes"
6. Profile should update and show a success toast notification

## Code Changes Made

### New Files Created:
1. **`supabase-profiles-schema.sql`** - SQL schema for profiles table
2. **`src/lib/profiles.js`** - Helper functions for profile operations:
   - `getUserProfile()` - Fetch user profile
   - `updateUserProfile()` - Update user profile
   - `createUserProfile()` - Create profile (fallback)
   - `getUserWithProfile()` - Get auth user + profile data

### Files Modified:

#### Server Components (Data Fetching):
1. **`src/app/dashboard/page.js`**
   - Now fetches profile data using `getUserWithProfile()`
   - Passes `profile` prop to DashboardClient

2. **`src/app/profile/page.js`**
   - Now fetches profile data using `getUserWithProfile()`
   - Passes `profile` prop to ProfileClient

3. **`src/app/document/[id]/page.js`**
   - Now fetches profile data using `getUserProfile()`
   - Passes `profile` prop to DocumentViewerClient

#### Client Components (UI):
4. **`src/app/dashboard/DashboardClient.js`**
   - Now accepts `profile` prop
   - Passes profile to Sidebar and Dashboard components

5. **`src/app/profile/ProfileClient.js`**
   - Completely redesigned with editable fields
   - Added edit/save/cancel functionality
   - Shows display_name, full_name, phone, bio
   - Uses shadcn Textarea and Label components

6. **`src/app/document/[id]/DocumentViewerClient.js`**
   - Now accepts `profile` prop (for future use)

### New Shadcn Components Added:
- `Textarea` component (for bio field)
- `Label` component (for form labels)

## Profile Data Structure

```javascript
profile = {
  id: "user-uuid", // Same as auth.users.id
  email: "user@example.com",
  display_name: "JohnDoe",
  full_name: "John Doe",
  phone: "+1234567890",
  bio: "About me...",
  avatar_url: null, // For future use
  preferences: {}, // JSONB for future settings
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z"
}
```

## Future Enhancements

You can now easily extend the profiles system:

1. **Avatar Upload**: Add avatar_url upload functionality
2. **Preferences**: Store user preferences in the preferences JSONB field
3. **Additional Fields**: Add more profile fields by updating the SQL schema
4. **Profile Completeness**: Show profile completion percentage
5. **Email Update**: Implement Supabase auth.updateUser() for email changes

## Troubleshooting

### Profile not created automatically?
- Check if the trigger is enabled in Supabase
- Try manually creating a profile using the SQL Editor:
```sql
INSERT INTO profiles (id, email)
VALUES ('user-uuid-here', 'user@example.com');
```

### Can't update profile?
- Check RLS policies are enabled
- Verify you're logged in
- Check browser console for errors

### Fields not saving?
- Check that the field names match the database columns
- Verify the `updateUserProfile()` function in `src/lib/profiles.js`
- Check Supabase logs for any database errors

## Notes

- The profile is **separate** from auth.users table (by design for security)
- Auth email is stored in both auth.users and profiles for convenience
- All profile operations respect RLS - users can only modify their own data
- Profile creation is automatic thanks to the database trigger
