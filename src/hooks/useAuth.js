'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const {
    user,
    session,
    loading,
    initialized,
    initialize,
    signUp,
    signIn,
    signOut,
    isAuthenticated,
    getUserId,
    getUserEmail,
    cleanup
  } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }

    return () => {
      cleanup();
    };
  }, [initialized, initialize, cleanup]);

  return {
    user,
    session,
    loading,
    initialized,
    signUp,
    signIn,
    signOut,
    isAuthenticated: isAuthenticated(),
    userId: getUserId(),
    userEmail: getUserEmail()
  };
};

export const useRequireAuth = (redirectTo = '/login') => {
  const { user, initialized, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading && !user) {
      // Store the current path for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/') {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      router.push(redirectTo);
    }
  }, [user, initialized, loading, redirectTo, router]);

  return {
    user,
    loading: loading || !initialized,
    isAuthenticated: !!user
  };
};