import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur, estDeSaison, distanceKm } from '@/lib/utils';
import BoutonPanier from './BoutonPanier';

export const dynamic = 'force-dynamic';

export default async function PageAnnonce({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();

  const { data: a } = await sb
    .from('annonces')
    .select(`*, vendeur:profils!annonces_vendeur_id_fkey(id, prenom, pro_verifie),
             produit:produits(nom, categorie, prix_ref, mois_saison),
             variete:varietes(nom, description, illustration)`)
    .eq('id', params.id)
    .maybeSingle();

  if (!a) notFound();

  const estMien = a.vendeur_id === profil.id;
  const prixRef = a.produit?.prix_ref ?? null;
  const eco = a.mode === 'vente' && prixRef && a.prix < prixRef;
  const pct = eco ? Math.round((1 - a.prix / prixRef) * 100) : 0;
  const km = secteur && a.lat && a.lon
    ? +distanceKm(secteur.lat, secteur.lon, a.lat, a.lon).toFixed(1) : null;

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <Link href="/" className="back">← Retour</Link>

        <div className="thumb" style={{ aspectRatio: '1.7', borderRadius: 'var(--r-l)', overflow: 'hidden' }}>
          {a.photos?.[0]
            ? <img src={a.photos[0]} alt={a.titre} />
            : <Illustration nom={a.variete?.illustration} />}
        </div>

        {a.photos?.length > 1 && (
          <div className="photos" style={{ marginTop: 10 }}>
            {a.photos.slice(1).map((p: string) => (
              <div className="photo" key={p}><img src={p} alt="" /></div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '14px 0 10px' }}>
          <span className={`badge ${a.vendeur?.pro_verifie ? 'b-pro' : 'b-am'}`}>
            {a.vendeur?.pro_verifie ? 'Producteur pro' : 'Particulier'}
          </span>
          {estDeSaison(a.produit?.mois_saison) && <span className="badge b-sais">De saison</span>}
          {a.mode === 'troc' && <span className="badge b-troc">Troc</span>}
          {a.mode === 'don' && <span className="badge b-don">Don</span>}
          {eco && <span className="badge b-eco">{pct} % moins cher</span>}
        </div>

        <h1>{a.titre}</h1>
        {a.variete && <p className="vari" style={{ fontSize: '.95rem', marginTop: 4 }}>{a.variete.nom}</p>}
        <p className="price" style={{ fontSize: '1.7rem', margin: '10px 0 4px' }}>
          {a.mode === 'don' ? 'Gratuit' : a.mode === 'troc' ? 'À troquer'
            : <>{eur(a.prix)} <small style={{ fontSize: '.85rem' }}>/ {a.unite}</small></>}
        </p>
        <p className="muted">
          {a.vendeur?.prenom} · {a.commune}
          {km != null && ` · à ${km} km`} · {a.quantite} disponible{a.quantite > 1 ? 's' : ''}
        </p>

        {eco && (
          <div className="priceref">
            <b>{eur(prixRef)} en grande surface pour le même produit</b>
            <p>
              Vous économisez {eur(prixRef - a.prix)} par {a.unite}, et l'argent reste
              chez votre voisin plutôt que dans une centrale d'achat.
            </p>
          </div>
        )}

        <div className="card" style={{ marginTop: 14 }}>
          <h3>Description</h3>
          <p className="muted" style={{ marginTop: 7 }}>
            {a.description || a.variete?.description || 'Aucune description fournie.'}
          </p>
        </div>

        {estMien ? (
          <>
            <Link className="btn btn-s" href="/vendre/annonces" style={{ marginTop: 14 }}>
              Gérer mes annonces
            </Link>
            <p className="tiny center" style={{ marginTop: 10 }}>C'est votre annonce.</p>
          </>
        ) : (
          <BoutonPanier
            annonce={{
              annonce_id: a.id, titre: a.titre, variete: a.variete?.nom ?? null,
              photo: a.photos?.[0] ?? null, prix: a.prix, unite: a.unite,
              quantite: 1, stock: a.quantite, vendeur_id: a.vendeur_id,
              vendeur_prenom: a.vendeur?.prenom ?? '', commune: a.commune,
              prix_ref: prixRef,
            }}
          />
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
