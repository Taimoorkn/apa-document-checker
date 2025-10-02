import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserWithProfile } from '@/lib/profiles';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();

  // Get current user with profile data
  const { user, profile, error: userError } = await getUserWithProfile(supabase);

  if (userError || !user) {
    redirect('/login');
  }

  return <ProfileClient user={user} profile={profile} />;
}
