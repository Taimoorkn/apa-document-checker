import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

/**
 * Dashboard page (Server Component)
 * Fetches user data and documents, then renders client component
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated (fallback - middleware should handle this)
  if (userError || !user) {
    redirect('/login');
  }

  // Fetch user's documents
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (documentsError) {
    console.error('Error fetching documents:', documentsError);
  }

  return (
    <DashboardClient
      user={user}
      initialDocuments={documents || []}
    />
  );
}
