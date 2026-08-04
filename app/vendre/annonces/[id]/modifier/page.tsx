import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import ModifierAnnonce from './ModifierAnnonce';

export const dynamic = 'force-dynamic';

export default async function ModifierPage({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();
  // Un modérateur peut corriger n'importe quelle annonce ; les autres,
  // uniquement les leurs.
  const requete = sb
    .from('annonces')
    .select('*, produit:produits(nom, unite, prix_ref), variete:varietes(nom)')
    .eq('id', params.id);

  const { data: annonce } = await (profil.moderateur
    ? requete.maybeSingle()
    : requete.eq('vendeur_id', profil.id).maybeSingle());

  if (!annonce) notFound();

  const enModeration = profil.moderateur && annonce.vendeur_id !== profil.id;

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        {enModeration && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="avert" role="status">
              <b>Vous corrigez l&apos;annonce d&apos;un autre membre.</b>
              <p>
                Cette correction se fait au titre de la modération. Limitez-vous
                à ce qui doit l&apos;être, et prévenez l&apos;auteur si la
                modification change le sens de son annonce.
              </p>
            </div>
          </div>
        )}
        <ModifierAnnonce annonce={annonce} profilId={annonce.vendeur_id} />
      </div>
      <BarreBas />
    </>
  );
}
