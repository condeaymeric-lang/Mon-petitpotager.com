'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import type { Profil } from '@/lib/types';

/** Vérifications qu'un membre ne peut pas s'accorder lui-même. */
export default function Statuts({ profil }: { profil: Profil }) {
  const [pro, setPro] = useState(!!profil.pro_verifie);
  const [org, setOrg] = useState(!!profil.organisation_verifiee);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  const change = pro !== !!profil.pro_verifie || org !== !!profil.organisation_verifiee;

  async function appliquer() {
    if (motif.trim().length < 3) { setErreur('Indiquez un motif.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().rpc('moderer_statuts_profil', {
      p_profil: profil.id, p_pro_verifie: pro,
      p_organisation_verifiee: org, p_motif: motif.trim(),
    });
    setEnvoi(false);
    if (error) { setErreur("La modification n'a pas abouti."); return; }
    toast('Statuts mis à jour');
    setMotif('');
    router.refresh();
  }

  return (
    <div className="card">
      <h3>Vérifications</h3>

      <label className="case">
        <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
        Producteur professionnel vérifié
      </label>

      {profil.organisation && (
        <label className="case">
          <input type="checkbox" checked={org} onChange={(e) => setOrg(e.target.checked)} />
          Structure vérifiée ({profil.organisation_nom ?? profil.organisation})
        </label>
      )}

      {change && (
        <>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="mot-st">Motif</label>
            <input className="inp" id="mot-st" value={motif} maxLength={200} autoFocus
              placeholder="SIRET vérifié au répertoire Sirene"
              onChange={(e) => setMotif(e.target.value)} />
            <p className="help">Consigné au journal de modération.</p>
          </div>
          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <button className="btn btn-p" onClick={appliquer} disabled={envoi}>
            {envoi ? 'Application…' : 'Enregistrer les vérifications'}
          </button>
        </>
      )}
    </div>
  );
}
