import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import { distanceKm } from '@/lib/utils';
import { LIBELLE_CATEGORIE } from '@/components/CarteInformation';
import Commentaires, { type Commentaire } from '@/components/Commentaires';

export const dynamic = 'force-dynamic';

export default async function PageInformation({ params }: { params: { id: string } }) {
  const { connecte, secteur, rayonKm, sb } = await contexteVisite();
  if (!secteur) notFound();

  const { data: p } = await sb
    .from('publications_officielles')
    .select('*, auteur:profils!publications_officielles_auteur_id_fkey(id, prenom, organisation, organisation_nom, organisation_verifiee, avatar_url)')
    .eq('id', params.id)
    .maybeSingle();

  if (!p) notFound();

  const km = p.lat && p.lon
    ? +distanceKm(secteur.lat, secteur.lon, p.lat, p.lon).toFixed(1)
    : null;
  if (km == null || km > rayonKm) notFound();

  const { data: commentaires } = await sb.rpc('commentaires_de', {
    p_type: 'information', p_id: p.id,
  });
  const { data: moi } = await sb.rpc('mon_profil');
  const monProfil = (moi?.[0] ?? null) as any;

  const nom = p.auteur?.organisation_nom || p.auteur?.prenom;
  const photos: string[] = p.photos ?? [];

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}
      <div className={connecte ? 'app has-tabbar' : 'app'}><div className="page page-form">
        <Link href="/informations" className="back">← Informations du secteur</Link>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className={`badge ${p.categorie === 'alerte' ? 'b-done' : 'b-am'}`}>
            {LIBELLE_CATEGORIE[p.categorie] ?? p.categorie}
          </span>
          {p.auteur?.organisation_verifiee
            ? <span className="badge b-ok">Compte vérifié</span>
            : <span className="badge b-done">Non vérifié</span>}
        </div>

        {photos.length > 0 && (
          <a className="evt-affiche-grande" href={photos[0]} target="_blank" rel="noopener noreferrer">
            <img src={photos[0]} alt="" />
          </a>
        )}

        <div className="page-head">
          <h1>{p.titre}</h1>
          <p>
            {nom} · {new Date(p.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric' })}
            {km != null && km > 0 && ` · à ${km} km`}
          </p>
        </div>

        <div className="card">
          <p className="muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{p.texte}</p>
          {p.lien && (
            <p style={{ marginTop: 14 }}>
              <a className="lien-membre" href={p.lien} target="_blank"
                rel="noopener noreferrer nofollow">En savoir plus</a>
            </p>
          )}
        </div>

        {photos.length > 1 && (
          <div className="card">
            <h3>Photos</h3>
            <div className="evt-photos" style={{ marginTop: 10 }}>
              {photos.slice(1).map((url) => (
                <a className="evt-photo" key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!p.auteur?.organisation_verifiee && (
          <p className="tiny center" style={{ marginTop: 12 }}>
            Ce compte s&apos;est déclaré comme {p.auteur?.organisation ?? 'organisation'} sans
            avoir été vérifié. Recoupez cette information auprès de la structure concernée.
          </p>
        )}
        <Commentaires
          cibleType="information" cibleId={p.id}
          commentaires={(commentaires ?? []) as Commentaire[]}
          connecte={connecte} profilId={monProfil?.id ?? null}
          valide={!!monProfil?.compte_valide} moderateur={!!monProfil?.moderateur}
          proprietaire={monProfil?.id === p.auteur_id}
        />
      </div></div>
      {connecte && <BarreBas />}
    </>
  );
}
