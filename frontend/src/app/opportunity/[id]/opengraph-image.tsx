import { ImageResponse } from '@vercel/og';
import { createClient } from '@/utils/supabase/server';
import { extractCompanyName } from '@/lib/branding';

export const runtime = 'edge';

export const alt = 'Opportunity Details';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const { data: opportunity } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (!opportunity) {
      throw new Error('Not found');
    }

    const company = extractCompanyName(opportunity.normalized_company || opportunity.title);
    
    return new ImageResponse(
      (
        <div
          style={{
            background: '#0a0a0c',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                fontSize: 32,
                color: '#a1a1aa',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {company}
            </div>
            
            <div
              style={{
                fontSize: 64,
                color: '#ffffff',
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: '20px',
              }}
            >
              {opportunity.title}
            </div>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: 24,
                }}
              >
                {opportunity.type}
              </div>
              
              {opportunity.deadline && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: 24,
                  }}
                >
                  Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '80px',
              fontSize: 28,
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          >
            OpportunityHub India
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (e) {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#0a0a0c',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            color: '#ffffff',
            fontWeight: 'bold',
          }}
        >
          OpportunityHub India
        </div>
      ),
      { ...size }
    );
  }
}
