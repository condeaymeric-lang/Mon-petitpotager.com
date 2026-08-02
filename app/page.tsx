import Link from 'next/link';
import { annoncesAutour, catalogue, evenementsAutour, producteursAutour, annoncesEnAvant } from '@/lib/donnees';
import { contexteVisite } from '@/lib/contexte';
import ChoixCommune from '@/components/ChoixCommune';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
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
  const { connecte, profil, secteur, rayonKm } = await contexteVisite();

  // Sans commune, il n'y a pas de rayon : on demande d'abord où l'on est.
  if (!secteur) {
    if (!connecte) return <ChoixCommune />;
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

  // Le seuil d'ouverture ne s'applique qu'aux membres : un visiteur qui
  // découvre le service doit pouvoir regarder, même dans un secteur jeune.
  if (connecte && profil && !secteur.ouvert) {
    return (
      <>
        <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        <div className="app has-tabbar">
          <ListeAttente secteur={secteur} profilId={profil.id} />
        </div>
        <BarreBas />
      </>
    );
  }

  const [annonces, { produits }, evenements, meteo, producteurs, enAvant] = await Promise.all([
    annoncesAutour(secteur.lat, secteur.lon, rayonKm, searchParams.cat),
    catalogue(),
    evenementsAutour(secteur.lat, secteur.lon, rayonKm, 3),
    meteoSecteur(secteur.lat, secteur.lon, secteur.nom),
    producteursAutour(secteur.lat, secteur.lon, rayonKm),
    annoncesEnAvant(secteur.lat, secteur.lon, rayonKm, 12),
  ]);

  const categories = [...new Set(produits.map((p) => p.categorie))];
  const saisonParProduit = new Map(produits.map((p) => [p.nom, p.mois_saison]));
  const nbSaison = annonces.filter((a) => estDeSaison(saisonParProduit.get(a.produit ?? ''))).length;

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}
      <div className={connecte ? 'app has-tabbar' : 'app'}>
        <div className="page">
          <div className="page-head">
            <h1>{connecte && profil ? `Bonjour ${profil.prenom}.` : `Autour de ${secteur.nom}.`}</h1>
            <p>
              {annonces.length} annonce{annonces.length > 1 ? 's' : ''} dans les {rayonKm} km
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
              <Link className="btn btn-p" href={connecte ? '/vendre/publier' : '/inscription'}>
                {connecte ? 'Publier une annonce' : 'Créer un compte pour publier'}
              </Link>
            </div>
          )}

          {enAvant.length > 0 && (
            <section className="bloc" aria-labelledby="titre-avant">
              <div className="bloc-head">
                <h2 id="titre-avant">Chez nos producteurs</h2>
                <Link href="/producteurs" className="bloc-lien">Voir les fermes</Link>
              </div>
              <div className="sponso">
                {enAvant.map((a) => (
                  <CarteAnnonce key={a.id} annonce={a}
                    moisSaison={saisonParProduit.get(a.produit ?? '') ?? undefined} />
                ))}
              </div>
            </section>
          )}

          {meteo && <BlocMeteo meteo={meteo} />}

          {producteurs.length > 0 && (
            <section className="bloc" aria-labelledby="titre-producteurs">
              <div className="bloc-head">
                <h2 id="titre-producteurs">Producteurs du secteur</h2>
                <Link href="/producteurs" className="bloc-lien">Tout voir</Link>
              </div>
              <div className="prods">
                {producteurs.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/producteurs/${p.id}`} className="prod">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="prod-photo" loading="lazy" />
                      : <span className="prod-photo prod-photo-vide">{p.prenom?.[0]?.toUpperCase()}</span>}
                    <div className="prod-b">
                      <h4>{p.raison_sociale || p.prenom}</h4>
                      <div className="item-meta">
                        <span>{p.commune}</span>
                        <span>{p.distance_km} km</span>
                        <span>
                          {p.nb_annonces > 0
                            ? `${p.nb_annonces} produit${p.nb_annonces > 1 ? 's' : ''}`
                            : 'Aucun produit en ligne'}
                        </span>
                      </div>
                    </div>
                    {p.pro_verifie && <div className="prod-badges"><span className="badge b-pro">Vérifié</span></div>}
                  </Link>
                ))}
              </div>
            </section>
          )}

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
                <Link className="btn btn-s btn-sm" style={{ marginTop: 12 }}
                  href={connecte ? '/evenements/nouveau' : '/inscription'}>
                  {connecte ? 'Proposer un événement' : 'Créer un compte pour proposer'}
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
      <PiedDePage />
      {connecte && <BarreBas />}
    </>
  );
}
