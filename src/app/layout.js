import './globals.css'
import '@/styles/tiptap.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import AuthProvider from '@/components/AuthProvider'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  title: 'APA Checker Pro - Professional APA 7th Edition Validator',
  description: 'The most comprehensive APA 7th edition compliance checker. Get instant feedback, smart corrections, and professional formatting for your academic documents.',
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
        <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}