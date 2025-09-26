'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, signUp, signIn, signOut, getCurrentUser } from '../../lib/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      session: null,
      loading: false,
      initialized: false,

      // Auth actions
      initialize: async () => {
        try {
          set({ loading: true });

          // Get current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
            set({ user: null, session: null, loading: false, initialized: true });
            return;
          }

          if (session) {
            set({ user: session.user, session, loading: false, initialized: true });
          } else {
            set({ user: null, session: null, loading: false, initialized: true });
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                set({ user: session?.user || null, session });
              } else if (event === 'SIGNED_OUT') {
                set({ user: null, session: null });
              }
            }
          );

          // Store subscription for cleanup
          set({ authSubscription: subscription });

        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ user: null, session: null, loading: false, initialized: true });
        }
      },

      signUp: async (email, password, fullName = '') => {
        try {
          set({ loading: true });

          const { user, session } = await signUp(email, password, {
            full_name: fullName
          });

          if (user && session) {
            set({ user, session, loading: false });
            return { user, session };
          } else {
            set({ loading: false });
            return { user: null, session: null };
          }
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signIn: async (email, password) => {
        try {
          set({ loading: true });

          const { user, session } = await signIn(email, password);

          set({ user, session, loading: false });
          return { user, session };
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ loading: true });

          await signOut();

          set({ user: null, session: null, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Utility functions
      isAuthenticated: () => {
        const { user } = get();
        return !!user;
      },

      getUserId: () => {
        const { user } = get();
        return user?.id || null;
      },

      getUserEmail: () => {
        const { user } = get();
        return user?.email || null;
      },

      cleanup: () => {
        const { authSubscription } = get();
        if (authSubscription) {
          authSubscription.unsubscribe();
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist essential auth state
        user: state.user,
        session: state.session,
        initialized: state.initialized
      })
    }
  )
);