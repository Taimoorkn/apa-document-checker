// src/app/auth/callback/route.js - Auth callback handler for email confirmation
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles authentication callback after email confirmation or OAuth
 * Exchanges code for session and redirects to dashboard
 */
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(`${origin}/dashboard`);
}
