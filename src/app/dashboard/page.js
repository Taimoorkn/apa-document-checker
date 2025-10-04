import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserWithProfile } from '@/lib/profiles';
import DashboardClient from './DashboardClient';

// Cache for 30 seconds - fresh enough but much faster navigation
export const revalidate = 30;

/**
 * Dashboard page (Server Component)
 * Fetches user data and documents, then renders client component
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user with profile data
  const { user, profile, error: userError } = await getUserWithProfile(supabase);

  // Redirect to login if not authenticated (fallback - middleware should handle this)
  if (userError || !user) {
    redirect('/login');
  }

  // Fetch user's documents with analysis results (using LEFT JOIN)
  const { data: documents, error: documentsError} = await supabase
    .from('documents')
    .select(`
      *,
      analysis_results (
        compliance_score,
        issue_count
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (documentsError) {
    console.error('Error fetching documents:', documentsError);
  }

  // Flatten analysis_results into document objects for easier access
  const documentsWithScores = (documents || []).map(doc => ({
    ...doc,
    compliance_score: doc.analysis_results?.[0]?.compliance_score || null,
    issue_count: doc.analysis_results?.[0]?.issue_count || null,
  }));

  return (
    <DashboardClient
      user={user}
      profile={profile}
      initialDocuments={documentsWithScores}
    />
  );
}
