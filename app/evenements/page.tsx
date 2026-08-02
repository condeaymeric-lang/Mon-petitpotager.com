import Link from 'next/link';
import { evenementsAutour } from '@/lib/donnees';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import PiedDePage from '@/components/PiedDePage';
import { Illustration } from '@/components/Illustrations';
import CarteEvenement from '@/components/CarteEvenement';

export const dynamic = 'force-dynamic';

export default async function Evenements() {
  const { connecte, secteur, rayonKm } = await contexteVisite();
  const evenements = secteur
    ? await evenementsAutour(secteur.lat, secteur.lon, rayonKm, 50)
    : [];

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur?.nom ?? '—'} rayonKm={rayonKm} />}
      <div className={connecte ? "app has-tabbar" : "app"}><div className="page page-form">
        <div className="page-head">
          <h1>Autour de chez vous</h1>
          <p>
            Marchés, fêtes de village, brocantes et portes ouvertes dans les{' '}
            {rayonKm} km. Proposés par les habitants du secteur.
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
      <PiedDePage />
      {connecte && <BarreBas />}
    </>
  );
}
