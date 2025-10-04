export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://apa-document-checker.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/document/', '/profile/', '/settings/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
