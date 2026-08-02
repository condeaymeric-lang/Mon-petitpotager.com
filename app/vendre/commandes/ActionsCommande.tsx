'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

export default function ActionsCommande({
  lignesIds, prepare, depose,
}: { lignesIds: string[]; prepare: boolean; depose: boolean }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function marquer(champs: Record<string, boolean>, message: string) {
    setEnvoi(true); setErreur('');
    const { error } = await creerClient()
      .from('lignes_commande').update(champs).in('id', lignesIds);
    setEnvoi(false);
    if (error) {
      setErreur("La commande n'a pas pu être mise à jour. Réessayez.");
      return;
    }
    toast(message);
    router.refresh();
  }

  if (depose) {
    return (
      <p className="tiny" style={{ marginTop: 10 }}>
        Déposée. L&apos;acheteur confirmera le retrait, ce qui déclenchera votre versement.
      </p>
    );
  }

  return (
    <>
      <div className="row-btn" style={{ marginTop: 14 }}>
        {!prepare ? (
          <button className="btn btn-p btn-sm" style={{ flex: 1 }} disabled={envoi}
            onClick={() => marquer({ prepare: true }, 'Commande marquée préparée')}>
            {envoi ? '…' : 'Marquer préparée'}
          </button>
        ) : (
          <>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} disabled={envoi}
              onClick={() => marquer({ prepare: false }, 'Retour à préparer')}>
              Annuler
            </button>
            <button className="btn btn-p btn-sm" style={{ flex: 1 }} disabled={envoi}
              onClick={() => marquer({ depose: true }, 'Commande marquée déposée')}>
              {envoi ? '…' : 'Marquer déposée'}
            </button>
          </>
        )}
      </div>
      {erreur && <p className="errmsg" style={{ marginTop: 8 }} role="alert">{erreur}</p>}
    </>
  );
}
