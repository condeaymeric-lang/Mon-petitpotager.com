import { redirect } from 'next/navigation';
import { profilCourant, catalogue } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import Composeur from './Composeur';

export const dynamic = 'force-dynamic';

export default async function PublierPanier() {
  const { profil, secteur } = await profilCourant();
  if (!secteur) redirect('/profil');

  const { produits } = await catalogue();

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <Composeur
          produits={produits}
          profil={profil}
          secteur={secteur}
          communes={[secteur.nom]}
        />
      </div>
      <BarreBas />
    </>
  );
}
