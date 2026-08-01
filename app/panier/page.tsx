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

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <ContenuPanier
          points={profil.points}
          secteurCode={secteur?.code_insee ?? null}
          commune={secteur?.nom ?? ''}
          relais={relais ?? []}
        />
      </div>
      <BarreBas />
    </>
  );
}
