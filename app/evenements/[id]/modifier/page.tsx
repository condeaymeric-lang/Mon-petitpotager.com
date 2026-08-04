import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import FormulaireEvenement from '../../nouveau/FormulaireEvenement';

export const dynamic = 'force-dynamic';

export default async function ModifierEvenement({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();
  if (!secteur) notFound();

  const { data: evenement } = await sb
    .from('evenements')
    .select('id, auteur_id, titre, type, debut, lieu, description, commune, lat, lon, photos')
    .eq('id', params.id)
    .maybeSingle();

  if (!evenement) notFound();

  // L'organisateur, ou la modération. Personne d'autre.
  const sien = evenement.auteur_id === profil.id;
  if (!sien && !profil.moderateur) notFound();

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <FormulaireEvenement
          profilId={profil.id}
          secteur={secteur}
          rayonKm={profil.rayon_km}
          evenement={evenement as any}
          moderation={!sien}
        />
      </div>
      <BarreBas />
    </>
  );
}
