import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import ModifierProfil from '@/app/profil/ModifierProfil';
import Statuts from './Statuts';
import type { Profil } from '@/lib/types';
import { aLeDroit } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export default async function ProfilModere({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();
  if (!aLeDroit(profil, 'membres')) notFound();

  const { data } = await sb.rpc('profil_pour_moderation', { p_profil: params.id });
  const cible = (data?.[0] ?? null) as Profil | null;
  if (!cible) notFound();

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page page-form">
        <Link href="/moderation/membres" className="back">← Annuaire</Link>

        <div className="page-head">
          <h1>{cible.prenom}</h1>
          <p>
            {cible.role === 'pro' ? 'Producteur professionnel'
              : cible.role === 'amateur' ? 'Jardinier amateur' : 'Acheteur'}
            {cible.organisation ? ` · ${cible.organisation}` : ''}
            {cible.compte_valide ? ' · compte validé' : ' · compte en attente'}
          </p>
        </div>

        <div className="avert" role="status">
          <b>Vous modifiez le profil d&apos;un autre membre.</b>
          <p>
            Corrigez ce qui doit l&apos;être et prévenez la personne. Le solde de
            points, les droits de modération et la validation du compte ne se
            modifient pas ici : ils ont leurs propres écrans.
          </p>
        </div>

        <Statuts profil={cible} />

        <ModifierProfil profil={cible} ouvertParDefaut />

        <div className="card">
          <h3>Sa fiche publique</h3>
          <Link className="btn btn-s" href={`/membre/${cible.id}`} style={{ marginTop: 12 }}>
            Voir la fiche
          </Link>
        </div>
      </div></div>
      <BarreBas />
    </>
  );
}
