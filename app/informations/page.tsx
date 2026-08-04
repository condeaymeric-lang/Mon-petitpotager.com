import Link from 'next/link';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import ChoixCommune from '@/components/ChoixCommune';
import CarteInformation, { type InformationProche } from '@/components/CarteInformation';
import { Illustration } from '@/components/Illustrations';

export const dynamic = 'force-dynamic';

export default async function Informations() {
  const { connecte, profil, secteur, rayonKm, sb } = await contexteVisite();
  if (!secteur) return <ChoixCommune />;

  const [{ data: infos }, { data: sondages }] = await Promise.all([
    sb.rpc('publications_officielles_autour', {
      p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: rayonKm, p_limite: 40,
    }),
    sb.rpc('sondages_autour', {
      p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: rayonKm, p_limite: 20,
    }),
  ]);

  const liste = (infos ?? []) as InformationProche[];
  const enquetes = (sondages ?? []) as any[];

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}
      <div className={connecte ? 'app has-tabbar' : 'app'}><div className="page">
        <div className="page-head">
          <h1>Informations du secteur</h1>
          <p>
            Ce que publient les mairies, les associations et les collectifs
            dans les {rayonKm} km autour de {secteur.nom}.
          </p>
        </div>

        {enquetes.length > 0 && (
          <section className="bloc" aria-labelledby="t-sondages">
            <div className="bloc-head"><h2 id="t-sondages">Sondages en cours</h2></div>
            <div className="events">
              {enquetes.map((s) => {
                const clos = s.clos_le && new Date(s.clos_le) <= new Date();
                return (
                  <Link key={s.id} href={`/sondages/${s.id}`} className="info">
                    <div className="info-b">
                      <div className="info-tete">
                        <span className="badge b-am">Sondage</span>
                        {clos && <span className="badge b-done">Clos</span>}
                        {s.a_vote && <span className="badge b-ok">Vous avez voté</span>}
                      </div>
                      <h4>{s.question}</h4>
                      <div className="item-meta">
                        <span>{s.auteur_nom}</span>
                        <span>{s.nb_votants} vote{s.nb_votants > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="bloc" aria-labelledby="t-infos">
          <div className="bloc-head"><h2 id="t-infos">Publications</h2></div>
          {liste.length > 0 ? (
            <div className="events">
              {liste.map((i) => <CarteInformation key={i.id} info={i} />)}
            </div>
          ) : (
            <div className="empty">
              <Illustration nom="plant" className="e-ico" />
              <h3>Aucune information pour le moment</h3>
              <p>
                Les mairies, associations et collectifs du secteur publient ici
                leurs annonces et consultations.
              </p>
              {connecte && profil && (
                <Link className="btn btn-s" href="/officiel">
                  Je représente une structure
                </Link>
              )}
            </div>
          )}
        </section>
      </div></div>
      {connecte && <BarreBas />}
    </>
  );
}
