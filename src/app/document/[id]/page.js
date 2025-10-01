// src/app/document/[id]/page.js - Server component to fetch and display document
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import DocumentViewerClient from './DocumentViewerClient';

// Disable caching to ensure fresh data after fixes are applied
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-md w-full">
          <div className="text-center">
            {document.status === 'processing' && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-600 mb-6">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Processing Document</h1>
                <p className="text-gray-600 mb-4">Your document is currently being analyzed. This may take a moment...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full animate-pulse"></div>
                </div>
              </>
            )}
            {document.status === 'uploaded' && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Queued for Processing</h1>
                <p className="text-gray-600">Your document is queued and will be processed shortly.</p>
              </>
            )}
            {document.status === 'failed' && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Processing Failed</h1>
                <p className="text-red-600 mb-6">Document processing failed. Please try uploading again.</p>
                <a
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Return to Dashboard
                </a>
              </>
            )}
          </div>
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analysis Not Available</h1>
            <p className="text-gray-600 mb-6">Analysis results for this document could not be found.</p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Return to Dashboard
            </a>
          </div>
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
