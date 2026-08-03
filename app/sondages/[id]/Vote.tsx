'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

export interface Votant {
  option_id: string; profil_id: string; prenom: string;
  avatar_url: string | null; role: string;
}

export interface Resultat {
  option_id: string;
  libelle: string;
  rang: number;
  voix: number;
  mon_choix: boolean;
}

/**
 * Vote et résultats en direct.
 *
 * Les totaux sont relus toutes les quinze secondes tant que la page est
 * ouverte : c'est suffisant pour voir un sondage bouger, sans
 * interroger la base en continu.
 */
export default function Vote({
  sondageId, resultats: initiaux, votants: votantsInitiaux, anonyme,
  multiple, clos, connecte,
}: {
  sondageId: string; resultats: Resultat[]; votants: Votant[];
  anonyme: boolean; multiple: boolean; clos: boolean; connecte: boolean;
}) {
  const [resultats, setResultats] = useState(initiaux);
  const [votants, setVotants] = useState(votantsInitiaux);
  const [choix, setChoix] = useState<string[]>(
    initiaux.filter((r) => r.mon_choix).map((r) => r.option_id)
  );
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  const aVote = initiaux.some((r) => r.mon_choix);
  const total = resultats.reduce((a, r) => a + r.voix, 0);

  const relire = useCallback(async () => {
    const sb = creerClient();
    const [r, v] = await Promise.all([
      sb.rpc('resultats_sondage', { p_sondage: sondageId }),
      anonyme ? Promise.resolve({ data: [] }) : sb.rpc('votants_sondage', { p_sondage: sondageId }),
    ]);
    if (r.data) setResultats(r.data as Resultat[]);
    if (v.data) setVotants(v.data as Votant[]);
  }, [sondageId, anonyme]);

  useEffect(() => {
    const t = setInterval(relire, 15000);
    return () => clearInterval(t);
  }, [relire]);

  function basculer(id: string) {
    setChoix((c) => (multiple
      ? (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])
      : [id]));
  }

  async function voter() {
    if (choix.length === 0) { setErreur('Choisissez une réponse.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().rpc('voter_sondage', {
      p_sondage: sondageId, p_options: choix,
    });
    setEnvoi(false);
    if (error) {
      setErreur(error.message?.includes('clos')
        ? 'Ce sondage est clos.'
        : "Votre vote n'a pas pu être enregistré.");
      return;
    }
    await relire();
    toast(aVote ? 'Vote modifié' : 'Vote enregistré');
    router.refresh();
  }

  return (
    <div className="card">
      <h3>{clos ? 'Résultats' : aVote ? 'Votre réponse' : 'Votre avis'}</h3>

      <div className="sond" style={{ marginTop: 12 }} role="group"
        aria-label="Réponses possibles">
        {resultats.map((r) => {
          const pct = total > 0 ? Math.round((r.voix / total) * 100) : 0;
          const choisi = choix.includes(r.option_id);
          const figé = clos || !connecte;
          return (
            <button key={r.option_id} type="button" disabled={figé}
              className={`sond-o${choisi ? ' on' : ''}`}
              aria-pressed={choisi}
              onClick={() => basculer(r.option_id)}>
              <span className="sond-jauge" style={{ width: `${pct}%` }} aria-hidden="true" />
              <span className="sond-l">
                {!figé && (
                  <span className={`sond-case${multiple ? ' carre' : ''}`} aria-hidden="true" />
                )}
                {r.libelle}
              </span>
              <b className="sond-n">
                {pct} %<span className="tiny"> · {r.voix}</span>
              </b>
            </button>
          );
        })}
      </div>

      {!anonyme && votants.length > 0 && (
        <div className="votants">
          {resultats.map((r) => {
            const siens = votants.filter((v) => v.option_id === r.option_id);
            if (siens.length === 0) return null;
            return (
              <div className="votants-l" key={r.option_id}>
                <p className="tiny"><b>{r.libelle}</b></p>
                <div className="votants-g">
                  {siens.map((v) => (
                    <Link key={v.profil_id} href={`/membre/${v.profil_id}`} className="votant">
                      {v.avatar_url
                        ? <img src={v.avatar_url} alt="" loading="lazy" />
                        : <span className="votant-vide">{v.prenom?.[0]?.toUpperCase()}</span>}
                      {v.prenom}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="tiny" style={{ marginTop: 12 }} aria-live="polite">
        {total} vote{total > 1 ? 's' : ''} au total.
        {anonyme
          ? ' Les votes sont anonymes.'
          : ' Ce sondage est à main levée : votre choix est visible des autres.'}
        {multiple && ' Plusieurs réponses possibles.'}
        {clos && ' Ce sondage est clos.'}
      </p>

      {erreur && <p className="errmsg" style={{ marginTop: 10 }}>{erreur}</p>}

      {!clos && connecte && (
        <button className="btn btn-p" onClick={voter} disabled={envoi} style={{ marginTop: 12 }}>
          {envoi ? 'Envoi…' : aVote ? 'Modifier mon vote' : 'Voter'}
        </button>
      )}
      {!clos && !connecte && (
        <p className="tiny" style={{ marginTop: 12 }}>
          Il faut un compte pour voter. Les résultats, eux, sont visibles de tous.
        </p>
      )}
    </div>
  );
}
