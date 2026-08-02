import Link from 'next/link';
import { Illustration } from '@/components/Illustrations';
import { eur, estDeSaison } from '@/lib/utils';
import type { AnnonceProche } from '@/lib/types';

export default function CarteAnnonce({
  annonce, moisSaison,
}: { annonce: AnnonceProche; moisSaison?: number[] }) {
  const a = annonce;
  const eco = a.mode === 'vente' && a.prix_ref && a.prix < a.prix_ref;
  const saison = estDeSaison(moisSaison);

  return (
    <Link href={`/annonce/${a.id}`} className="item">
      <div className="thumb">
        {a.photos?.[0]
          ? <img src={a.photos[0]} alt="" loading="lazy" />
          : <Illustration nom={a.illustration} />}
        <span className={`badge tag ${a.mode === 'troc' ? 'b-troc' : a.mode === 'don' ? 'b-don' : a.vendeur_pro ? 'b-pro' : 'b-am'}`}>
          {a.mode === 'troc' ? 'Troc' : a.mode === 'don' ? 'Don' : a.vendeur_pro ? 'Pro' : 'Voisin'}
        </span>
        {saison && <span className="badge b-sais tag2">Saison</span>}
      </div>
      <div className="item-b">
        <h4>{a.titre}</h4>
        {a.variete && <p className="vari">{a.variete}</p>}
        <p className="price">
          {a.mode === 'don' ? 'Gratuit' : a.mode === 'troc' ? 'Troc'
            : <>{eur(a.prix)} <small>/ {a.unite}</small></>}
          {eco && <span className="strike">{eur(a.prix_ref!)}</span>}
        </p>
        <p className="vendeur">
          {a.vendeur_avatar
            ? <img src={a.vendeur_avatar} alt="" className="avatar-mini" loading="lazy" />
            : <span className="avatar-mini avatar-mini-vide">{a.vendeur_prenom?.[0]?.toUpperCase()}</span>}
          {a.vendeur_prenom}
        </p>
        <div className="item-meta"><span>{a.commune}</span><span>{a.distance_km} km</span></div>
      </div>
    </Link>
  );
}
