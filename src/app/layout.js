import './globals.css'
import '@/styles/tiptap.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from '@/components/ui/toaster'
import { Inter, Outfit } from 'next/font/google'
import AppLayout from './AppLayout'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://apa-document-checker.vercel.app'),
  title: {
    default: 'APA Document Checker - Free APA 7th Edition Format Validator & Citation Checker',
    template: '%s | APA Document Checker'
  },
  description: 'Free online APA format checker for academic papers. Instantly validate your DOCX documents against APA 7th edition guidelines. Check citations, references, formatting, headings, and more with AI-powered analysis.',
  keywords: [
    'APA format checker',
    'APA 7th edition',
    'citation checker',
    'reference checker',
    'academic writing tool',
    'APA style guide',
    'DOCX validator',
    'formatting checker',
    'APA compliance',
    'research paper checker',
    'bibliography checker',
    'APA guidelines',
    'free APA checker',
    'online APA tool',
    'academic document validator'
  ],
  authors: [{ name: 'APA Document Checker Team' }],
  creator: 'APA Document Checker',
  publisher: 'APA Document Checker',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'APA Document Checker - Free APA 7th Edition Format Validator',
    description: 'Free online tool to validate your academic documents against APA 7th edition guidelines. Check citations, references, formatting, and get instant feedback.',
    siteName: 'APA Document Checker',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'APA Document Checker - Validate APA Format',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APA Document Checker - Free APA Format Validator',
    description: 'Instantly validate your academic documents against APA 7th edition guidelines. Free online tool with AI-powered analysis.',
    images: ['/twitter-image.png'],
    creator: '@apadocchecker',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: '/',
  },
  category: 'Education',
};

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'APA Document Checker',
    description: 'Free online APA format checker for academic papers. Validate DOCX documents against APA 7th edition guidelines.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://apa-document-checker.vercel.app',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    featureList: [
      'APA 7th Edition Format Validation',
      'Citation Checker',
      'Reference List Validator',
      'Real-time Document Editor',
      'Automated Fix Suggestions',
      'Compliance Scoring'
    ],
    screenshot: '/og-image.png',
    author: {
      '@type': 'Organization',
      name: 'APA Document Checker Team'
    }
  };

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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