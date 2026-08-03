import { redirect } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { BandeauAttente } from '@/components/CompteEnAttente';
import FormulaireSujet from './FormulaireSujet';

export const dynamic = 'force-dynamic';

export default async function NouveauSujet() {
  const { profil, secteur } = await profilCourant();
  if (!secteur) redirect('/profil');

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        {!profil.compte_valide && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <BandeauAttente refus={profil.refus_motif} />
          </div>
        )}
        <FormulaireSujet profilId={profil.id} secteurCode={secteur.code_insee} />
      </div>
      <BarreBas />
    </>
  );
}
