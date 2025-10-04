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
  metadataBase: new URL('https://apa-document-checker.vercel.app'),
  title: {
    default: 'Lilo - APA 7th Edition Rule Violation Checker & Format Validator',
    template: '%s | Lilo'
  },
  description: 'Free APA format violation checker for academic papers. Upload DOCX files to instantly detect formatting violations, citation errors, and reference list issues against APA 7th edition rules. No AI—just precise rule checking.',
  keywords: [
    'Lilo',
    'Lilo APA checker',
    'APA format checker',
    'APA violation checker',
    'APA 7th edition',
    'APA rule checker',
    'citation format checker',
    'reference format checker',
    'academic writing tool',
    'APA style guide',
    'DOCX validator',
    'formatting violation checker',
    'APA compliance checker',
    'research paper checker',
    'APA error detector',
    'APA guidelines',
    'free APA checker',
    'online APA tool',
    'academic document validator',
    'APA document checker'
  ],
  authors: [{ name: 'Lilo Team' }],
  creator: 'Lilo',
  publisher: 'Lilo',
  applicationName: 'Lilo',
  icons: {
    icon: [
      { url: '/LiloLogo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/apple-touch-icon.png',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Lilo - APA 7th Edition Rule Violation Checker',
    description: 'Upload DOCX files to instantly detect APA formatting violations. Find citation errors, reference list issues, and formatting problems with precise rule checking—no AI, no guesswork.',
    siteName: 'Lilo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lilo - Detect APA Format Violations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lilo - APA Rule Violation Checker',
    description: 'Instantly detect APA 7th edition formatting violations in your DOCX documents. Find citation errors, reference issues, and formatting problems—no AI, just precise rule checking.',
    images: ['/twitter-image.png'],
    creator: '@lilo',
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
    name: 'Lilo',
    description: 'Free APA format violation checker for academic papers. Upload DOCX documents to detect formatting violations, citation errors, and reference list issues against APA 7th edition rules.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://apa-document-checker.vercel.app',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    featureList: [
      'APA 7th Edition Rule Violation Detection',
      'Citation Format Checking',
      'Reference List Format Validation',
      'Real-time Violation Highlighting',
      'Detailed Violation Reports',
      'Compliance Scoring'
    ],
    screenshot: '/og-image.png',
    author: {
      '@type': 'Organization',
      name: 'Lilo Team'
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