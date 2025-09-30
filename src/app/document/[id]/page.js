// src/app/document/[id]/page.js - Server component to fetch and display document
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import DocumentViewerClient from './DocumentViewerClient';

/**
 * Server component that fetches document from Supabase and passes to client
 */
export default async function DocumentPage({ params }) {
  // Await params as per Next.js 15 requirements
  const { id } = await params;

  // Create Supabase client with cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch document metadata from documents table
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // Ensure user owns this document
    .single();

  if (docError || !document) {
    console.error('Document not found:', docError);
    notFound();
  }

  // Check if document has been processed
  if (document.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Processing</h1>
          {document.status === 'processing' && (
            <>
              <p className="text-gray-600 mb-4">Your document is currently being processed. Please check back in a moment.</p>
              <div className="animate-pulse bg-blue-100 h-2 rounded"></div>
            </>
          )}
          {document.status === 'uploaded' && (
            <p className="text-gray-600">Your document is queued for processing.</p>
          )}
          {document.status === 'failed' && (
            <>
              <p className="text-red-600 mb-4">Document processing failed. Please try uploading again.</p>
              <a href="/dashboard" className="text-blue-600 hover:underline">Return to Dashboard</a>
            </>
          )}
        </div>
      </div>
    );
  }

  // Fetch analysis results from analysis_results table
  const { data: analysisResult, error: analysisError } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('document_id', id)
    .single();

  if (analysisError || !analysisResult) {
    console.error('Analysis results not found:', analysisError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Analysis Not Available</h1>
          <p className="text-gray-600 mb-4">Analysis results for this document could not be found.</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  // Pass document metadata and analysis data to client component
  return (
    <DocumentViewerClient
      user={user}
      document={document}
      analysisResult={analysisResult}
    />
  );
}
