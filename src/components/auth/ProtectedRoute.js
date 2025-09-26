'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Loader2,
  FileCheck
} from 'lucide-react';

export default function ProtectedRoute({ children, redirectTo = '/login' }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated()) {
        // Store the intended destination before redirecting
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login' && currentPath !== '/signup') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }

        router.push(redirectTo);
      } else {
        setIsChecking(false);
      }
    }
  }, [user, loading, isAuthenticated, router, redirectTo]);

  // Show loading state while checking authentication
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <FileCheck className="h-8 w-8 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            <span className="text-slate-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Only render children if user is authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}