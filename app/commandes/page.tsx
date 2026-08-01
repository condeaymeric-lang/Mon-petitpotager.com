import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const LIBELLE: Record<string, [string, string]> = {
  en_attente_paiement: ['En attente', 'b-wait'],
  confirmee: ['Confirmée', 'b-wait'],
  en_preparation: ['En préparation', 'b-wait'],
  deposee: ['Prête au retrait', 'b-ok'],
  retiree: ['Retirée', 'b-done'],
  annulee: ['Annulée', 'b-done'],
  litige: ['Litige', 'b-wait'],
};

export default async function Commandes() {
  const { profil, secteur, sb } = await profilCourant();
  const { data: commandes } = await sb
    .from('commandes')
    .select('*, lignes:lignes_commande(id, titre, photo)')
    .eq('acheteur_id', profil.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        {commandes?.length ? (<>
          <div className="page-head">
            <h1>Mes commandes</h1>
            <p>{commandes.length} commande{commandes.length > 1 ? 's' : ''}.</p>
          </div>
          {commandes.map((c: any) => {
            const [txt, cls] = LIBELLE[c.statut] ?? ['—', 'b-done'];
            return (
              <Link href={`/commandes/${c.id}`} key={c.id} className="card" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <h4>{c.reference}</h4>
                    <p className="tiny">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      {' · '}{c.lignes?.length ?? 0} produit{(c.lignes?.length ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className={`badge ${cls}`}>{txt}</span>
                </div>
                <div className="photos" style={{ marginTop: 12 }}>
                  {(c.lignes ?? []).slice(0, 4).map((l: any) => (
                    <div className="photo" key={l.id} style={{ width: 44, height: 44 }}>
                      {l.photo ? <img src={l.photo} alt="" /> : <Illustration />}
                    </div>
                  ))}
                </div>
                <p className="price" style={{ marginTop: 10 }}>{eur(c.total)}</p>
              </Link>
            );
          })}
        </>) : (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Aucune commande</h3>
            <p>Vos commandes et leur suivi apparaîtront ici après votre premier panier.</p>
            <Link className="btn btn-p" href="/">Voir les annonces</Link>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
