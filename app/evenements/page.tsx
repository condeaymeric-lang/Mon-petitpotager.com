import Link from 'next/link';
import { profilCourant, evenementsAutour } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import CarteEvenement from '@/components/CarteEvenement';

export const dynamic = 'force-dynamic';

export default async function Evenements() {
  const { profil, secteur } = await profilCourant();
  const evenements = secteur
    ? await evenementsAutour(secteur.lat, secteur.lon, profil.rayon_km, 50)
    : [];

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page page-form">
        <div className="page-head">
          <h1>Autour de chez vous</h1>
          <p>
            Marchés, fêtes de village, brocantes et portes ouvertes dans les{' '}
            {profil.rayon_km} km. Proposés par les habitants du secteur.
          </p>
        </div>

        {evenements.length > 0 ? (
          <>
            <div className="events">
              {evenements.map((e) => <CarteEvenement key={e.id} evenement={e} />)}
            </div>
            <Link className="btn btn-s" href="/evenements/nouveau" style={{ marginTop: 16 }}>
              Proposer un événement
            </Link>
          </>
        ) : (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Aucun événement annoncé</h3>
            <p>
              Une fête de village, un marché, une brocante à venir près de chez vous ?
              Annoncez-le : vos voisins le verront ici.
            </p>
            <Link className="btn btn-p" href="/evenements/nouveau">Proposer un événement</Link>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
