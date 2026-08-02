'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

const ETAPES = [
  { cle: 'confirmee', t: 'Commande confirmée', d: 'Les vendeurs ont été prévenus.' },
  { cle: 'en_preparation', t: 'En préparation', d: 'Les vendeurs préparent vos produits.' },
  { cle: 'deposee', t: 'Prête au retrait', d: 'Votre panier vous attend.' },
  { cle: 'retiree', t: 'Retirée', d: 'Le vendeur est payé.' },
];

export default function SuiviCommande({
  commandeId, statut,
}: { commandeId: string; statut: string }) {
  const [etat, setEtat] = useState(statut);
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const index = ETAPES.findIndex((e) => e.cle === etat);

  async function confirmerRetrait() {
    setEnvoi(true);
    const sb = creerClient();

    const { error } = await sb.from('commandes')
      .update({ statut: 'retiree', retire_le: new Date().toISOString() })
      .eq('id', commandeId);
    setEnvoi(false);
    if (error) { toast('Mise à jour impossible.'); return; }

    // Les points de l'achat sont attribués ici, côté base : l'acheteur
    // pour sa commande, l'hôte du point relais pour le service rendu.
    const { data: gain } = await sb.rpc('crediter_retrait', { p_commande: commandeId });
    // Le versement au vendeur n'a lieu qu'ici, après confirmation.
    await sb.from('lignes_commande')
      .update({ verse: true, verse_le: new Date().toISOString() })
      .eq('commande_id', commandeId);

    // Prévenir l'acheteur et les vendeurs par courriel. L'échec de
    // l'envoi ne doit pas remettre en cause le retrait déjà confirmé.
    let courriels = 0;
    try {
      const r = await fetch('/api/retrait-confirme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandeId }),
      });
      if (r.ok) courriels = (await r.json()).envoyes ?? 0;
    } catch {
      // Rien à faire ici : le message reste consigné côté serveur.
    }

    setEtat('retiree');
    toast([
      'Retrait confirmé',
      gain && gain > 0 ? `+${gain} points` : null,
      courriels > 0 ? `${courriels} courriel${courriels > 1 ? 's' : ''} envoyé${courriels > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · '));
    router.refresh();
  }

  return (
    <div className="card">
      <h3>Suivi</h3>
      <div className="track">
        {ETAPES.map((e, i) => (
          <div className={`tstep${i <= index ? ' done' : ''}`} key={e.cle}>
            <i />
            <div><b>{e.t}</b><span>{e.d}</span></div>
          </div>
        ))}
      </div>
      {etat === 'deposee' && (
        <>
          <button className="btn btn-g" style={{ marginTop: 16 }}
            onClick={confirmerRetrait} disabled={envoi}>
            {envoi ? 'Enregistrement…' : "Je confirme avoir retiré ma commande"}
          </button>
          <p className="tiny center" style={{ marginTop: 9 }}>
            Le vendeur ne sera payé qu'à votre confirmation.
          </p>
        </>
      )}

      {(etat === 'confirmee' || etat === 'en_preparation') && (
        <p className="tiny center" style={{ marginTop: 14 }}>
          Vous pourrez confirmer le retrait dès que le vendeur aura déposé votre panier.
        </p>
      )}
    </div>
  );
}
