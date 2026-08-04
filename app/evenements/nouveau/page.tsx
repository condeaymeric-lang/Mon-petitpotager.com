import { redirect } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import FormulaireEvenement from './FormulaireEvenement';

export const dynamic = 'force-dynamic';

export default async function NouvelEvenement() {
  const { profil, secteur } = await profilCourant();
  if (!secteur) redirect('/profil');

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <FormulaireEvenement profilId={profil.id} secteur={secteur} rayonKm={profil.rayon_km} />
      </div>
      <BarreBas />
    </>
  );
}
