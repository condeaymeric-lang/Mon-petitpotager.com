import { redirect } from 'next/navigation';
import { profilCourant, catalogue } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import Formulaire from './Formulaire';

export const dynamic = 'force-dynamic';

export default async function Publier({
  searchParams,
}: { searchParams: { produit?: string } }) {
  const { profil, secteur } = await profilCourant();
  if (!secteur) redirect('/profil');

  const { produits, varietes } = await catalogue();

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <Formulaire
          produits={produits}
          varietes={varietes}
          profil={profil}
          secteur={secteur}
          communes={[secteur.nom]}
          produitInitial={searchParams.produit}
        />
      </div>
      <BarreBas />
    </>
  );
}
