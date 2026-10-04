import { MetadataRoute } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://opphunt.in';
  
  const supabase = await createClient();
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, updated_at')
    .eq('is_active', true);
    
  const opportunityUrls: MetadataRoute.Sitemap = (opportunities || []).map((opp) => ({
    url: `${baseUrl}/opportunity/${opp.id}`,
    lastModified: opp.updated_at ? new Date(opp.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...opportunityUrls,
  ];
}
