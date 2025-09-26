'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      router.push(redirectPath);
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated()) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Back Link */}
      <div className="pt-8 pb-4">
        <div className="max-w-md mx-auto px-4">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 pb-16">
        <LoginForm />
      </div>
    </div>
  );
}