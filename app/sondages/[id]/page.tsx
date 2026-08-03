import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import { distanceKm } from '@/lib/utils';
import Vote, { type Resultat } from './Vote';

export const dynamic = 'force-dynamic';

export default async function PageSondage({ params }: { params: { id: string } }) {
  const { connecte, profil, secteur, rayonKm, sb } = await contexteVisite();
  if (!secteur) notFound();

  const { data: s } = await sb
    .from('sondages')
    .select('*, auteur:profils!sondages_auteur_id_fkey(id, prenom, organisation, organisation_nom, organisation_verifiee, avatar_url)')
    .eq('id', params.id)
    .maybeSingle();

  if (!s) notFound();

  // Règle du rayon : un sondage d'une autre commune ne se consulte pas,
  // même par lien direct.
  const km = s.lat && s.lon
    ? +distanceKm(secteur.lat, secteur.lon, s.lat, s.lon).toFixed(1)
    : null;
  if (km == null || km > rayonKm) notFound();

  const { data: resultats } = await sb.rpc('resultats_sondage', { p_sondage: s.id });
  const clos = !!s.clos_le && new Date(s.clos_le) <= new Date();
  const nom = s.auteur?.organisation_nom || s.auteur?.prenom;

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}
      <div className={connecte ? 'app has-tabbar' : 'app'}><div className="page page-form">
        <Link href="/informations" className="back">← Informations du secteur</Link>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge b-am">Sondage</span>
          {s.auteur?.organisation_verifiee
            ? <span className="badge b-ok">Compte vérifié</span>
            : <span className="badge b-done">Non vérifié</span>}
          {clos && <span className="badge b-done">Clos</span>}
        </div>

        <div className="page-head">
          <h1>{s.question}</h1>
          <p>
            {nom}
            {km != null && km > 0 && ` · à ${km} km`}
            {s.clos_le && !clos && ` · jusqu'au ${new Date(s.clos_le).toLocaleDateString('fr-FR')}`}
          </p>
        </div>

        {s.precisions && (
          <div className="card">
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>{s.precisions}</p>
          </div>
        )}

        <Vote
          sondageId={s.id}
          resultats={(resultats ?? []) as Resultat[]}
          multiple={s.choix_multiple}
          clos={clos}
          connecte={connecte}
        />

        <p className="tiny center" style={{ marginTop: 12 }}>
          Les totaux sont publics. Personne ne voit qui a voté quoi, pas même
          l&apos;auteur du sondage.
        </p>
      </div></div>
      {connecte && <BarreBas />}
    </>
  );
}
