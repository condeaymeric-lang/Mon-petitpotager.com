import Link from 'next/link';
import PiedDePage from '@/components/PiedDePage';
import { Marque } from './Marque';

/** Gabarit commun aux pages légales : accessibles sans compte, puisqu'il
 *  faut pouvoir les lire avant de s'inscrire. */
export default function PageLegale({
  titre, maj, children,
}: { titre: string; maj: string; children: React.ReactNode }) {
  return (
    <>
      <div className="app"><div className="page page-form">
        <Link href="/" className="brand" style={{ fontSize: '1.7rem', marginBottom: 18 }}>
          <Marque hauteur={58} />
        </Link>
        <div className="page-head">
          <h1>{titre}</h1>
          <p>Dernière mise à jour : {maj}.</p>
        </div>
        <div className="legal">{children}</div>
      </div></div>
      <PiedDePage />
    </>
  );
}
