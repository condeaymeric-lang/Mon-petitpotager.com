'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

/**
 * Ouvre la discussion avec un membre, à propos d'une annonce ou non.
 * La conversation existante est réutilisée : deux personnes qui
 * s'écrivent sur la même annonce restent dans le même fil.
 */
export default function BoutonEcrire({
  destinataireId, annonceId, libelle = 'Écrire au vendeur', variante = 'btn-s',
}: {
  destinataireId: string; annonceId?: string;
  libelle?: string; variante?: string;
}) {
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function ouvrir() {
    setEnvoi(true);
    const { data, error } = await creerClient().rpc('ouvrir_conversation', {
      p_destinataire: destinataireId, p_annonce: annonceId ?? null,
    });
    setEnvoi(false);
    if (error || !data) {
      toast(error?.message?.includes('rayon')
        ? 'Ce membre est hors de votre rayon.'
        : "La discussion n'a pas pu être ouverte.");
      return;
    }
    router.push(annonceId ? `/messages/${data}?annonce=${annonceId}` : `/messages/${data}`);
  }

  return (
    <button className={`btn ${variante}`} onClick={ouvrir} disabled={envoi}>
      {envoi ? 'Ouverture…' : libelle}
    </button>
  );
}
