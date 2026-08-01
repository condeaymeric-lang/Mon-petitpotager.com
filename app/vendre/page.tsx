import Link from 'next/link';
import { profilCourant, catalogue } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur, estDeSaison } from '@/lib/utils';
import ListeAttente from '../ListeAttente';

export const dynamic = 'force-dynamic';

export default async function EspaceVendeur() {
  const { profil, secteur, sb } = await profilCourant();

  if (secteur && !secteur.ouvert) {
    return (
      <>
        <BarreHaut commune={secteur.nom} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><ListeAttente secteur={secteur} profilId={profil.id} /></div>
        <BarreBas />
      </>
    );
  }

  const [{ data: mes }, { produits }] = await Promise.all([
    sb.from('annonces').select('id, quantite, vues').eq('vendeur_id', profil.id).neq('statut', 'retire'),
    catalogue(),
  ]);

  const annonces = mes ?? [];
  const stock = annonces.reduce((a, x) => a + x.quantite, 0);
  const vues = annonces.reduce((a, x) => a + (x.vues ?? 0), 0);
  const deSaison = produits.filter((p) => estDeSaison(p.mois_saison));
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Espace vendeur</h1>
          <p>{profil.role === 'pro' ? 'Producteur professionnel' : 'Jardinier amateur'} · {secteur?.nom}</p>
        </div>

        <div className="dash-top">
          <div className="pts-card">
            <small>MES POINTS</small>
            <b>{profil.points}</b>
            <small>soit {eur(profil.points / 100)} de réduction sur vos achats</small>
          </div>

          <div className="card">
            <div className="stats">
              <div><b>{annonces.length}</b><span className="tiny">annonces</span></div>
              <div><b>{stock}</b><span className="tiny">en stock</span></div>
              <div><b>{vues}</b><span className="tiny">vues</span></div>
            </div>
          </div>
        </div>

        <Link className="btn btn-p" href="/vendre/publier" style={{ marginTop: 14 }}>
          Publier une annonce
        </Link>

        <div className="card" style={{ marginTop: 14 }}>
          <h3>Ce qui se vend en ce moment</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            Produits de saison en {mois} — ce sont ceux que vos voisins recherchent.
          </p>
          <div className="cat-grid" style={{ marginTop: 14 }}>
            {deSaison.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/vendre/publier?produit=${p.cle}`} className="cat-btn">
                <div className="ill"><Illustration nom={p.illustration} /></div>
                <b>{p.nom}</b>
                <span>{p.prix_ref ? `~${eur(p.prix_ref)} / ${p.unite}` : p.unite}</span>
              </Link>
            ))}
          </div>
        </div>
      </div></div>
      <BarreBas />
    </>
  );
}
