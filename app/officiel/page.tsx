import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import Espace, { type PublicationOff, type SondageOff } from './Espace';
import Declarer, { type DemandeEnCours } from './Declarer';

export const dynamic = 'force-dynamic';

export default async function Officiel() {
  const { profil, secteur, sb } = await profilCourant();

  if (!secteur) {
    return (
      <>
        <BarreHaut commune="—" rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><div className="page">
          <div className="card">
            <p className="muted">
              Définissez d&apos;abord votre commune dans votre profil : une
              publication s&apos;adresse à un secteur.
            </p>
            <Link className="btn btn-p" href="/profil" style={{ marginTop: 14 }}>Mon profil</Link>
          </div>
        </div></div>
        <BarreBas />
      </>
    );
  }

  if (!profil.organisation) {
    const { data: demande } = await sb
      .from('demandes_organisation')
      .select('id, type, nom, statut, motif_reponse, created_at')
      .eq('profil_id', profil.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (
      <>
        <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><div className="page">
          <div className="page-head">
            <h1>Espace des mairies et associations</h1>
            <p>
              Publier des informations à l&apos;échelle du secteur et consulter
              les habitants par sondage.
            </p>
          </div>
          <Declarer demande={(demande ?? undefined) as DemandeEnCours | undefined} />
        </div></div>
        <BarreBas />
      </>
    );
  }

  const [{ data: publications }, { data: sondages }] = await Promise.all([
    sb.from('publications_officielles')
      .select('id, categorie, titre, texte, epinglee, expire_le, created_at')
      .eq('auteur_id', profil.id).order('created_at', { ascending: false }).limit(30),
    sb.from('sondages')
      .select('id, question, clos_le, created_at')
      .eq('auteur_id', profil.id).order('created_at', { ascending: false }).limit(30),
  ]);

  // Le nombre de votants n'est pas lisible ligne à ligne : on le prend
  // dans la liste des sondages du rayon, qui l'agrège déjà.
  const { data: autour } = await sb.rpc('sondages_autour', {
    p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: 1, p_limite: 50,
  });
  const votants = new Map<string, number>(
    ((autour ?? []) as any[]).map((s) => [s.id, s.nb_votants as number])
  );

  const nom = profil.organisation_nom || profil.prenom;

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>{nom}</h1>
          <p>
            {profil.organisation === 'mairie' ? 'Mairie'
              : profil.organisation === 'association' ? 'Association' : 'Collectif'}
            {' · '}{secteur.nom} et son rayon
            {profil.organisation_verifiee ? ' · compte vérifié' : ' · non vérifié'}
          </p>
        </div>

        <Espace
          profilId={profil.id}
          secteurCode={secteur.code_insee}
          publications={(publications ?? []) as PublicationOff[]}
          sondages={((sondages ?? []) as any[]).map((s) => ({
            ...s, nb_votants: votants.get(s.id) ?? 0,
          })) as SondageOff[]}
          nomOrganisation={nom}
          verifiee={!!profil.organisation_verifiee}
        />
      </div></div>
      <BarreBas />
    </>
  );
}
