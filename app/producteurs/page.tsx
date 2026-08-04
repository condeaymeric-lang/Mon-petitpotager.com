import Link from 'next/link';
import { producteursAutour } from '@/lib/donnees';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import PiedDePage from '@/components/PiedDePage';
import { Illustration } from '@/components/Illustrations';

export const dynamic = 'force-dynamic';

export default async function Producteurs() {
  const { connecte, secteur, rayonKm } = await contexteVisite();
  const producteurs = secteur
    ? await producteursAutour(secteur.lat, secteur.lon, rayonKm)
    : [];

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur?.nom ?? '—'} rayonKm={rayonKm} />}
      <div className={connecte ? "app has-tabbar" : "app"}><div className="page">
        <div className="page-head">
          <h1>Producteurs</h1>
          <p>
            Fermes, maraîchers et artisans professionnels dans les {rayonKm} km
            autour de {secteur?.nom}.
          </p>
        </div>

        {producteurs.length > 0 ? (
          <div className="prods">
            {producteurs.map((p) => (
              <Link key={p.id} href={`/producteurs/${p.id}`} className="prod">
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" className="prod-photo" loading="lazy" />
                  : <span className="prod-photo prod-photo-vide">{p.prenom?.[0]?.toUpperCase()}</span>}
                <div className="prod-b">
                  <h4>{p.raison_sociale || p.prenom}</h4>
                  {p.raison_sociale && <p className="tiny">{p.prenom}</p>}
                  {p.bio && <p className="prod-bio">{p.bio}</p>}
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
                <div className="prod-badges">
                  {p.pro_verifie && <span className="badge b-pro">Vérifié</span>}
                  {p.est_relais && <span className="badge b-ok">Point relais</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Aucun producteur professionnel</h3>
            <p>
              Aucune ferme ni aucun maraîcher professionnel n&apos;est encore inscrit dans
              votre secteur. Vous êtes producteur ? Choisissez le statut professionnel
              dans votre profil pour apparaître ici.
            </p>
            <Link className="btn btn-p" href="/profil">Mon profil</Link>
          </div>
        )}
      </div></div>
      <PiedDePage />
      {connecte && <BarreBas />}
    </>
  );
}
