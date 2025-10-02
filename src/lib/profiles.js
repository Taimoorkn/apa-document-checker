/**
 * Profile Data Helper Functions
 * Functions to fetch and update user profile data from the profiles table
 */

/**
 * Fetches user profile data from the profiles table
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to fetch profile for
 * @returns {Promise<Object>} Profile data or null
 */
export async function getUserProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Updates user profile data in the profiles table
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object>} Updated profile data or error
 */
export async function updateUserProfile(supabase, userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return { error };
  }

  return { data };
}

/**
 * Creates a new user profile (used when auto-creation fails)
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<Object>} Created profile data or error
 */
export async function createUserProfile(supabase, userId, email) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return { error };
  }

  return { data };
}

/**
 * Gets user with profile data (combines auth.users with profiles table)
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} Combined user and profile data
 */
export async function getUserWithProfile(supabase) {
  // First get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, profile: null, error: authError };
  }

  // Then fetch their profile
  const profile = await getUserProfile(supabase, user.id);

  // If profile doesn't exist, try to create it
  if (!profile) {
    const { data: newProfile } = await createUserProfile(supabase, user.id, user.email);
    return { user, profile: newProfile, error: null };
  }

  return { user, profile, error: null };
}
