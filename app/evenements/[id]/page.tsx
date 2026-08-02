import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { LIBELLE_TYPE, dateLisible, heureLisible } from '@/components/CarteEvenement';
import { distanceKm } from '@/lib/utils';
import Participation from './Participation';
import Publications, { type Publication } from './Publications';

export const dynamic = 'force-dynamic';

export default async function PageEvenement({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();

  const { data: e } = await sb
    .from('evenements')
    .select('*, auteur:profils!evenements_auteur_id_fkey(id, prenom, avatar_url)')
    .eq('id', params.id)
    .maybeSingle();

  if (!e) notFound();

  // Règle du rayon : un événement hors du secteur ne doit pas être consultable,
  // même avec le lien direct.
  const km = secteur && e.lat && e.lon
    ? +distanceKm(secteur.lat, secteur.lon, e.lat, e.lon).toFixed(1)
    : null;
  if (km == null || km > profil.rayon_km) notFound();

  const { data: participations } = await sb
    .from('participations')
    .select('profil_id, vient, profil:profils!participations_profil_id_fkey(prenom)')
    .eq('evenement_id', e.id);

  const { data: publications } = await sb.rpc('publications_de', { p_evenement: e.id });

  const reponses = participations ?? [];
  const oui = reponses.filter((p: any) => p.vient);
  const nbNon = reponses.length - oui.length;
  const maReponse = reponses.find((p: any) => p.profil_id === profil.id) as
    { vient: boolean } | undefined;

  const estMien = e.auteur_id === profil.id;
  const passe = new Date(e.debut).getTime() < Date.now();
  const photos: string[] = e.photos ?? [];

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page page-form">
        <Link href="/evenements" className="back">← Tous les événements</Link>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge b-am">{LIBELLE_TYPE[e.type as keyof typeof LIBELLE_TYPE]}</span>
          {e.annule && <span className="badge b-done">Annulé</span>}
          {passe && !e.annule && <span className="badge b-done">Passé</span>}
        </div>

        <div className="page-head">
          <h1>{e.titre}</h1>
          <p>Proposé par {e.auteur?.prenom}.</p>
        </div>

        <div className="card">
          <dl className="evt-infos">
            <div>
              <dt>Quand</dt>
              <dd>{dateLisible(e.debut)} à {heureLisible(e.debut)}</dd>
            </div>
            <div>
              <dt>Où</dt>
              <dd>{e.lieu ? `${e.lieu}, ` : ''}{e.commune}{km != null && ` · à ${km} km`}</dd>
            </div>
          </dl>
        </div>

        {e.description && (
          <div className="card">
            <h3>À propos</h3>
            <p className="muted" style={{ marginTop: 7, whiteSpace: 'pre-line' }}>{e.description}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="card">
            <h3>Photos</h3>
            <div className="evt-photos" style={{ marginTop: 10 }}>
              {photos.map((url) => (
                <a className="evt-photo" key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!passe && !e.annule && (
          <Participation
            evenementId={e.id}
            profilId={profil.id}
            reponseInitiale={maReponse ? maReponse.vient : null}
            nbOui={oui.length}
            nbNon={nbNon}
            prenoms={oui.map((p: any) => p.profil?.prenom).filter(Boolean)}
            estOrganisateur={estMien}
          />
        )}

        {(estMien || profil.moderateur) && (
          <div className="card">
            <h3>{estMien ? 'Vous organisez cet événement' : 'Modération'}</h3>
            <p className="muted" style={{ marginTop: 7 }}>
              {estMien
                ? "Vous pouvez corriger la date, le lieu ou la description, et ajouter des photos avant comme après."
                : "Vous pouvez corriger cet événement au titre de la modération."}
            </p>
            <Link className="btn btn-s" href={`/evenements/${e.id}/modifier`} style={{ marginTop: 14 }}>
              Modifier l&apos;événement
            </Link>
          </div>
        )}

        <Publications
          evenementId={e.id}
          publications={(publications ?? []) as Publication[]}
          commence={passe}
          connecte
          profilId={profil.id}
          moderateur={!!profil.moderateur}
        />
      </div></div>
      <BarreBas />
    </>
  );
}
