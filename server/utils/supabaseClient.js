// server/utils/supabaseClient.js - Express backend Supabase client
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Supabase client for Express backend
 * Uses service role key for admin-level operations
 *
 * IMPORTANT: This client bypasses Row Level Security (RLS)
 * Use with caution and validate user permissions manually
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = supabase;
