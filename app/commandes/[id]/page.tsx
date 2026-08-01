import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur } from '@/lib/utils';
import SuiviCommande from './SuiviCommande';

export const dynamic = 'force-dynamic';

export default async function PageCommande({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();
  const { data: c } = await sb
    .from('commandes')
    .select('*, lignes:lignes_commande(*)')
    .eq('id', params.id)
    .maybeSingle();

  if (!c) notFound();

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <Link href="/commandes" className="back">← Retour</Link>
        <div className="page-head">
          <h1>{c.reference}</h1>
          <p>Passée le {new Date(c.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        </div>

        <SuiviCommande commandeId={c.id} statut={c.statut} />

        <div className="card">
          <h3>Retrait</h3>
          <p className="muted" style={{ marginTop: 7 }}>{c.adresse_retrait}</p>
        </div>

        <div className="card">
          <h3>Détail</h3>
          {(c.lignes ?? []).map((l: any) => (
            <div className="line" key={l.id}>
              <div className="th">{l.photo ? <img src={l.photo} alt="" /> : <Illustration />}</div>
              <div className="line-b">
                <h4>{l.titre}</h4>
                <p>{l.variete ? `${l.variete} · ` : ''}×{l.quantite}</p>
              </div>
              <b style={{ fontSize: '.89rem' }}>{eur(l.prix_unitaire * l.quantite)}</b>
            </div>
          ))}
          <div className="sum-row" style={{ marginTop: 10 }}>
            <span>Sous-total</span><span>{eur(c.sous_total)}</span>
          </div>
          {c.reduction > 0 && (
            <div className="sum-row disc">
              <span>Points utilisés ({c.points_utilises})</span><span>−{eur(c.reduction)}</span>
            </div>
          )}
          <div className="sum-row"><span>Frais de service</span><span>{eur(c.frais_service)}</span></div>
          <div className="sum-row total"><span>Total</span><b>{eur(c.total)}</b></div>
        </div>
      </div></div>
      <BarreBas />
    </>
  );
}
