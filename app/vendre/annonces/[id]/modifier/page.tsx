import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import ModifierAnnonce from './ModifierAnnonce';

export const dynamic = 'force-dynamic';

export default async function ModifierPage({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();
  const { data: annonce } = await sb
    .from('annonces')
    .select('*, produit:produits(nom, unite, prix_ref), variete:varietes(nom)')
    .eq('id', params.id)
    .eq('vendeur_id', profil.id)
    .maybeSingle();

  if (!annonce) notFound();

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <ModifierAnnonce annonce={annonce} profilId={profil.id} />
      </div>
      <BarreBas />
    </>
  );
}
