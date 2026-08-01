import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import ContenuPanier from './ContenuPanier';

export const dynamic = 'force-dynamic';

export default async function PagePanier() {
  const { profil, secteur } = await profilCourant();
  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <ContenuPanier
          points={profil.points}
          secteurCode={secteur?.code_insee ?? null}
          commune={secteur?.nom ?? ''}
        />
      </div>
      <BarreBas />
    </>
  );
}
