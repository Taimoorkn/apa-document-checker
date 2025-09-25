'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthCallback() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    // Give the auth store time to process the callback
    const timer = setTimeout(() => {
      if (isAuthenticated()) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 text-center mt-4">Completing authentication...</p>
      </div>
    </div>
  );
}