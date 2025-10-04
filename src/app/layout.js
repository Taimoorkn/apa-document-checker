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
    default: 'Lilo - Free APA 7th Edition Format Validator & Citation Checker',
    template: '%s | Lilo'
  },
  description: 'Lilo is a free online APA format checker for academic papers. Instantly validate your DOCX documents against APA 7th edition guidelines. Check citations, references, formatting, headings, and more with custom analysis.',
  keywords: [
    'Lilo',
    'Lilo APA checker',
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
    title: 'Lilo - Free APA 7th Edition Format Validator',
    description: 'Free online tool to validate your academic documents against APA 7th edition guidelines. Check citations, references, formatting, and get instant feedback.',
    siteName: 'Lilo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lilo - Validate APA Format',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lilo - Free APA Format Validator',
    description: 'Instantly validate your academic documents against APA 7th edition guidelines. Free online tool with custom analysis.',
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