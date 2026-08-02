import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import ContenuPanier from './ContenuPanier';

export const dynamic = 'force-dynamic';

export default async function PagePanier() {
  const { profil, secteur, sb } = await profilCourant();

  const { data: relais } = secteur
    ? await sb.from('profils')
        .select('id, prenom, relais_adresse, relais_horaires')
        .eq('secteur', secteur.code_insee)
        .eq('est_relais', true)
        .not('relais_adresse', 'is', null)
    : { data: null };

  // Casiers réfrigérés du rayon. Aucun n'est actif tant qu'un
  // partenariat n'est pas signé : on les montre sans les proposer.
  const { data: casiers } = secteur
    ? await sb.rpc('casiers_autour', {
        p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: profil.rayon_km,
      })
    : { data: null };

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <ContenuPanier
          points={profil.points}
          secteurCode={secteur?.code_insee ?? null}
          commune={secteur?.nom ?? ''}
          relais={relais ?? []}
          casiers={casiers ?? []}
        />
      </div>
      <BarreBas />
    </>
  );
}
