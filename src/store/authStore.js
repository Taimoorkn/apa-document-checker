'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export const useAuthStore = create((set, get) => ({
  // Authentication state
  user: null,
  session: null,
  isLoading: true,
  isSigningIn: false,
  isSigningUp: false,
  isSigningOut: false,
  authError: null,

  // User profile data
  userProfile: null,

  // Initialize auth and listen for changes
  initialize: async () => {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting initial session:', error);
        set({ authError: error.message, isLoading: false });
        return;
      }

      if (session) {
        set({
          session,
          user: session.user,
          isLoading: false
        });

        // Load user profile
        await get().loadUserProfile(session.user.id);
      } else {
        set({
          session: null,
          user: null,
          userProfile: null,
          isLoading: false
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (session) {
          set({
            session,
            user: session.user,
            isLoading: false,
            authError: null
          });

          // Load user profile
          await get().loadUserProfile(session.user.id);
        } else {
          set({
            session: null,
            user: null,
            userProfile: null,
            isLoading: false
          });
        }
      });

    } catch (error) {
      console.error('Error initializing auth:', error);
      set({
        authError: error.message,
        isLoading: false
      });
    }
  },

  // Sign in with email and password
  signInWithEmail: async (email, password) => {
    set({ isSigningIn: true, authError: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ authError: error.message, isSigningIn: false });
        return { success: false, error: error.message };
      }

      set({ isSigningIn: false });
      return { success: true, data };

    } catch (error) {
      const errorMessage = error.message || 'Failed to sign in';
      set({ authError: errorMessage, isSigningIn: false });
      return { success: false, error: errorMessage };
    }
  },

  // Sign up with email and password
  signUpWithEmail: async (email, password, fullName = '') => {
    set({ isSigningUp: true, authError: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        set({ authError: error.message, isSigningUp: false });
        return { success: false, error: error.message };
      }

      set({ isSigningUp: false });
      return { success: true, data };

    } catch (error) {
      const errorMessage = error.message || 'Failed to sign up';
      set({ authError: errorMessage, isSigningUp: false });
      return { success: false, error: errorMessage };
    }
  },


  // Sign out
  signOut: async () => {
    set({ isSigningOut: true, authError: null });

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        set({ authError: error.message, isSigningOut: false });
        return { success: false, error: error.message };
      }

      set({
        user: null,
        session: null,
        userProfile: null,
        isSigningOut: false
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error.message || 'Failed to sign out';
      set({ authError: errorMessage, isSigningOut: false });
      return { success: false, error: errorMessage };
    }
  },

  // Load user profile from database
  loadUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        set({ userProfile: data });
      } else {
        // Create user profile if it doesn't exist
        await get().createUserProfile(userId);
      }

    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },

  // Create user profile
  createUserProfile: async (userId) => {
    try {
      const { user } = get();
      if (!user) return;

      const profileData = {
        id: userId,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return;
      }

      set({ userProfile: data });

    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  },

  // Update user profile
  updateUserProfile: async (updates) => {
    try {
      const { user } = get();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error: error.message };
      }

      set({ userProfile: data });
      return { success: true, data };

    } catch (error) {
      const errorMessage = error.message || 'Failed to update profile';
      return { success: false, error: errorMessage };
    }
  },

  // Clear auth error
  clearAuthError: () => {
    set({ authError: null });
  },

  // Helper to check if user is authenticated
  isAuthenticated: () => {
    const { user, session } = get();
    return !!(user && session);
  },

  // Helper to check if user can access protected features
  canAccessFeatures: () => {
    return get().isAuthenticated();
  }
}));