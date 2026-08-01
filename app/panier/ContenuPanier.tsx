'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePanier } from '@/components/PanierContext';
import { useToast } from '@/components/Toast';
import { Illustration } from '@/components/Illustrations';
import { creerClient } from '@/lib/supabase-client';
import { eur, FRAIS_SERVICE, POINTS_POUR_UN_EURO } from '@/lib/utils';

const RELAIS = [
  'Chez Sophie — 12 route du Moulin',
  'Le Relais Vert — 10 rue des Jardiniers',
  'Garage de Paul — 3 chemin des Prés',
];

export default function ContenuPanier({
  points, secteurCode, commune,
}: { points: number; secteurCode: string | null; commune: string }) {
  const { lignes, sousTotal, totalReference, modifier, vider } = usePanier();
  const [ptsUtilises, setPts] = useState(0);
  const [retrait, setRetrait] = useState<'relais' | 'main_propre'>('relais');
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const maxPts = Math.min(points, Math.floor(sousTotal * POINTS_POUR_UN_EURO));
  const reduction = Math.min(ptsUtilises, maxPts) / POINTS_POUR_UN_EURO;
  const total = Math.max(0, sousTotal - reduction) + FRAIS_SERVICE;
  const economie = totalReference - sousTotal;

  const groupes = useMemo(() => {
    const g: Record<string, typeof lignes> = {};
    lignes.forEach((l) => { (g[l.vendeur_prenom] ||= []).push(l); });
    return g;
  }, [lignes]);

  async function valider() {
    if (!lignes.length) return;
    setEnvoi(true);
    const sb = creerClient();

    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setEnvoi(false); router.push('/connexion'); return; }

    const adresse = retrait === 'relais'
      ? `${RELAIS[Math.floor(Math.random() * RELAIS.length)]}, ${commune}`
      : 'Remise en main propre';

    const { data: commande, error } = await sb.from('commandes').insert({
      acheteur_id: user.id,
      secteur: secteurCode,
      sous_total: sousTotal,
      reduction,
      points_utilises: Math.min(ptsUtilises, maxPts),
      frais_service: FRAIS_SERVICE,
      total,
      mode_retrait: retrait,
      adresse_retrait: adresse,
      statut: 'confirmee',
      paye_le: new Date().toISOString(),
    }).select().single();

    if (error || !commande) {
      setEnvoi(false);
      toast('Commande impossible. Réessayez.');
      return;
    }

    const { error: eLignes } = await sb.from('lignes_commande').insert(
      lignes.map((l) => ({
        commande_id: commande.id,
        annonce_id: l.annonce_id,
        vendeur_id: l.vendeur_id,
        titre: l.titre,
        variete: l.variete,
        photo: l.photo,
        prix_unitaire: l.prix,
        quantite: l.quantite,
      }))
    );

    if (eLignes) {
      // On annule la commande pour ne pas laisser d'orpheline en base.
      await sb.from('commandes').update({ statut: 'annulee' }).eq('id', commande.id);
      setEnvoi(false);
      toast("Le détail de la commande n'a pas pu être enregistré.");
      return;
    }

    // Décrémenter les stocks
    await Promise.all(lignes.map(async (l) => {
      const reste = Math.max(0, l.stock - l.quantite);
      await sb.from('annonces')
        .update({ quantite: reste, statut: reste === 0 ? 'epuise' : 'en_ligne' })
        .eq('id', l.annonce_id);
    }));

    // Points : on débite ce qui est utilisé, on crédite l'achat
    if (ptsUtilises > 0) {
      await sb.rpc('ajouter_points', {
        p_profil: user.id, p_montant: -Math.min(ptsUtilises, maxPts),
        p_motif: `Réduction — ${commande.reference}`, p_commande: commande.id,
      });
    }
    await sb.rpc('ajouter_points', {
      p_profil: user.id, p_montant: Math.floor(sousTotal),
      p_motif: `Achat — ${commande.reference}`, p_commande: commande.id,
    });

    vider();
    toast(`Commande confirmée · +${Math.floor(sousTotal)} points`);
    router.push(`/commandes/${commande.id}`);
    router.refresh();
  }

  if (!lignes.length) {
    return (
      <div className="page"><div className="empty">
        <Illustration nom="plant" className="e-ico" />
        <h3>Votre panier est vide</h3>
        <p>Composez un panier auprès de plusieurs voisins : vous ne paierez et ne vous déplacerez qu'une fois.</p>
        <Link className="btn btn-p" href="/">Voir les annonces</Link>
      </div></div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Mon panier</h1>
        <p>
          {lignes.length} produit{lignes.length > 1 ? 's' : ''} chez {Object.keys(groupes).length}{' '}
          vendeur{Object.keys(groupes).length > 1 ? 's' : ''} — un seul retrait.
        </p>
      </div>

      {Object.entries(groupes).map(([vendeur, items]) => (
        <div className="card" key={vendeur}>
          <div className="grp-head">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6FA83A" strokeWidth="2.2">
              <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {vendeur} · {items[0].commune}
          </div>
          {items.map((l) => (
            <div className="line" key={l.annonce_id}>
              <div className="th">
                {l.photo ? <img src={l.photo} alt="" /> : <Illustration />}
              </div>
              <div className="line-b">
                <h4>{l.titre}</h4>
                <p>{l.variete ? `${l.variete} · ` : ''}{eur(l.prix)} / {l.unite}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="qty">
                  <button onClick={() => modifier(l.annonce_id, l.quantite - 1)} aria-label="Diminuer">−</button>
                  <span>{l.quantite}</span>
                  <button aria-label="Augmenter"
                    onClick={() => {
                      if (l.quantite >= l.stock) { toast('Stock maximum atteint'); return; }
                      modifier(l.annonce_id, l.quantite + 1);
                    }}>+</button>
                </div>
                <p className="tiny" style={{ marginTop: 5 }}>{eur(l.prix * l.quantite)}</p>
              </div>
            </div>
          ))}
        </div>
      ))}

      {economie > 0.05 && (
        <div className="priceref" style={{ marginTop: 12 }}>
          <b>Vous économisez {eur(economie)} par rapport à la grande surface</b>
          <p>Sur la base des prix moyens constatés pour les mêmes produits.</p>
        </div>
      )}

      <div className="card">
        <h3>Utiliser mes points</h3>
        <p className="tiny" style={{ marginTop: 5 }}>
          {points} points disponibles, soit {eur(points / POINTS_POUR_UN_EURO)}.
        </p>
        {maxPts > 0 ? (
          <>
            <input type="range" min={0} max={maxPts} step={10} value={ptsUtilises}
              style={{ accentColor: '#6FA83A', marginTop: 14 }}
              onChange={(e) => setPts(+e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="tiny">0</span>
              <span className="tiny" style={{ color: 'var(--leaf)', fontWeight: 600 }}>
                {ptsUtilises} pts → −{eur(reduction)}
              </span>
              <span className="tiny">{maxPts}</span>
            </div>
          </>
        ) : (
          <p className="tiny" style={{ marginTop: 10 }}>
            Cumulez des points en publiant, en vendant et en invitant vos voisins.
          </p>
        )}
      </div>

      <div className="card">
        <div className="sum-row"><span>Sous-total</span><span>{eur(sousTotal)}</span></div>
        {reduction > 0 && (
          <div className="sum-row disc">
            <span>Réduction ({ptsUtilises} points)</span><span>−{eur(reduction)}</span>
          </div>
        )}
        <div className="sum-row"><span>Frais de service</span><span>{eur(FRAIS_SERVICE)}</span></div>
        <div className="sum-row total"><span>À payer</span><b>{eur(total)}</b></div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Retrait</label>
        <div className="seg">
          <button className={retrait === 'relais' ? 'on' : ''} onClick={() => setRetrait('relais')}>Point relais</button>
          <button className={retrait === 'main_propre' ? 'on' : ''} onClick={() => setRetrait('main_propre')}>Main propre</button>
        </div>
      </div>

      <button className="btn btn-p" onClick={valider} disabled={envoi}>
        {envoi ? 'Validation…' : `Valider ma commande — ${eur(total)}`}
      </button>
      <p className="tiny center" style={{ marginTop: 11 }}>
        Le vendeur n'est payé qu'après votre confirmation de retrait.
        Le paiement en ligne (Stripe) n'est pas encore branché : réglez sur place.
      </p>
    </div>
  );
}
