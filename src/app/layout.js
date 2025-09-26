import './globals.css'
import '@/styles/tiptap.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { DocumentsProvider } from '@/contexts/DocumentsContext'

export const metadata = {
  title: 'APA 7th Edition Document Checker',
  description: 'Validate academic documents against APA 7th edition guidelines',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-inter antialiased text-slate-700 bg-slate-50">
        <AuthProvider>
          <DocumentsProvider>
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              {children}
            </ErrorBoundary>
          </DocumentsProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}