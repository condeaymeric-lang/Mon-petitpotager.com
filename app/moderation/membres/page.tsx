import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import Annuaire, { type MembreMod, FILTRES } from './Annuaire';
import { aLeDroit } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export default async function MembresModeration({
  searchParams,
}: { searchParams: { q?: string; filtre?: string } }) {
  const { profil, secteur, sb } = await profilCourant();

  if (!aLeDroit(profil, 'membres')) {
    return (
      <>
        <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><div className="page">
          <div className="page-head">
            <h1>Annuaire des membres</h1>
            <p>Ce domaine ne vous est pas ouvert.</p>
          </div>
          <Link className="btn btn-s" href="/moderation">Retour à la modération</Link>
        </div></div>
        <BarreBas />
      </>
    );
  }

  const recherche = searchParams.q ?? '';
  const filtre = FILTRES.some((f) => f.cle === searchParams.filtre)
    ? searchParams.filtre! : 'tous';

  const { data } = await sb.rpc('membres_a_moderer', {
    p_recherche: recherche || null, p_filtre: filtre, p_limite: 120,
  });

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <Link href="/moderation" className="back">← Modération</Link>
        <div className="page-head">
          <h1>Annuaire des membres</h1>
          <p>
            Tous les inscrits du site, sans filtre de rayon. L&apos;adresse
            d&apos;inscription est visible : elle sert à reconnaître un doublon
            ou une adresse jetable.
          </p>
        </div>

        <Annuaire
          membres={(data ?? []) as MembreMod[]}
          recherche={recherche}
          filtre={filtre}
          peutDonnerDroits={aLeDroit(profil, 'droits')}
          moiId={profil.id}
        />
      </div></div>
      <BarreBas />
    </>
  );
}
