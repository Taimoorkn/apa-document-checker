import './globals.css'
import '@/styles/tiptap.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from '@/components/ui/toaster'
import AppLayout from './AppLayout'

export const metadata = {
  title: 'APA 7th Edition Document Checker',
  description: 'Validate academic documents against APA 7th edition guidelines',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-800 bg-slate-50">
        <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
          <AppLayout>{children}</AppLayout>
        </ErrorBoundary>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}