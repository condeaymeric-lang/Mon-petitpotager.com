import Link from 'next/link';
import { contexteVisite } from '@/lib/contexte';
import { evenementsAutour, informationsAutour } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import ChoixCommune from '@/components/ChoixCommune';
import CarteEvenement from '@/components/CarteEvenement';
import CarteInformation, { type InformationProche } from '@/components/CarteInformation';
import CarteSujet, { type SujetProche } from '@/components/CarteSujet';
import Rubrique from '@/components/Rubrique';
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
              <Rubrique id="p-sondages" titre="On vous demande votre avis"
                aide="Consultations ouvertes dans votre secteur"
                icone="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"
                lien="/informations" lienLabel="Toutes">
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
              </Rubrique>
            )}

            {discussions.length > 0 && (
              <Rubrique id="p-bistrot" titre="Le bistrot du coin"
                aide="On y parle jardin, entraide et vie du village"
                icone="M6 2h12l-1 9a5 5 0 0 1-10 0ZM8 21h8M12 16v5"
                lien="/bistrot" lienLabel="Toutes"
                raccourcis={[
                  { href: '/bistrot?theme=conseils', label: 'Conseils' },
                  { href: '/bistrot?theme=entraide', label: 'Entraide' },
                  { href: '/bistrot?theme=bons_plans', label: 'Bons plans' },
                  { href: '/bistrot?theme=recettes', label: 'Recettes' },
                  { href: '/bistrot/nouveau', label: 'Ouvrir une discussion' },
                ]}>
                <div className="sujets">
                  {discussions.map((d) => <CarteSujet key={d.id} sujet={d} />)}
                </div>
              </Rubrique>
            )}

            {publications.length > 0 && (
              <Rubrique id="p-infos" titre="Le panneau d&apos;affichage"
                aide="Mairies, associations et collectifs du secteur"
                icone="M4 4h16v13H4zM8 21h8M12 17v4"
                lien="/informations" lienLabel="Toutes"
                raccourcis={[{ href: '/officiel', label: 'Je représente une structure' }]}>
                <div className="events">
                  {publications.map((i) => <CarteInformation key={i.id} info={i} />)}
                </div>
              </Rubrique>
            )}

            {agenda.length > 0 && (
              <Rubrique id="p-agenda" titre="L&apos;agenda"
                aide="Marchés, fêtes, brocantes et portes ouvertes"
                icone="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                lien="/evenements" lienLabel="Tous"
                raccourcis={[{ href: '/evenements/nouveau', label: 'Proposer un événement' }]}>
                <div className="events">
                  {agenda.map((e) => <CarteEvenement key={e.id} evenement={e} />)}
                </div>
              </Rubrique>
            )}
          </>
        )}

        {maisons.length > 0 && (
          <Rubrique id="p-maisons" titre="Les structures du secteur"
            aide="Mairies, associations et collectifs vérifiés"
            icone="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6">
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
          </Rubrique>
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
