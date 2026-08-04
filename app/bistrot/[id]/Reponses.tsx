'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { quandCourt } from '@/components/CarteSujet';

export interface Reponse {
  id: string; texte: string; photos: string[] | null; created_at: string;
  auteur_id: string; auteur_prenom: string; auteur_avatar: string | null;
  auteur_role: string;
}

/** Le fil des réponses à un sujet du bistrot. */
export default function Reponses({
  sujetId, reponses, ferme, connecte, profilId, valide, moderateur,
}: {
  sujetId: string; reponses: Reponse[]; ferme: boolean; connecte: boolean;
  profilId: string | null; valide: boolean; moderateur: boolean;
}) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function repondre() {
    if (texte.trim().length < 1) { setErreur('Écrivez votre réponse.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().from('reponses_sujet').insert({
      sujet_id: sujetId, auteur_id: profilId, texte: texte.trim(),
    });
    setEnvoi(false);
    if (error) { setErreur("Votre réponse n'a pas pu être enregistrée."); return; }
    setTexte('');
    toast('Réponse publiée');
    router.refresh();
  }

  async function supprimer(r: Reponse) {
    const { error } = await creerClient().from('reponses_sujet').delete().eq('id', r.id);
    if (error) { toast('Suppression impossible.'); return; }
    toast('Réponse retirée');
    router.refresh();
  }

  return (
    <section className="bloc" aria-labelledby="t-rep">
      <div className="bloc-head">
        <h2 id="t-rep">
          {reponses.length > 0
            ? `${reponses.length} réponse${reponses.length > 1 ? 's' : ''}`
            : 'Aucune réponse'}
        </h2>
      </div>

      {reponses.map((r) => (
        <div className="card pub-evt" key={r.id}>
          <div className="pub-evt-tete">
            <Link href={`/membre/${r.auteur_id}`} className="pub-evt-auteur">
              {r.auteur_avatar
                ? <img src={r.auteur_avatar} alt="" loading="lazy" className="clst-photo" />
                : <span className="clst-photo clst-photo-vide">
                    {r.auteur_prenom?.[0]?.toUpperCase()}
                  </span>}
              <span>
                <b>{r.auteur_prenom}</b>
                <span className="tiny">
                  {r.auteur_role === 'pro' ? 'Producteur · ' : ''}{quandCourt(r.created_at)}
                </span>
              </span>
            </Link>
            {(r.auteur_id === profilId || moderateur) && (
              <button className="btn-x" onClick={() => supprimer(r)}
                aria-label={`Supprimer la réponse de ${r.auteur_prenom}`}>×</button>
            )}
          </div>
          <p className="pub-evt-txt">{r.texte}</p>
        </div>
      ))}

      {ferme ? (
        <div className="card">
          <p className="muted">Cette discussion est close. On n&apos;y répond plus.</p>
        </div>
      ) : !connecte ? (
        <div className="card">
          <p className="muted">Créez un compte pour prendre part à la discussion.</p>
          <Link className="btn btn-p" href="/inscription" style={{ marginTop: 14 }}>
            Créer un compte
          </Link>
        </div>
      ) : !valide ? (
        <div className="card">
          <p className="muted">
            Votre compte doit être validé avant de pouvoir répondre. Vous serez
            prévenu par courriel dès qu&apos;il le sera.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="rep">Votre réponse</label>
            <textarea className="inp" id="rep" rows={4} maxLength={3000} value={texte}
              placeholder="Votre avis, votre expérience, un conseil…"
              onChange={(e) => setTexte(e.target.value)} />
          </div>
          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <button className="btn btn-p" onClick={repondre} disabled={envoi}>
            {envoi ? 'Publication…' : 'Répondre'}
          </button>
        </div>
      )}
    </section>
  );
}
