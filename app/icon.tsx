import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icone() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F7F4EA', borderRadius: 7,
      }}>
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          <path d="M20 32V16" stroke="#143424" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M20 20c0-6 5-10 11-10 .5 6-5 10.6-11 10Z" stroke="#143424" strokeWidth="2" fill="none" />
          <path d="M20 24c0-5-4-8.4-9-8.4-.4 5 4 8.9 9 8.4Z" stroke="#6FA83A" strokeWidth="2" fill="none" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
