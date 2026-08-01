'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { SEUIL_OUVERTURE } from '@/lib/utils';
import type { Secteur } from '@/lib/types';

const Carte = dynamic(() => import('@/components/Carte'), {
  ssr: false,
  loading: () => <div className="map small" style={{ display: 'grid', placeItems: 'center' }}><div className="spin" /></div>,
});

export default function ListeAttente({
  secteur, profilId,
}: { secteur: Secteur; profilId: string }) {
  const [total, setTotal] = useState(secteur.membres + secteur.attente);
  const [inscrit, setInscrit] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const toast = useToast();

  const reste = Math.max(0, SEUIL_OUVERTURE - total);
  const pct = Math.min(100, (total / SEUIL_OUVERTURE) * 100);

  async function sInscrire() {
    setEnvoi(true);
    const sb = creerClient();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('liste_attente').insert({
      secteur: secteur.code_insee,
      email: user?.email ?? '',
      profil_id: profilId,
    });
    setEnvoi(false);
    if (error && !error.message.includes('duplicate')) {
      toast("Inscription impossible, réessayez.");
      return;
    }
    setInscrit(true);
    setTotal((t) => t + 1);
    toast('Vous êtes sur la liste. On vous préviendra.');
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>{secteur.nom} n'est pas encore ouvert.</h1>
        <p>Il manque {reste} voisin{reste > 1 ? 's' : ''} pour que les échanges démarrent.</p>
      </div>

      <div className="gauge wait">
        <div className="gauge-top">
          <span>Secteur en germination</span>
          <b>{total} / {SEUIL_OUVERTURE} voisins</b>
        </div>
        <div className="gauge-bar"><i style={{ width: `${pct}%` }} /></div>
        <p>
          Ouvrir un secteur vide n'aiderait personne : vous ne trouveriez rien à acheter
          et vos annonces ne toucheraient personne. On attend d'être assez nombreux
          pour que ça vaille le déplacement.
        </p>
      </div>

      <div style={{ height: 14 }} />
      <Carte lat={secteur.lat} lon={secteur.lon} nom={secteur.nom} petite />

      {inscrit ? (
        <div className="card" style={{ marginTop: 14, borderColor: 'var(--leaf-line)', background: 'var(--leaf-soft)' }}>
          <h3>Vous êtes sur la liste</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            Nous vous préviendrons dès l'ouverture. Chaque voisin que vous invitez rapproche la date.
          </p>
        </div>
      ) : (
        <button className="btn btn-p" style={{ marginTop: 14 }} onClick={sInscrire} disabled={envoi}>
          {envoi ? 'Inscription…' : "M'inscrire sur la liste d'attente"}
        </button>
      )}
    </div>
  );
}
