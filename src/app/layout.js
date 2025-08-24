import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

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
      <body className="font-sans antialiased text-gray-800 bg-gray-50">
        <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}