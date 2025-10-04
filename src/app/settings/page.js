import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

// Cache for 60 seconds - settings change infrequently
export const revalidate = 60;

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  return <SettingsClient user={user} />;
}
