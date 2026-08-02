import Link from 'next/link';
import { profilCourant, catalogue } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur, estDeSaison } from '@/lib/utils';
import ListeAttente from '../ListeAttente';

export const dynamic = 'force-dynamic';

interface Stats {
  ca_total: number; ca_30j: number; ca_30j_precedents: number;
  en_attente_versement: number; nb_ventes: number; nb_clients: number;
  a_preparer: number; a_deposer: number;
  annonces_en_ligne: number; annonces_epuisees: number;
  stock_total: number; vues_totales: number;
}

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

  const estPro = profil.role === 'pro';

  const [{ data: statsRows }, { data: topRows }, { data: mes }, { produits }] = await Promise.all([
    sb.rpc('stats_vendeur', { p_vendeur: profil.id }),
    sb.rpc('top_produits_vendeur', { p_vendeur: profil.id, p_limite: 5 }),
    sb.from('annonces')
      .select('id, titre, quantite, quantite_initiale, vues, prix, unite, statut, produit:produits(prix_ref)')
      .eq('vendeur_id', profil.id).neq('statut', 'retire'),
    catalogue(),
  ]);

  const s: Stats = (statsRows?.[0] as Stats) ?? {
    ca_total: 0, ca_30j: 0, ca_30j_precedents: 0, en_attente_versement: 0,
    nb_ventes: 0, nb_clients: 0, a_preparer: 0, a_deposer: 0,
    annonces_en_ligne: 0, annonces_epuisees: 0, stock_total: 0, vues_totales: 0,
  };
  const top = (topRows ?? []) as { titre: string; variete: string | null; quantite: number; chiffre: number }[];
  const annonces = (mes ?? []) as any[];

  const evolution = s.ca_30j_precedents > 0
    ? Math.round(((s.ca_30j - s.ca_30j_precedents) / s.ca_30j_precedents) * 100)
    : null;

  // Alertes : stock bas ou épuisé, et prix au-dessus de la grande surface.
  const stockBas = annonces.filter((a) => a.statut === 'en_ligne' && a.quantite > 0 && a.quantite <= 2);
  const epuisees = annonces.filter((a) => a.statut === 'epuise' || a.quantite === 0);
  const tropCher = annonces.filter((a) =>
    a.statut === 'en_ligne' && a.produit?.prix_ref && a.prix > a.produit.prix_ref);

  const deSaison = produits.filter((p) => estDeSaison(p.mois_saison));
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const conversion = s.vues_totales > 0 ? (s.nb_ventes / s.vues_totales) * 100 : null;

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <span className="surtitre">{estPro ? 'Tableau de bord' : 'Espace vendeur'}</span>
          <h1>{estPro ? (profil.raison_sociale || 'Mon exploitation') : 'Mes ventes'}</h1>
          <p>
            {estPro ? 'Producteur professionnel' : 'Jardinier amateur'}
            {secteur && ` · ${secteur.nom}`}
          </p>
        </div>

        {/* Ce qui demande une action, en premier. */}
        {(s.a_preparer > 0 || s.a_deposer > 0) && (
          <Link href="/vendre/commandes" className="card action-card">
            <div>
              <b>
                {s.a_preparer > 0
                  ? `${s.a_preparer} commande${s.a_preparer > 1 ? 's' : ''} à préparer`
                  : `${s.a_deposer} commande${s.a_deposer > 1 ? 's' : ''} à déposer`}
              </b>
              <p className="tiny">
                {s.a_preparer > 0 && s.a_deposer > 0
                  ? `Et ${s.a_deposer} prête${s.a_deposer > 1 ? 's' : ''} à déposer.`
                  : 'Traitez-les depuis vos commandes.'}
              </p>
            </div>
            <span className="action-fleche" aria-hidden="true">→</span>
          </Link>
        )}

        <div className="dash-top">
          <div className="pts-card">
            <small>{estPro ? 'REVENUS 30 DERNIERS JOURS' : 'MES POINTS'}</small>
            <b>{estPro ? eur(s.ca_30j) : profil.points}</b>
            <small>
              {estPro
                ? evolution == null
                  ? `${eur(s.ca_total)} depuis le début`
                  : `${evolution >= 0 ? '+' : ''}${evolution} % par rapport aux 30 jours précédents`
                : `soit ${eur(profil.points / 100)} de réduction sur vos achats`}
            </small>
          </div>

          <div className="card">
            <div className="stats">
              <div><b>{s.annonces_en_ligne}</b><span className="tiny">en ligne</span></div>
              <div><b>{s.stock_total}</b><span className="tiny">en stock</span></div>
              <div><b>{s.vues_totales}</b><span className="tiny">vues</span></div>
            </div>
          </div>
        </div>

        {estPro && (
          <div className="kpis">
            <div className="kpi">
              <span>Chiffre d&apos;affaires total</span>
              <b>{eur(s.ca_total)}</b>
            </div>
            <div className="kpi">
              <span>En attente de versement</span>
              <b>{eur(s.en_attente_versement)}</b>
            </div>
            <div className="kpi">
              <span>Ventes</span>
              <b>{s.nb_ventes}</b>
            </div>
            <div className="kpi">
              <span>Clients différents</span>
              <b>{s.nb_clients}</b>
            </div>
            <div className="kpi">
              <span>Panier moyen</span>
              <b>{s.nb_ventes > 0 ? eur(s.ca_total / s.nb_ventes) : '—'}</b>
            </div>
            <div className="kpi">
              <span>Vues par vente</span>
              <b>{conversion != null && conversion > 0 ? `${conversion.toFixed(1)} %` : '—'}</b>
            </div>
          </div>
        )}

        <div className="row-btn" style={{ marginTop: 14 }}>
          <Link className="btn btn-p" style={{ flex: 1 }} href="/vendre/publier">Publier</Link>
          <Link className="btn btn-s" style={{ flex: 1 }} href="/vendre/commandes">Commandes</Link>
        </div>

        {/* Alertes concrètes, uniquement quand il y a matière. */}
        {(stockBas.length > 0 || epuisees.length > 0 || tropCher.length > 0) && (
          <section className="bloc" aria-labelledby="t-alertes">
            <div className="bloc-head"><h2 id="t-alertes">À surveiller</h2></div>
            <ul className="conseils">
              {epuisees.length > 0 && (
                <li className="cs-attention">
                  <b>{epuisees.length} annonce{epuisees.length > 1 ? 's' : ''} épuisée{epuisees.length > 1 ? 's' : ''}</b>
                  <p>
                    {epuisees.slice(0, 3).map((a) => a.titre).join(', ')}
                    {epuisees.length > 3 && `, et ${epuisees.length - 3} autre${epuisees.length - 3 > 1 ? 's' : ''}`}.
                    Remettez du stock depuis vos annonces pour qu&apos;elles réapparaissent dans le fil.
                  </p>
                </li>
              )}
              {stockBas.length > 0 && (
                <li className="cs-info">
                  <b>Stock bas sur {stockBas.length} annonce{stockBas.length > 1 ? 's' : ''}</b>
                  <p>
                    {stockBas.map((a) => `${a.titre} (${a.quantite} ${a.unite})`).join(', ')}.
                    Pensez à réapprovisionner avant la fin de semaine.
                  </p>
                </li>
              )}
              {tropCher.length > 0 && (
                <li className="cs-info">
                  <b>{tropCher.length} produit{tropCher.length > 1 ? 's' : ''} au-dessus du prix en grande surface</b>
                  <p>
                    {tropCher.slice(0, 3).map((a) =>
                      `${a.titre} à ${eur(a.prix)} contre ${eur(a.produit.prix_ref)}`).join(', ')}.
                    C&apos;est justifiable si la qualité le vaut, mais attendez-vous à moins de demande.
                  </p>
                </li>
              )}
            </ul>
          </section>
        )}

        {top.length > 0 && (
          <section className="bloc" aria-labelledby="t-top">
            <div className="bloc-head">
              <h2 id="t-top">Vos meilleures ventes</h2>
              <Link href="/vendre/ventes" className="bloc-lien">Détail</Link>
            </div>
            <div className="card">
              {top.map((t, i) => (
                <div className="pts-log" key={`${t.titre}-${t.variete ?? i}`}>
                  <span>
                    {t.titre}{t.variete ? ` — ${t.variete}` : ''}
                    <br />
                    <span className="tiny">{t.quantite} vendu{t.quantite > 1 ? 's' : ''}</span>
                  </span>
                  <b>{eur(t.chiffre)}</b>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bloc" aria-labelledby="t-saison">
          <div className="bloc-head"><h2 id="t-saison">Ce qui se vend en {mois}</h2></div>
          <div className="cat-grid">
            {deSaison.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/vendre/publier?produit=${p.cle}`} className="cat-btn">
                <div className="ill"><Illustration nom={p.illustration} /></div>
                <b>{p.nom}</b>
                <span>{p.prix_ref ? `~${eur(p.prix_ref)} / ${p.unite}` : p.unite}</span>
              </Link>
            ))}
          </div>
        </section>

        {!estPro && (
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Vous produisez à titre professionnel ?</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Le statut professionnel donne accès au suivi du chiffre d&apos;affaires, à la
              gestion des commandes et à une fiche d&apos;exploitation visible par tout le
              secteur.
            </p>
            <Link className="btn btn-s btn-sm" href="/profil" style={{ marginTop: 12 }}>
              Changer mon statut
            </Link>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
