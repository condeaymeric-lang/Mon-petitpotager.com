'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

export interface Attente {
  genre: 'compte' | 'organisation';
  id: string;
  profil_id: string;
  prenom: string;
  email: string;
  detail: string;
  secteur: string | null;
  created_at: string;
}

const jour = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * File des inscriptions et des demandes de statut d'organisation.
 *
 * Rien n'est actif tant que la modération n'a pas tranché : une
 * inscription en attente peut regarder le site, pas y publier.
 */
export default function FileAttente({ file }: { file: Attente[] }) {
  const [cible, setCible] = useState<{ a: Attente; accepte: boolean } | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function repondre() {
    if (!cible) return;
    if (!cible.accepte && motif.trim().length < 3) {
      setErreur('Un motif de refus est obligatoire.');
      return;
    }
    setErreur(''); setEnvoi(true);
    const sb = creerClient();

    const { error } = cible.a.genre === 'compte'
      ? await sb.rpc('valider_compte', {
          p_profil: cible.a.profil_id, p_accepte: cible.accepte,
          p_motif: motif.trim() || null,
        })
      : await sb.rpc('repondre_demande_organisation', {
          p_demande: cible.a.id, p_accepte: cible.accepte,
          p_motif: motif.trim() || null,
        });

    if (error) {
      setEnvoi(false);
      setErreur("L'action n'a pas abouti. Réessayez.");
      return;
    }

    // Prévenir la personne par courriel, sans bloquer sur l'échec :
    // la décision est prise, elle est déjà visible dans ses messages.
    try {
      await fetch('/api/courriel-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profilId: cible.a.profil_id, genre: cible.a.genre,
          accepte: cible.accepte, motif: motif.trim() || null,
        }),
      });
    } catch { /* consigné côté serveur */ }

    setEnvoi(false);
    toast(cible.accepte ? 'Accepté' : 'Refusé');
    setCible(null); setMotif('');
    router.refresh();
  }

  return (
    <section className="bloc" aria-labelledby="t-file">
      <div className="bloc-head">
        <h2 id="t-file">
          En attente{file.length > 0 && ` (${file.length})`}
        </h2>
      </div>

      {cible && (
        <div className="card" role="dialog" aria-label="Confirmer la décision">
          <h3>
            {cible.accepte ? 'Accepter' : 'Refuser'}
            {' : '}{cible.a.prenom}
          </h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            {cible.a.genre === 'compte'
              ? (cible.accepte
                  ? 'Le compte pourra publier, acheter et vendre.'
                  : "Le compte restera en lecture seule. Le motif lui sera communiqué.")
              : (cible.accepte
                  ? "La structure sera marquée vérifiée et pourra publier des informations officielles."
                  : 'La demande sera refusée. Le motif lui sera communiqué.')}
          </p>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="mot-dec">
              Motif {cible.accepte ? '(facultatif)' : '(obligatoire)'}
            </label>
            <input className="inp" id="mot-dec" value={motif} maxLength={200} autoFocus
              placeholder={cible.accepte
                ? 'Vérification faite par téléphone'
                : "Adresse de courriel non officielle"}
              onChange={(e) => setMotif(e.target.value)} />
          </div>
          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <div className="row-btn">
            <button className="btn btn-s" style={{ flex: 1 }} disabled={envoi}
              onClick={() => { setCible(null); setMotif(''); setErreur(''); }}>
              Annuler
            </button>
            <button className={`btn ${cible.accepte ? 'btn-p' : 'btn-d'}`} style={{ flex: 1 }}
              onClick={repondre} disabled={envoi}>
              {envoi ? 'Envoi…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      {file.length > 0 ? file.map((a) => (
        <div className="card mod-item" key={`${a.genre}-${a.id}`}>
          <div className="line" style={{ border: 0, padding: 0 }}>
            <div className="line-b">
              <h4>
                <Link href={`/membre/${a.profil_id}`}>{a.prenom}</Link>
                <span className={`badge ${a.genre === 'organisation' ? 'b-pro' : 'b-am'}`}
                  style={{ marginLeft: 7 }}>
                  {a.genre === 'organisation' ? 'Demande de structure' : 'Inscription'}
                </span>
              </h4>
              <p>
                {a.detail}
                {a.secteur ? ` · ${a.secteur}` : ''} · {jour(a.created_at)}
              </p>
              <p className="tiny" style={{ marginTop: 4 }}>
                <a href={`mailto:${a.email}`} className="lien-membre">{a.email}</a>
              </p>
            </div>
          </div>
          <div className="mod-actions">
            <button className="btn btn-p btn-sm" onClick={() => setCible({ a, accepte: true })}>
              Accepter
            </button>
            <button className="btn btn-d btn-sm" onClick={() => setCible({ a, accepte: false })}>
              Refuser
            </button>
          </div>
        </div>
      )) : (
        <div className="card">
          <p className="muted">Rien en attente. Toutes les inscriptions sont traitées.</p>
        </div>
      )}
    </section>
  );
}
