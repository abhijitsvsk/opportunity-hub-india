import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://opphunt.in';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/opportunity/', '/login', '/api/og'],
      disallow: ['/admin', '/api/', '/dashboard', '/profile', '/onboarding'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
