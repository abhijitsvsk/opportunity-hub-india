import { ImageResponse } from '@vercel/og';

export const alt = 'OpportunityHub India';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0c',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '80px', margin: 0, fontWeight: 'bold' }}>
            OpportunityHub India
          </h1>
          <p style={{ fontSize: '32px', margin: 0, color: '#a1a1aa' }}>
            1,500+ verified internships, hackathons & tech opportunities for Indian CS students
          </p>
        </div>
        <div style={{ position: 'absolute', bottom: 40, fontSize: '24px', color: '#a1a1aa' }}>
          opphub.in
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
