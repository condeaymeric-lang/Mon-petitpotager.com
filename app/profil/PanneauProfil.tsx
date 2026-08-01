'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { SEUIL_OUVERTURE } from '@/lib/utils';
import type { Profil, Secteur } from '@/lib/types';

const Carte = dynamic(() => import('@/components/Carte'), {
  ssr: false,
  loading: () => <div className="map small" style={{ display: 'grid', placeItems: 'center' }}><div className="spin" /></div>,
});

export default function PanneauProfil({
  profil, secteur,
}: { profil: Profil; secteur: Secteur | null }) {
  const [rayon, setRayon] = useState(profil.rayon_km);
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function enregistrer() {
    setEnvoi(true);
    const { error } = await creerClient().from('profils').update({ rayon_km: rayon }).eq('id', profil.id);
    setEnvoi(false);
    if (error) { toast('Enregistrement impossible.'); return; }
    toast('Rayon mis à jour');
    router.refresh();
  }

  async function deconnexion() {
    await creerClient().auth.signOut();
    router.push('/connexion');
    router.refresh();
  }

  const total = (secteur?.membres ?? 0) + (secteur?.attente ?? 0);

  return (
    <>
      <div className="card">
        <h3>Mon secteur</h3>
        {secteur ? (<>
          <p className="muted" style={{ marginTop: 6 }}>
            {secteur.nom} — {rayon} km.{' '}
            {secteur.ouvert ? 'Secteur ouvert.' : `En attente d'ouverture (${total}/${SEUIL_OUVERTURE}).`}
          </p>
          <div style={{ marginTop: 14 }}>
            <Carte lat={secteur.lat} lon={secteur.lon} nom={secteur.nom} rayonKm={rayon} petite />
          </div>
          <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
            <label htmlFor="ray">Rayon de recherche : {rayon} km</label>
            <input type="range" id="ray" min={5} max={50} step={5} value={rayon}
              style={{ accentColor: '#6FA83A' }} onChange={(e) => setRayon(+e.target.value)} />
          </div>
          {rayon !== profil.rayon_km && (
            <button className="btn btn-p btn-sm" style={{ marginTop: 12, width: '100%' }}
              onClick={enregistrer} disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
        </>) : (
          <p className="muted" style={{ marginTop: 6 }}>Aucun secteur défini.</p>
        )}
      </div>

      <button className="btn btn-d" style={{ marginTop: 14 }} onClick={deconnexion}>
        Se déconnecter
      </button>
    </>
  );
}
