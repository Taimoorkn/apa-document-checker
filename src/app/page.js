'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LandingPage from '@/components/LandingPage';
import LoadingState from '@/components/LoadingState';

export default function Home() {
  const { user, initialized, loading } = useAuth();

  // Show loading while auth is initializing
  if (!initialized || loading) {
    return <LoadingState />;
  }

  // If user is authenticated, redirect will be handled by useAuth hook
  // Show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />;
  }

  // This shouldn't be reached as authenticated users should be redirected
  return <LandingPage />;
}
