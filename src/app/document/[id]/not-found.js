import Link from 'next/link';

/**
 * Custom 404 page for document viewer
 * Shows when a document is not found or has been deleted
 */
export default function DocumentNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Document Not Found
          </h1>

          {/* Description */}
          <p className="mt-4 text-sm text-gray-600">
            The document you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </p>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Return to Dashboard
            </Link>
            <Link
              href="/"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
