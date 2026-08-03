'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { eur } from '@/lib/utils';

export interface MessagePrive {
  id: string;
  auteur_id: string;
  texte: string;
  prix_propose: number | null;
  remis_le: string | null;
  lu_le: string | null;
  created_at: string;
}

const SUGGESTIONS = [
  'Bonjour, est-ce encore disponible ?',
  'Bonjour, à quelle heure puis-je passer le retirer ?',
  'Bonjour, seriez-vous d’accord pour un autre prix ?',
];

function heure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function jour(iso: string) {
  const d = new Date(iso);
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? "Aujourd'hui"
    : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Un fil de discussion.
 *
 * Les messages sont relus toutes les vingt secondes pendant que la page
 * est ouverte : c'est une messagerie de voisinage, pas une messagerie
 * instantanée, et interroger la base sans arrêt coûterait plus que
 * cela ne rapporte.
 */
export default function Fil({
  conversationId, messages: initiaux, moiId, autrePrenom, prixAnnonce,
}: {
  conversationId: string; messages: MessagePrive[]; moiId: string;
  autrePrenom: string; prixAnnonce: number | null;
}) {
  const [messages, setMessages] = useState(initiaux);
  const [texte, setTexte] = useState('');
  const [prix, setPrix] = useState('');
  const [proposePrix, setProposePrix] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const bas = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  useEffect(() => {
    const sb = creerClient();
    const t = setInterval(async () => {
      const { data } = await sb.from('messages_prives')
        .select('id, auteur_id, texte, prix_propose, remis_le, lu_le, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at');
      if (!data) return;
      // On rafraîchit aussi quand seuls les accusés ont changé : c'est
      // ce qui fait passer « remis » à « lu » sous l'œil de l'expéditeur.
      const change = data.length !== messages.length
        || JSON.stringify(data.map((m: any) => [m.remis_le, m.lu_le]))
           !== JSON.stringify(messages.map((m) => [m.remis_le, m.lu_le]));
      if (change) {
        setMessages(data as MessagePrive[]);
        await sb.rpc('marquer_lus', { p_conversation: conversationId });
      }
    }, 20000);
    return () => clearInterval(t);
  }, [conversationId, messages.length]);

  async function envoyer() {
    const t = texte.trim();
    const p = prix.trim() ? parseFloat(prix.replace(',', '.')) : null;
    if (!t) { setErreur('Écrivez votre message.'); return; }
    if (proposePrix && !(p !== null && p >= 0)) { setErreur('Indiquez un prix valable.'); return; }
    setErreur(''); setEnvoi(true);

    const sb = creerClient();
    const { data, error } = await sb.from('messages_prives').insert({
      conversation_id: conversationId, auteur_id: moiId, texte: t,
      prix_propose: proposePrix ? p : null,
    }).select('id, auteur_id, texte, prix_propose, remis_le, lu_le, created_at').single();

    setEnvoi(false);
    if (error || !data) { setErreur("Le message n'est pas parti. Réessayez."); return; }

    setMessages((m) => [...m, data as MessagePrive]);
    setTexte(''); setPrix(''); setProposePrix(false);
    router.refresh();
  }

  let dernierJour = '';

  return (
    <>
      <div className="fil-msgs">
        {messages.length === 0 && (
          <p className="muted center" style={{ padding: '20px 0' }}>
            Aucun message. Écrivez le premier à {autrePrenom}.
          </p>
        )}

        {messages.map((m) => {
          const j = jour(m.created_at);
          const nouveauJour = j !== dernierJour;
          dernierJour = j;
          const mien = m.auteur_id === moiId;
          return (
            <div key={m.id}>
              {nouveauJour && <p className="fil-jour">{j}</p>}
              <div className={`bulle${mien ? ' bulle-moi' : ''}`}>
                {m.prix_propose != null && (
                  <span className="bulle-prix">Proposition : {eur(+m.prix_propose)}</span>
                )}
                <p>{m.texte}</p>
                <span className="bulle-h">
                  {heure(m.created_at)}
                  {mien && (
                    <span className="bulle-etat">
                      {m.lu_le ? 'Lu' : m.remis_le ? 'Remis' : 'Envoyé'}
                      <svg width="15" height="11" viewBox="0 0 22 12" aria-hidden="true"
                        className={m.lu_le ? 'coche coche-lu' : 'coche'}>
                        <path d="M1 6.5 4.5 10 11 2" />
                        {(m.remis_le || m.lu_le) && <path d="M9 6.5 12.5 10 19 2" />}
                      </svg>
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bas} />
      </div>

      {messages.length === 0 && (
        <div className="fil-sugg">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="fchip" onClick={() => setTexte(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="card fil-saisie">
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="msg" className="sr-only">Votre message à {autrePrenom}</label>
          <textarea className="inp" id="msg" rows={2} maxLength={2000} value={texte}
            placeholder="Votre message" onChange={(e) => setTexte(e.target.value)} />
        </div>

        {proposePrix && (
          <div className="field" style={{ marginBottom: 8 }}>
            <label htmlFor="px">Prix proposé</label>
            <input className="inp" id="px" inputMode="decimal" value={prix} autoFocus
              placeholder={prixAnnonce ? String(prixAnnonce).replace('.', ',') : '0,00'}
              onChange={(e) => setPrix(e.target.value)} />
            <p className="help">
              Une proposition n&apos;engage rien : elle rend seulement la
              discussion claire. Le prix de l&apos;annonce ne change pas.
            </p>
          </div>
        )}

        {erreur && <p className="errmsg" style={{ marginBottom: 8 }}>{erreur}</p>}

        <div className="row-btn">
          <button className="btn btn-s" style={{ flex: 1 }}
            aria-pressed={proposePrix}
            onClick={() => { setProposePrix((v) => !v); setPrix(''); }}>
            {proposePrix ? 'Retirer la proposition' : 'Proposer un prix'}
          </button>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={envoyer} disabled={envoi}>
            {envoi ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </>
  );
}
