import Link from 'next/link';
import { profilCourant, annoncesAutour, catalogue, evenementsAutour } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import CarteAnnonce from '@/components/CarteAnnonce';
import CarteEvenement from '@/components/CarteEvenement';
import PiedDePage from '@/components/PiedDePage';
import BlocMeteo from '@/components/Meteo';
import { meteoSecteur } from '@/lib/meteo';
import { Illustration } from '@/components/Illustrations';
import { estDeSaison, SEUIL_OUVERTURE } from '@/lib/utils';
import ListeAttente from './ListeAttente';

export const dynamic = 'force-dynamic';

export default async function Accueil({
  searchParams,
}: { searchParams: { cat?: string } }) {
  const { profil, secteur } = await profilCourant();

  if (!secteur) {
    return (
      <div className="app has-tabbar"><div className="page">
        <div className="empty">
          <Illustration nom="plant" className="e-ico" />
          <h3>Aucun secteur défini</h3>
          <p>Choisissez votre commune pour voir ce qui pousse autour de vous.</p>
          <Link className="btn btn-p" href="/profil">Définir mon secteur</Link>
        </div>
      </div></div>
    );
  }

  if (!secteur.ouvert) {
    return (
      <>
        <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar">
          <ListeAttente secteur={secteur} profilId={profil.id} />
        </div>
        <BarreBas />
      </>
    );
  }

  const [annonces, { produits }, evenements, meteo] = await Promise.all([
    annoncesAutour(secteur.lat, secteur.lon, profil.rayon_km, searchParams.cat),
    catalogue(),
    evenementsAutour(secteur.lat, secteur.lon, profil.rayon_km, 3),
    meteoSecteur(secteur.lat, secteur.lon, secteur.nom),
  ]);

  const categories = [...new Set(produits.map((p) => p.categorie))];
  const saisonParProduit = new Map(produits.map((p) => [p.nom, p.mois_saison]));
  const nbSaison = annonces.filter((a) => estDeSaison(saisonParProduit.get(a.produit ?? ''))).length;

  return (
    <>
      <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar">
        <div className="page">
          <div className="page-head">
            <h1>Bonjour {profil.prenom}.</h1>
            <p>
              {annonces.length} annonce{annonces.length > 1 ? 's' : ''} dans les {profil.rayon_km} km
              autour de {secteur.nom}{nbSaison > 0 && ` — dont ${nbSaison} de saison`}.
            </p>
          </div>

          <div className="filters">
            <Link href="/" className={`fchip${!searchParams.cat ? ' on' : ''}`}>Tout</Link>
            {categories.map((c) => (
              <Link key={c} href={`/?cat=${encodeURIComponent(c)}`}
                className={`fchip${searchParams.cat === c ? ' on' : ''}`}>{c}</Link>
            ))}
          </div>

          {annonces.length > 0 ? (
            <div className="feed">
              {annonces.map((a) => (
                <CarteAnnonce key={a.id} annonce={a}
                  moisSaison={saisonParProduit.get(a.produit ?? '') ?? undefined} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <Illustration nom="plant" className="e-ico" />
              <h3>Rien pour l'instant</h3>
              <p>Personne n'a encore publié ici. Vous pouvez être le premier : c'est souvent ce qui fait démarrer un secteur.</p>
              <Link className="btn btn-p" href="/vendre/publier">Publier une annonce</Link>
            </div>
          )}

          {meteo && <BlocMeteo meteo={meteo} />}

          <section className="bloc" aria-labelledby="titre-evenements">
            <div className="bloc-head">
              <h2 id="titre-evenements">Autour de chez vous</h2>
              <Link href="/evenements" className="bloc-lien">
                {evenements.length > 0 ? 'Tout voir' : 'Proposer'}
              </Link>
            </div>
            {evenements.length > 0 ? (
              <div className="events">
                {evenements.map((e) => <CarteEvenement key={e.id} evenement={e} />)}
              </div>
            ) : (
              <div className="card">
                <h3>Aucun événement annoncé</h3>
                <p className="muted" style={{ marginTop: 6 }}>
                  Marché, fête de village, brocante, porte ouverte : annoncez-le et vos
                  voisins le verront ici.
                </p>
                <Link className="btn btn-s btn-sm" href="/evenements/nouveau" style={{ marginTop: 12 }}>
                  Proposer un événement
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
      <PiedDePage />
      <BarreBas />
    </>
  );
}
