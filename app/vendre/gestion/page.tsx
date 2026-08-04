import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { eur } from '@/lib/utils';
import Graphique, { type Mois } from './Graphique';
import Outils from './Outils';

export const dynamic = 'force-dynamic';

export default async function Gestion() {
  const { profil, secteur, sb } = await profilCourant();
  const estPro = profil.role === 'pro';

  if (!estPro) {
    return (
      <>
        <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><div className="page">
          <div className="page-head">
            <h1>Gestion de l&apos;exploitation</h1>
            <p>Ces outils sont réservés aux comptes professionnels.</p>
          </div>
          <div className="card">
            <p className="muted">
              La tenue de compte, l&apos;inventaire et le pense-bête s&apos;adressent
              aux producteurs déclarés. Vous pouvez passer votre compte en
              professionnel depuis votre profil.
            </p>
            <Link className="btn btn-p" href="/profil" style={{ marginTop: 14 }}>
              Modifier mon profil
            </Link>
          </div>
        </div></div>
        <BarreBas />
      </>
    );
  }

  const [releve, palmares, ventes, depenses, stocks, taches] = await Promise.all([
    sb.rpc('releve_mensuel', { p_mois: 12 }),
    sb.rpc('palmares_produits', { p_jours: 90 }),
    sb.from('ventes_directes').select('*').order('date_vente', { ascending: false }).limit(25),
    sb.from('depenses').select('*').order('date_depense', { ascending: false }).limit(25),
    sb.from('inventaire').select('*').order('libelle'),
    sb.from('taches').select('*').order('faite').order('echeance', { nullsFirst: false }),
  ]);

  const mois: Mois[] = releve.data ?? [];
  const courant = mois[mois.length - 1];
  const precedent = mois[mois.length - 2];

  const recettes = (m?: Mois) => m ? +m.ventes_ligne + +m.ventes_directes : 0;
  const evolution = precedent && recettes(precedent) > 0
    ? Math.round(((recettes(courant) - recettes(precedent)) / recettes(precedent)) * 100)
    : null;

  const annee = mois.reduce((a, m) => ({
    recettes: a.recettes + recettes(m),
    depenses: a.depenses + +m.depenses,
  }), { recettes: 0, depenses: 0 });

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Gestion de l&apos;exploitation</h1>
          <p>
            Vos ventes en direct, vos dépenses, votre stock et vos notes.
            Ces relevés sont un suivi quotidien, pas une comptabilité légale.
          </p>
        </div>

        <div className="kpis">
          <div className="kpi">
            <small>RECETTES DU MOIS</small>
            <b>{eur(recettes(courant))}</b>
            <small>
              {evolution == null
                ? 'Pas de mois précédent à comparer'
                : `${evolution >= 0 ? '+' : ''}${evolution} % par rapport au mois dernier`}
            </small>
          </div>
          <div className="kpi">
            <small>DÉPENSES DU MOIS</small>
            <b>{eur(courant ? +courant.depenses : 0)}</b>
            <small>{eur(annee.depenses)} sur douze mois</small>
          </div>
          <div className="kpi">
            <small>RÉSULTAT DU MOIS</small>
            <b className={courant && +courant.resultat < 0 ? 'neg' : undefined}>
              {eur(courant ? +courant.resultat : 0)}
            </b>
            <small>
              {eur(annee.recettes - annee.depenses)} sur douze mois
            </small>
          </div>
          <div className="kpi">
            <small>DONT VENTES EN LIGNE</small>
            <b>{eur(courant ? +courant.ventes_ligne : 0)}</b>
            <small>Versé après confirmation de retrait</small>
          </div>
        </div>

        <Graphique donnees={mois} />

        {(palmares.data ?? []).length > 0 && (
          <div className="card">
            <h3>Ce qui rapporte le plus, sur trois mois</h3>
            <div className="repart" style={{ marginTop: 10 }}>
              {(palmares.data as any[]).map((p, i, tous) => (
                <div className="repart-l" key={p.libelle}>
                  <span>{p.libelle}</span>
                  <div className="repart-jauge">
                    <i style={{ width: `${(+p.chiffre / +tous[0].chiffre) * 100}%` }} />
                  </div>
                  <b>{eur(+p.chiffre)}</b>
                </div>
              ))}
            </div>
            <p className="tiny" style={{ marginTop: 10 }}>
              Ventes en ligne versées et ventes directes confondues.
            </p>
          </div>
        )}

        <Outils
          ventes={(ventes.data ?? []) as any}
          depenses={(depenses.data ?? []) as any}
          stocks={(stocks.data ?? []) as any}
          taches={(taches.data ?? []) as any}
        />
      </div></div>
      <BarreBas />
    </>
  );
}
