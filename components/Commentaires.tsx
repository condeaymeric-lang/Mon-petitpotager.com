'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

export interface Commentaire {
  id: string;
  parent_id: string | null;
  texte: string;
  masque: boolean;
  masque_motif: string | null;
  created_at: string;
  auteur_id: string;
  auteur_prenom: string;
  auteur_avatar: string | null;
  auteur_role: string;
  est_proprietaire: boolean;
}

function quand(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  const j = Math.round(min / 1440);
  if (j < 7) return `il y a ${j} jour${j > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/**
 * Fil de commentaires sous une annonce, un événement ou une information.
 *
 * L'auteur de la chose commentée et la modération peuvent masquer ou
 * supprimer, et répondre. Masquer conserve la trace du message : une
 * réponse à un message disparu devient incompréhensible.
 */
export default function Commentaires({
  cibleType, cibleId, commentaires, connecte, profilId, valide, moderateur, proprietaire,
  titre = 'Commentaires',
}: {
  cibleType: 'annonce' | 'evenement' | 'information';
  cibleId: string;
  commentaires: Commentaire[];
  connecte: boolean;
  profilId: string | null;
  valide: boolean;
  moderateur: boolean;
  proprietaire: boolean;
  titre?: string;
}) {
  const [texte, setTexte] = useState('');
  const [repondA, setRepondA] = useState<Commentaire | null>(null);
  const [aMasquer, setAMasquer] = useState<Commentaire | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  const racines = commentaires.filter((c) => !c.parent_id);
  const reponsesDe = (id: string) => commentaires.filter((c) => c.parent_id === id);
  const visibles = commentaires.filter((c) => !c.masque).length;

  async function publier() {
    if (texte.trim().length < 1) { setErreur('Écrivez votre commentaire.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().from('commentaires').insert({
      cible_type: cibleType, cible_id: cibleId, auteur_id: profilId,
      parent_id: repondA?.id ?? null, texte: texte.trim(),
    });
    setEnvoi(false);
    if (error) {
      setErreur(error.message?.includes('row-level')
        ? 'Votre compte doit être validé pour commenter.'
        : "Votre commentaire n'a pas pu être enregistré.");
      return;
    }
    setTexte(''); setRepondA(null);
    toast('Commentaire publié');
    router.refresh();
  }

  async function masquer() {
    if (!aMasquer) return;
    const remettre = aMasquer.masque;
    if (!remettre && motif.trim().length < 3) { setErreur('Indiquez un motif.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().rpc('masquer_commentaire', {
      p_commentaire: aMasquer.id, p_masque: !remettre,
      p_motif: remettre ? null : motif.trim(),
    });
    setEnvoi(false);
    if (error) { setErreur("L'action n'a pas abouti."); return; }
    toast(remettre ? 'Commentaire rétabli' : 'Commentaire masqué');
    setAMasquer(null); setMotif('');
    router.refresh();
  }

  async function supprimer(c: Commentaire) {
    const { error } = await creerClient().from('commentaires').delete().eq('id', c.id);
    if (error) { toast('Suppression impossible.'); return; }
    toast('Commentaire supprimé');
    router.refresh();
  }

  function ligne(c: Commentaire, estReponse = false) {
    const mien = c.auteur_id === profilId;
    const peutModerer = moderateur || proprietaire;

    return (
      <div className={`comm${estReponse ? ' comm-rep' : ''}`} key={c.id}>
        <div className="comm-tete">
          <Link href={`/membre/${c.auteur_id}`} className="comm-auteur">
            {c.auteur_avatar
              ? <img src={c.auteur_avatar} alt="" loading="lazy" className="clst-photo" />
              : <span className="clst-photo clst-photo-vide">
                  {c.auteur_prenom?.[0]?.toUpperCase()}
                </span>}
            <span>
              <b>
                {c.auteur_prenom}
                {c.est_proprietaire && <span className="badge b-pro">Auteur</span>}
              </b>
              <span className="tiny">{quand(c.created_at)}</span>
            </span>
          </Link>
        </div>

        {c.masque ? (
          <p className="comm-masque">
            Commentaire masqué{c.masque_motif ? ` : ${c.masque_motif}` : ''}.
          </p>
        ) : (
          <p className="comm-txt">{c.texte}</p>
        )}

        <div className="comm-actions">
          {connecte && valide && !c.masque && !estReponse && (
            <button onClick={() => { setRepondA(c); setTexte(''); }}>Répondre</button>
          )}
          {peutModerer && (
            <button onClick={() => { setAMasquer(c); setMotif(''); setErreur(''); }}>
              {c.masque ? 'Rétablir' : 'Masquer'}
            </button>
          )}
          {(mien || peutModerer) && (
            <button className="comm-suppr" onClick={() => supprimer(c)}>Supprimer</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="bloc" aria-labelledby={`comm-${cibleId}`}>
      <div className="bloc-head">
        <h2 id={`comm-${cibleId}`}>
          {titre}{visibles > 0 && ` (${visibles})`}
        </h2>
      </div>

      {aMasquer && (
        <div className="card" role="dialog" aria-label="Masquer le commentaire">
          <h3>{aMasquer.masque ? 'Rétablir ce commentaire' : 'Masquer ce commentaire'}</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            {aMasquer.masque
              ? 'Il redeviendra lisible par tout le monde.'
              : "Le texte sera remplacé par une mention, avec le motif. Le fil garde sa trace pour que les réponses restent compréhensibles."}
          </p>
          {!aMasquer.masque && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="mot-comm">Motif</label>
              <input className="inp" id="mot-comm" value={motif} maxLength={160} autoFocus
                placeholder="Propos déplacés" onChange={(e) => setMotif(e.target.value)} />
            </div>
          )}
          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <div className="row-btn">
            <button className="btn btn-s" style={{ flex: 1 }} disabled={envoi}
              onClick={() => { setAMasquer(null); setMotif(''); setErreur(''); }}>
              Annuler
            </button>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={masquer} disabled={envoi}>
              {envoi ? 'Application…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      {racines.length > 0 ? (
        <div className="comms">
          {racines.map((c) => (
            <div className="card comm-bloc" key={c.id}>
              {ligne(c)}
              {reponsesDe(c.id).map((r) => ligne(r, true))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="muted">
            Aucun commentaire. Une question, un retour, un encouragement :
            c&apos;est ici.
          </p>
        </div>
      )}

      {!connecte ? (
        <div className="card">
          <p className="muted">Créez un compte pour participer à la discussion.</p>
          <Link className="btn btn-p" href="/inscription" style={{ marginTop: 14 }}>
            Créer un compte
          </Link>
        </div>
      ) : !valide ? (
        <div className="card">
          <p className="muted">
            Votre compte doit être validé avant de pouvoir commenter.
          </p>
        </div>
      ) : (
        <div className="card">
          {repondA && (
            <p className="tiny" style={{ marginBottom: 8 }}>
              En réponse à {repondA.auteur_prenom}.{' '}
              <button className="lien-membre" onClick={() => setRepondA(null)}>Annuler</button>
            </p>
          )}
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor={`nc-${cibleId}`} className="sr-only">Votre commentaire</label>
            <textarea className="inp" id={`nc-${cibleId}`} rows={3} maxLength={2000} value={texte}
              placeholder={repondA ? `Répondre à ${repondA.auteur_prenom}…` : 'Votre commentaire'}
              onChange={(e) => setTexte(e.target.value)} />
          </div>
          {erreur && !aMasquer && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <button className="btn btn-p" onClick={publier} disabled={envoi}>
            {envoi ? 'Publication…' : repondA ? 'Répondre' : 'Commenter'}
          </button>
        </div>
      )}
    </section>
  );
}
