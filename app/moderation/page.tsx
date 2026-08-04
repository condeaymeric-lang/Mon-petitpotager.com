import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import Contenus, { type Contenu, type EntreeJournal } from './Contenus';
import FileAttente, { type Attente } from './FileAttente';
import { GENRES, DOMAINES, droitsDe, aLeDroit, type Genre } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export default async function Moderation({
  searchParams,
}: { searchParams: { q?: string; genre?: string } }) {
  const { profil, secteur, sb } = await profilCourant();
  const droits = droitsDe(profil);

  if (droits.length === 0) {
    return (
      <>
        <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><div className="page">
          <div className="page-head">
            <h1>Modération</h1>
            <p>Cet espace est réservé à la modération du site.</p>
          </div>
          <div className="card">
            <p className="muted">
              Si vous constatez un contenu qui n&apos;a pas sa place ici,
              signalez-le par le formulaire de contact : il sera examiné.
            </p>
            <Link className="btn btn-p" href="/contact" style={{ marginTop: 14 }}>
              Signaler un contenu
            </Link>
          </div>
        </div></div>
        <BarreBas />
      </>
    );
  }

  // Un modérateur ne voit que les onglets de ses domaines. Le premier
  // ouvert fait office de page d'accueil quand rien n'est demandé.
  const onglets = GENRES.filter((g) => droits.includes(g.domaine));
  const demande = searchParams.genre as Genre | undefined;
  const genre: Genre | null =
    (demande && onglets.some((g) => g.cle === demande) ? demande : onglets[0]?.cle) ?? null;
  const recherche = searchParams.q ?? '';

  const [contenus, journal, file, volumes] = await Promise.all([
    genre
      ? sb.rpc('contenus_a_moderer', {
          p_genre: genre, p_recherche: recherche || null, p_limite: 80,
        })
      : Promise.resolve({ data: [] }),
    sb.from('journal_moderation')
      .select('id, titre, action, motif, genre, created_at')
      .order('created_at', { ascending: false }).limit(20),
    aLeDroit(profil, 'comptes') ? sb.rpc('file_moderation') : Promise.resolve({ data: [] }),
    sb.rpc('volumes_moderation'),
  ]);

  const compte = new Map<string, number>(
    ((volumes.data ?? []) as { genre: string; total: number }[])
      .map((v) => [v.genre, Number(v.total)])
  );

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Modération</h1>
          <p>
            Tout le site, sans filtre de rayon, y compris ce qui est déjà retiré.
            Chaque intervention demande un motif et reste au journal.
          </p>
        </div>

        <div className="card">
          <h3>Vos domaines</h3>
          <div className="mod-droits" style={{ marginTop: 10 }}>
            {DOMAINES.filter((d) => droits.includes(d.cle)).map((d) => (
              <span className="badge b-ok" key={d.cle}>{d.nom}</span>
            ))}
          </div>
          {droits.length < DOMAINES.length && (
            <p className="tiny" style={{ marginTop: 10 }}>
              Les autres domaines ne vous sont pas ouverts. Un modérateur qui
              détient les droits peut vous les accorder.
            </p>
          )}
          {aLeDroit(profil, 'membres') && (
            <Link className="btn btn-s" href="/moderation/membres" style={{ marginTop: 12 }}>
              Annuaire des membres
            </Link>
          )}
        </div>

        {aLeDroit(profil, 'comptes') && (
          <FileAttente file={(file.data ?? []) as Attente[]} />
        )}

        {genre ? (
          <>
            <nav className="mod-onglets" aria-label="Genres de contenus">
              {onglets.map((g) => (
                <Link key={g.cle} href={`/moderation?genre=${g.cle}`}
                  className={`mod-onglet${g.cle === genre ? ' on' : ''}`}
                  aria-current={g.cle === genre ? 'page' : undefined}>
                  {g.nom}
                  <span className="tiny"> · {compte.get(g.cle) ?? 0}</span>
                </Link>
              ))}
            </nav>

            <Contenus
              genre={genre}
              contenus={(contenus.data ?? []) as Contenu[]}
              journal={(journal.data ?? []) as EntreeJournal[]}
              recherche={recherche}
            />
          </>
        ) : (
          <div className="card">
            <p className="muted">
              Vos droits ne portent sur aucun contenu publié. Ils concernent les
              inscriptions, les membres ou les droits eux-mêmes.
            </p>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
