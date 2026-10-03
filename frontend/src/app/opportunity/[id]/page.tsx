import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Zap, Trophy } from 'lucide-react';
import { extractCompanyName, getCompanyFaviconUrl } from '@/lib/branding';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('is_active', true)
    .single();

  if (!opportunity) {
    return {
      title: 'Opportunity Not Found | OpportunityHub India',
    };
  }

  const company = extractCompanyName(opportunity.normalized_company || opportunity.title);
  const truncatedDescription = opportunity.description.substring(0, 160) + (opportunity.description.length > 160 ? '...' : '');
  
  return {
    title: `${opportunity.title} | OpportunityHub India`,
    description: truncatedDescription,
    openGraph: {
      title: `${opportunity.title} | OpportunityHub India`,
      description: truncatedDescription,
      images: [
        {
          url: `/opportunity/${resolvedParams.id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: opportunity.title,
        }
      ]
    }
  };
}

export default async function OpportunityPage({ params }: Props) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('is_active', true)
    .single();

  if (!opportunity) {
    notFound();
  }

  const company = extractCompanyName(opportunity.normalized_company || opportunity.title);
  const faviconUrl = getCompanyFaviconUrl(company);
  
  const isVerifiedDeadline = opportunity.deadline_confidence === 'high';
  const deadlineBadgeClasses = isVerifiedDeadline
    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
    : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50';
    
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: opportunity.title,
    description: opportunity.description,
    datePosted: opportunity.created_at,
    validThrough: opportunity.deadline,
    employmentType: opportunity.type,
    hiringOrganization: {
      '@type': 'Organization',
      name: company,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: opportunity.location || 'India',
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-400 font-sans p-4 md:p-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              {faviconUrl ? (
                <img 
                  src={faviconUrl} 
                  alt={`${company} logo`} 
                  className="w-12 h-12 rounded-xl bg-white p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-xl text-white">
                  {company.charAt(0)}
                </div>
              )}
              
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                  {opportunity.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {opportunity.type}
                  </span>
                  {opportunity.deadline && (
                    <span className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 ${deadlineBadgeClasses}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(opportunity.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {opportunity.location && (
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {opportunity.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="prose prose-invert prose-zinc max-w-none mb-8">
              <h3 className="text-white font-semibold text-lg mb-3">About this opportunity</h3>
              <p className="whitespace-pre-wrap">{opportunity.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {opportunity.domain_tags && opportunity.domain_tags.length > 0 && (
                <div className="bg-[#0a0a0c] p-4 rounded-xl border border-zinc-800/50">
                  <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Domains
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.domain_tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-zinc-800/50 text-zinc-300 rounded-md text-xs font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-[#0a0a0c] p-4 rounded-xl border border-zinc-800/50">
                <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-400" /> Stats
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Effort Level</span>
                    <span className="text-white capitalize">{opportunity.effort_level || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Competitiveness</span>
                    <span className="text-white capitalize">{opportunity.competitiveness || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-zinc-800/80">
              <a 
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white text-black font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
              >
                Apply on {new URL(opportunity.source_url).hostname.replace('www.', '')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <button 
                className="px-6 py-3 rounded-xl border border-zinc-700 font-semibold text-white hover:bg-zinc-800 transition-colors"
              >
                Save Opportunity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
