export default function robots() {
  const baseUrl = 'https://apa-document-checker.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/document/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
