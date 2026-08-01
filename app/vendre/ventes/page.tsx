import { profilCourant, catalogue } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { eur, estDeSaison } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MesVentes() {
  const { profil, secteur, sb } = await profilCourant();

  const [{ data: lignes }, { produits }] = await Promise.all([
    sb.from('lignes_commande')
      .select('*, commande:commandes(reference, statut, created_at)')
      .eq('vendeur_id', profil.id)
      .order('id', { ascending: false }),
    catalogue(),
  ]);

  const ventes = lignes ?? [];
  const ca = ventes.reduce((a: number, l: any) => a + l.prix_unitaire * l.quantite, 0);
  const verse = ventes.filter((l: any) => l.verse)
    .reduce((a: number, l: any) => a + l.prix_unitaire * l.quantite, 0);
  const deSaison = produits.filter((p) => estDeSaison(p.mois_saison));

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Mes ventes</h1>
          <p>Suivi de votre activité de vendeur.</p>
        </div>

        <div className="dash-top">
          <div className="pts-card">
            <small>REVENUS CUMULÉS</small>
            <b>{eur(ca)}</b>
            <small>dont {eur(verse)} déjà versés après retrait</small>
          </div>
          <div className="card">
            <div className="stats">
              <div><b>{ventes.length}</b><span className="tiny">lignes vendues</span></div>
              <div><b>{eur(ca - verse)}</b><span className="tiny">en attente de retrait</span></div>
            </div>
          </div>
        </div>

        {ventes.length > 0 && (
          <div className="card">
            <h3>Dernières ventes</h3>
            {ventes.slice(0, 10).map((l: any) => (
              <div className="pts-log" key={l.id}>
                <span>
                  {l.titre}{l.variete ? ` — ${l.variete}` : ''} ×{l.quantite}
                  <br />
                  <span className="tiny">
                    {l.commande?.reference} ·{' '}
                    {l.commande?.created_at &&
                      new Date(l.commande.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </span>
                <b style={{ color: l.verse ? 'var(--forest-2)' : 'var(--ink-soft)' }}>
                  {eur(l.prix_unitaire * l.quantite)}
                </b>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h3>Comment gagner plus</h3>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'var(--ink-soft)', fontSize: '.88rem' }}>
            <li style={{ marginBottom: 7 }}>Publiez le matin : les acheteurs consultent surtout entre 7 h et 9 h.</li>
            <li style={{ marginBottom: 7 }}>Ajoutez une photo réelle : les annonces illustrées reçoivent bien plus de vues.</li>
            <li style={{ marginBottom: 7 }}>Précisez la variété : « Cœur de bœuf » se vend mieux que « tomates ».</li>
            <li>Restez sous le prix de la grande surface : c'est la première raison qui fait venir vos voisins.</li>
          </ul>
        </div>

        <div className="card">
          <h3>Prix de référence du moment</h3>
          <p className="tiny" style={{ marginTop: 5 }}>
            Moyennes constatées en grande surface, pour vous situer.
          </p>
          <div style={{ marginTop: 12 }}>
            {deSaison.slice(0, 8).map((p) => (
              <div className="pts-log" key={p.id}>
                <span>{p.nom} <span className="tiny">/ {p.unite}</span></span>
                <b style={{ color: 'var(--forest)' }}>{p.prix_ref ? eur(p.prix_ref) : '—'}</b>
              </div>
            ))}
          </div>
        </div>
      </div></div>
      <BarreBas />
    </>
  );
}
