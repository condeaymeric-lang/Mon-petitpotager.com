import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** La feuille du logo, découpée dans le fichier de la marque. */
const feuille = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public', 'feuille.png')
).toString('base64')}`;

export default function Icone() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F7F4EA', borderRadius: 13,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={feuille} alt="" width={46} height={46} />
      </div>
    ),
    { ...size }
  );
}
