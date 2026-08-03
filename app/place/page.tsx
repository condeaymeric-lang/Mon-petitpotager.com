import Link from 'next/link';
import { contexteVisite } from '@/lib/contexte';
import { evenementsAutour, informationsAutour } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import ChoixCommune from '@/components/ChoixCommune';
import CarteEvenement from '@/components/CarteEvenement';
import CarteInformation, { type InformationProche } from '@/components/CarteInformation';
import CarteSujet, { type SujetProche } from '@/components/CarteSujet';
import { Illustration } from '@/components/Illustrations';
import type { EvenementProche } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * La place du village : tout ce qui fait la vie du secteur au même
 * endroit — les annonces des mairies et associations, les sondages en
 * cours, les événements à venir et ce qu'on a dit des précédents.
 */
export default async function Place() {
  const { connecte, profil, secteur, rayonKm, sb } = await contexteVisite();
  if (!secteur) return <ChoixCommune />;

  const [infos, evenements, { data: sondages }, { data: structures }, { data: sujets }] = await Promise.all([
    informationsAutour(secteur.lat, secteur.lon, rayonKm, 12),
    evenementsAutour(secteur.lat, secteur.lon, rayonKm, 12),
    sb.rpc('sondages_autour', {
      p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: rayonKm, p_limite: 10,
    }),
    sb.from('profils')
      .select('id, prenom, organisation, organisation_nom, organisation_verifiee, avatar_url, secteur')
      .not('organisation', 'is', null)
      .eq('organisation_verifiee', true)
      .limit(12),
    sb.rpc('sujets_autour', {
      p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: rayonKm,
      p_theme: null, p_limite: 4,
    }),
  ]);

  const publications = infos as InformationProche[];
  const agenda = evenements as EvenementProche[];
  const enquetes = (sondages ?? []) as any[];
  const ouvertes = enquetes.filter((s) => !s.clos_le || new Date(s.clos_le) > new Date());
  const maisons = (structures ?? []).filter((s: any) => s.secteur === secteur.code_insee);

  const discussions = (sujets ?? []) as SujetProche[];
  const vide = publications.length === 0 && agenda.length === 0
    && enquetes.length === 0 && discussions.length === 0;

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}

      <div className={connecte ? 'app has-tabbar' : 'app'}><div className="page">
        <div className="page-head">
          <h1>La place du village</h1>
          <p>
            La vie du secteur en un seul endroit : ce que publient les mairies
            et les associations, les consultations en cours et l&apos;agenda,
            dans les {rayonKm} km autour de {secteur.nom}.
          </p>
        </div>

        {vide ? (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>La place est encore calme</h3>
            <p>
              Aucune information ni événement pour l&apos;instant. Les mairies,
              associations et collectifs du secteur publient ici leurs annonces,
              et chacun peut proposer un événement.
            </p>
            {connecte && profil && (
              <div className="row-btn" style={{ marginTop: 4 }}>
                <Link className="btn btn-p" href="/bistrot/nouveau">Ouvrir une discussion</Link>
                <Link className="btn btn-s" href="/evenements/nouveau">Proposer un événement</Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {ouvertes.length > 0 && (
              <section className="bloc" aria-labelledby="p-sondages">
                <div className="bloc-head">
                  <h2 id="p-sondages">On vous demande votre avis</h2>
                </div>
                <div className="events">
                  {ouvertes.map((s) => (
                    <Link key={s.id} href={`/sondages/${s.id}`} className="info">
                      <div className="info-b">
                        <div className="info-tete">
                          <span className="badge b-am">Sondage</span>
                          {s.a_vote && <span className="badge b-ok">Vous avez voté</span>}
                          {s.auteur_verifiee && <span className="badge b-ok">Vérifié</span>}
                        </div>
                        <h4>{s.question}</h4>
                        <div className="item-meta">
                          <span>{s.auteur_nom}</span>
                          <span>{s.nb_votants} vote{s.nb_votants > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {discussions.length > 0 && (
              <section className="bloc" aria-labelledby="p-bistrot">
                <div className="bloc-head">
                  <h2 id="p-bistrot">Le bistrot du coin</h2>
                  <Link href="/bistrot" className="tiny">Toutes les discussions</Link>
                </div>
                <div className="sujets">
                  {discussions.map((d) => <CarteSujet key={d.id} sujet={d} />)}
                </div>
              </section>
            )}

            {publications.length > 0 && (
              <section className="bloc" aria-labelledby="p-infos">
                <div className="bloc-head">
                  <h2 id="p-infos">Le panneau d&apos;affichage</h2>
                  <Link href="/informations" className="tiny">Toutes</Link>
                </div>
                <div className="events">
                  {publications.map((i) => <CarteInformation key={i.id} info={i} />)}
                </div>
              </section>
            )}

            {agenda.length > 0 && (
              <section className="bloc" aria-labelledby="p-agenda">
                <div className="bloc-head">
                  <h2 id="p-agenda">L&apos;agenda</h2>
                  <Link href="/evenements" className="tiny">Tous</Link>
                </div>
                <div className="events">
                  {agenda.map((e) => <CarteEvenement key={e.id} evenement={e} />)}
                </div>
              </section>
            )}
          </>
        )}

        {maisons.length > 0 && (
          <section className="bloc" aria-labelledby="p-maisons">
            <div className="bloc-head">
              <h2 id="p-maisons">Les structures du secteur</h2>
            </div>
            <div className="fils">
              {maisons.map((m: any) => (
                <Link key={m.id} href={`/membre/${m.id}`} className="fil">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" loading="lazy" className="fil-photo" />
                    : <span className="fil-photo fil-photo-vide">
                        {(m.organisation_nom ?? m.prenom)?.[0]?.toUpperCase()}
                      </span>}
                  <span className="fil-b">
                    <span className="fil-tete">
                      <b>{m.organisation_nom ?? m.prenom}</b>
                    </span>
                    <span className="fil-apercu">
                      {m.organisation === 'mairie' ? 'Mairie'
                        : m.organisation === 'association' ? 'Association' : 'Collectif'}
                      {' · compte vérifié'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {connecte && profil && !vide && (
          <div className="row-btn" style={{ marginTop: 20 }}>
            <Link className="btn btn-p" style={{ flex: 1 }} href="/bistrot/nouveau">
              Ouvrir une discussion
            </Link>
            <Link className="btn btn-s" style={{ flex: 1 }} href="/evenements/nouveau">
              Proposer un événement
            </Link>
          </div>
        )}
      </div></div>
      {connecte && <BarreBas />}
    </>
  );
}
