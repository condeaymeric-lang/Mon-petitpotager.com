import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import { distanceKm } from '@/lib/utils';
import { LIBELLE_THEME, quandCourt } from '@/components/CarteSujet';
import Reponses, { type Reponse } from './Reponses';

export const dynamic = 'force-dynamic';

export default async function PageSujet({ params }: { params: { id: string } }) {
  const { connecte, profil, secteur, rayonKm, sb } = await contexteVisite();
  if (!secteur) notFound();

  const { data: s } = await sb
    .from('sujets')
    .select('*, auteur:profils!sujets_auteur_id_fkey(id, prenom, raison_sociale, organisation_nom, avatar_url, role)')
    .eq('id', params.id)
    .maybeSingle();

  if (!s) notFound();

  // Règle du rayon : une discussion d'ailleurs ne se lit pas d'ici.
  const km = s.lat && s.lon
    ? +distanceKm(secteur.lat, secteur.lon, s.lat, s.lon).toFixed(1)
    : null;
  if (km == null || km > rayonKm) notFound();

  const { data: reponses } = await sb.rpc('reponses_de', { p_sujet: s.id });
  const nom = s.auteur?.raison_sociale || s.auteur?.organisation_nom || s.auteur?.prenom;
  const photos: string[] = s.photos ?? [];
  const sien = profil?.id === s.auteur_id;

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}

      <div className={connecte ? 'app has-tabbar' : 'app'}><div className="page page-form">
        <Link href="/bistrot" className="back">← Le bistrot</Link>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge b-am">{LIBELLE_THEME[s.theme] ?? s.theme}</span>
          {s.epingle && <span className="badge b-pro">Épinglé</span>}
          {s.ferme && <span className="badge b-done">Clos</span>}
        </div>

        <div className="page-head">
          <h1>{s.titre}</h1>
          <p>
            <Link href={`/membre/${s.auteur_id}`} className="lien-membre">{nom}</Link>
            {' · '}{quandCourt(s.created_at)}
            {km != null && km > 0 && ` · à ${km} km`}
          </p>
        </div>

        <div className="card">
          <p className="pub-evt-txt">{s.texte}</p>
          {photos.length > 0 && (
            <div className="evt-photos" style={{ marginTop: 12 }}>
              {photos.map((url) => (
                <a className="evt-photo" key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>

        {(sien || profil?.moderateur) && (
          <p className="tiny center" style={{ marginBottom: 14 }}>
            {sien ? 'Vous avez ouvert cette discussion.' : 'Vous pouvez modérer cette discussion.'}
          </p>
        )}

        <Reponses
          sujetId={s.id}
          reponses={(reponses ?? []) as Reponse[]}
          ferme={s.ferme}
          connecte={connecte}
          profilId={profil?.id ?? null}
          valide={!!profil?.compte_valide}
          moderateur={!!profil?.moderateur}
        />
      </div></div>
      {connecte && <BarreBas />}
    </>
  );
}
