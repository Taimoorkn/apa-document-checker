import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Inter, Roboto } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata = {
  title: {
    default: 'APA 7th Edition Document Checker - Professional Academic Validation Tool',
    template: '%s | APA Document Checker'
  },
  description: 'Professional APA 7th edition document checker and validator. Analyze academic papers, essays, and research documents for proper formatting, citations, references, and compliance with APA guidelines. Free online tool for students, researchers, and academics.',
  keywords: [
    'APA 7th edition',
    'APA format checker',
    'academic document validator',
    'citation checker',
    'reference formatter',
    'academic writing tool',
    'APA guidelines',
    'research paper checker',
    'academic formatting',
    'APA style guide',
    'document analysis',
    'writing assistant'
  ],
  authors: [{ name: 'APA Document Checker' }],
  creator: 'APA Document Checker',
  publisher: 'APA Document Checker',
  category: 'Education',
  classification: 'Academic Tools',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://apa-document-checker.vercel.app',
    siteName: 'APA Document Checker',
    title: 'APA 7th Edition Document Checker - Professional Academic Validation Tool',
    description: 'Professional APA 7th edition document checker and validator. Analyze academic papers for proper formatting, citations, and compliance with APA guidelines.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'APA Document Checker - Validate Your Academic Documents',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APA 7th Edition Document Checker',
    description: 'Professional tool to validate academic documents against APA 7th edition guidelines. Free and easy to use.',
    images: ['/twitter-image.png'],
    creator: '@apadocchecker',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  alternates: {
    canonical: 'https://apa-document-checker.vercel.app',
  },
};

export default function RootLayout({ children }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "APA 7th Edition Document Checker",
    "description": "Professional APA 7th edition document checker and validator for academic papers, essays, and research documents.",
    "url": "https://apa-document-checker.vercel.app",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "browserRequirements": "Modern web browser with JavaScript enabled",
    "softwareVersion": "1.0",
    "author": {
      "@type": "Organization",
      "name": "APA Document Checker"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "featureList": [
      "APA 7th Edition Validation",
      "Citation Checking",
      "Reference Formatting",
      "Document Structure Analysis",
      "Real-time Feedback",
      "Academic Writing Guidelines"
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
        
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="APA Checker" />
        <meta name="format-detection" content="telephone=no" />
        
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#6366f1" />
      </head>
      <body className={`${inter.className} antialiased text-gray-800 bg-gray-50`}>
        <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
          {children}
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}