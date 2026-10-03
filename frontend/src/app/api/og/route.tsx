import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title');
    const company = searchParams.get('company');
    const type = searchParams.get('type');
    const deadline = searchParams.get('deadline');

    if (!title) {
      return new Response('Missing title', { status: 400 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#0a0a0c',
            fontFamily: 'sans-serif',
            padding: '80px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {company && (
              <div style={{ fontSize: '32px', color: '#a1a1aa', fontWeight: 'bold' }}>
                {company}
              </div>
            )}
            
            <div style={{ 
              fontSize: '64px', 
              color: 'white', 
              fontWeight: 'bold', 
              lineHeight: 1.2,
              marginBottom: '20px',
              maxWidth: '900px'
            }}>
              {title}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {type && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '12px 24px', 
                  backgroundColor: '#27272a',
                  color: 'white',
                  borderRadius: '100px',
                  fontSize: '28px',
                  fontWeight: 500
                }}>
                  {type}
                </div>
              )}
              {deadline && (
                <div style={{ fontSize: '28px', color: '#a1a1aa' }}>
                  Deadline: {deadline}
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            position: 'absolute', 
            bottom: '80px', 
            left: '80px', 
            fontSize: '32px', 
            color: '#a1a1aa',
            fontWeight: 'bold'
          }}>
            OpportunityHub India
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
