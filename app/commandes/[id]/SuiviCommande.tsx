'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

const ETAPES = [
  { cle: 'confirmee', t: 'Commande confirmée', d: 'Les vendeurs ont été prévenus.' },
  { cle: 'en_preparation', t: 'En préparation', d: 'Vos produits sont préparés.' },
  { cle: 'deposee', t: 'Déposée au relais', d: 'Votre panier vous attend.' },
  { cle: 'retiree', t: 'Retirée', d: 'Le vendeur est payé. Merci !' },
];

export default function SuiviCommande({
  commandeId, statut,
}: { commandeId: string; statut: string }) {
  const [etat, setEtat] = useState(statut);
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const index = ETAPES.findIndex((e) => e.cle === etat);

  async function avancer() {
    const suivant = ETAPES[index + 1];
    if (!suivant) return;
    setEnvoi(true);
    const sb = creerClient();
    const maj: Record<string, unknown> = { statut: suivant.cle };
    if (suivant.cle === 'retiree') maj.retire_le = new Date().toISOString();

    const { error } = await sb.from('commandes').update(maj).eq('id', commandeId);
    setEnvoi(false);
    if (error) { toast('Mise à jour impossible.'); return; }

    if (suivant.cle === 'retiree') {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.rpc('ajouter_points', {
          p_profil: user.id, p_montant: 5,
          p_motif: 'Retrait confirmé', p_commande: commandeId,
        });
      }
      // Marquer les lignes comme versées au vendeur
      await sb.from('lignes_commande')
        .update({ verse: true, verse_le: new Date().toISOString() })
        .eq('commande_id', commandeId);
    }

    setEtat(suivant.cle);
    toast(suivant.t);
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
      {index >= 0 && index < ETAPES.length - 1 && (
        <>
          <button className="btn btn-g" style={{ marginTop: 16 }} onClick={avancer} disabled={envoi}>
            {ETAPES[index + 1].cle === 'retiree'
              ? "Je confirme avoir retiré ma commande"
              : `Passer à : ${ETAPES[index + 1].t}`}
          </button>
          <p className="tiny center" style={{ marginTop: 9 }}>
            Le vendeur ne sera payé qu'à votre confirmation.
          </p>
        </>
      )}
    </div>
  );
}
