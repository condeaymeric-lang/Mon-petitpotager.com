'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

export default function BoutonRetirer({ id }: { id: string }) {
  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function retirer() {
    setEnvoi(true);
    const { error } = await creerClient().from('annonces').update({ statut: 'retire' }).eq('id', id);
    setEnvoi(false);
    if (error) { toast('Retrait impossible.'); return; }
    toast('Annonce retirée');
    router.refresh();
  }

  if (!confirme) {
    return (
      <button className="btn btn-d btn-sm" style={{ flex: 1 }} onClick={() => setConfirme(true)}>
        Retirer
      </button>
    );
  }
  return (
    <>
      <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setConfirme(false)}>Annuler</button>
      <button className="btn btn-d btn-sm" style={{ flex: 1 }} onClick={retirer} disabled={envoi}>
        {envoi ? '…' : 'Confirmer'}
      </button>
    </>
  );
}
