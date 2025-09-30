// server/utils/supabaseClient.js - Express backend Supabase client
const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase client for Express backend
 * Uses service role key for admin-level operations
 *
 * IMPORTANT: This client bypasses Row Level Security (RLS)
 * Use with caution and validate user permissions manually
 *
 * Environment variables should be in root .env file:
 * - NEXT_PUBLIC_SUPABASE_URL (same URL used by frontend)
 * - SUPABASE_SERVICE_ROLE_KEY (backend only, never expose to browser)
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = supabase;
