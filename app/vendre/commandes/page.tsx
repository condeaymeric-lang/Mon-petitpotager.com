import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur } from '@/lib/utils';
import ActionsCommande from './ActionsCommande';

export const dynamic = 'force-dynamic';

export default async function CommandesVendeur() {
  const { profil, secteur, sb } = await profilCourant();

  const { data: lignes } = await sb
    .from('lignes_commande')
    .select(`*, commande:commandes(id, reference, statut, created_at, mode_retrait,
             adresse_retrait, acheteur:profils!commandes_acheteur_id_fkey(prenom))`)
    .eq('vendeur_id', profil.id)
    .order('id', { ascending: false });

  // Une commande peut contenir plusieurs de mes lignes : on regroupe.
  const parCommande = new Map<string, { commande: any; lignes: any[] }>();
  for (const l of lignes ?? []) {
    const c = (l as any).commande;
    if (!c || c.statut === 'annulee') continue;
    if (!parCommande.has(c.id)) parCommande.set(c.id, { commande: c, lignes: [] });
    parCommande.get(c.id)!.lignes.push(l);
  }
  const groupes = [...parCommande.values()];

  const aTraiter = groupes.filter((g) =>
    ['confirmee', 'en_preparation'].includes(g.commande.statut) &&
    g.lignes.some((l) => !l.depose));
  const terminees = groupes.filter((g) => !aTraiter.includes(g));

  function bloc(g: { commande: any; lignes: any[] }) {
    const total = g.lignes.reduce((a, l) => a + l.prix_unitaire * l.quantite, 0);
    const tousPrepares = g.lignes.every((l) => l.prepare);
    const tousDeposes = g.lignes.every((l) => l.depose);
    const retiree = g.commande.statut === 'retiree';

    return (
      <div className="card" key={g.commande.id}>
        <div className="grp-head" style={{ justifyContent: 'space-between' }}>
          <span>{g.commande.reference} · {g.commande.acheteur?.prenom ?? 'Acheteur'}</span>
          <span className={`badge ${retiree ? 'b-done' : tousDeposes ? 'b-ok' : 'b-wait'}`}>
            {retiree ? 'Retirée' : tousDeposes ? 'Déposée' : tousPrepares ? 'Préparée' : 'À préparer'}
          </span>
        </div>

        {g.lignes.map((l: any) => (
          <div className="line" key={l.id}>
            <div className="th">
              {l.photo ? <img src={l.photo} alt="" loading="lazy" /> : <Illustration />}
            </div>
            <div className="line-b">
              <h4>{l.titre}{l.variete ? ` — ${l.variete}` : ''}</h4>
              <p>×{l.quantite} · {eur(l.prix_unitaire * l.quantite)}</p>
            </div>
          </div>
        ))}

        <div className="cmd-pied">
          <span className="tiny">
            {new Date(g.commande.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            {' · '}{g.commande.adresse_retrait}
          </span>
          <b>{eur(total)}</b>
        </div>

        {!retiree && (
          <ActionsCommande
            lignesIds={g.lignes.map((l: any) => l.id)}
            prepare={tousPrepares}
            depose={tousDeposes}
          />
        )}
        {retiree && (
          <p className="tiny" style={{ marginTop: 10 }}>
            Retrait confirmé par l&apos;acheteur
            {g.lignes.every((l: any) => l.verse) ? ' · versement effectué' : ''}.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page page-form">
        <Link href="/vendre" className="back">← Tableau de bord</Link>
        <div className="page-head">
          <h1>Commandes reçues</h1>
          <p>
            {aTraiter.length > 0
              ? `${aTraiter.length} commande${aTraiter.length > 1 ? 's' : ''} à traiter.`
              : 'Aucune commande en attente.'}
          </p>
        </div>

        {groupes.length === 0 && (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Aucune commande</h3>
            <p>Les commandes de vos produits apparaîtront ici, avec les étapes à suivre.</p>
            <Link className="btn btn-p" href="/vendre/publier">Publier une annonce</Link>
          </div>
        )}

        {aTraiter.length > 0 && (
          <section className="bloc" style={{ marginTop: 0 }} aria-labelledby="t-a-traiter">
            <div className="bloc-head"><h2 id="t-a-traiter">À traiter</h2></div>
            {aTraiter.map(bloc)}
          </section>
        )}

        {terminees.length > 0 && (
          <section className="bloc" aria-labelledby="t-terminees">
            <div className="bloc-head"><h2 id="t-terminees">Terminées</h2></div>
            {terminees.map(bloc)}
          </section>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
