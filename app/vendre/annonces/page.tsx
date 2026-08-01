import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur } from '@/lib/utils';
import BoutonRetirer from './BoutonRetirer';

export const dynamic = 'force-dynamic';

export default async function MesAnnonces() {
  const { profil, secteur, sb } = await profilCourant();
  const { data: annonces } = await sb
    .from('annonces')
    .select('*, produit:produits(illustration), variete:varietes(nom, illustration)')
    .eq('vendeur_id', profil.id)
    .neq('statut', 'retire')
    .order('created_at', { ascending: false });

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        {annonces?.length ? (<>
          <div className="page-head">
            <h1>Mes annonces</h1>
            <p>{annonces.length} publication{annonces.length > 1 ? 's' : ''}.</p>
          </div>
          <div className="annonces-grid">
            {annonces.map((a: any) => (
              <div className="card" key={a.id}>
                <div className="line" style={{ border: 0, padding: 0 }}>
                  <div className="th">
                    {a.photos?.[0] ? <img src={a.photos[0]} alt="" /> : <Illustration nom={a.variete?.illustration ?? a.produit?.illustration} />}
                  </div>
                  <div className="line-b">
                    <h4>{a.titre}{a.variete ? ` — ${a.variete.nom}` : ''}</h4>
                    <p>
                      {a.mode === 'vente' ? `${eur(a.prix)} / ${a.unite}` : a.mode === 'troc' ? 'Troc' : 'Don'}
                      {' · '}reste {a.quantite} · {a.commune}
                    </p>
                  </div>
                </div>
                <div className="row-btn" style={{ marginTop: 14 }}>
                  <Link className="btn btn-s btn-sm" style={{ flex: 1 }} href={`/annonce/${a.id}`}>Voir</Link>
                  <Link className="btn btn-s btn-sm" style={{ flex: 1 }} href={`/vendre/annonces/${a.id}/modifier`}>Modifier</Link>
                  <BoutonRetirer id={a.id} />
                </div>
              </div>
            ))}
          </div>
        </>) : (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Aucune annonce</h3>
            <p>Publiez votre premier surplus, même modeste. C'est souvent ce qui fait démarrer un secteur.</p>
            <Link className="btn btn-p" href="/vendre/publier">Publier une annonce</Link>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
