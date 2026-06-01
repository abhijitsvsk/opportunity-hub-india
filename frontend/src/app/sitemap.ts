import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://opportunityhub.com', // Replace with real production URL
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
