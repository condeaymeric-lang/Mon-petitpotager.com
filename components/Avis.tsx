'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';

interface Nouveaute {
  genre: 'message' | 'info' | 'annonce';
  id: string;
  titre: string;
  apercu: string | null;
  lien: string;
  quand: string;
}

const ETIQUETTE: Record<string, string> = {
  message: 'Nouveau message',
  info: 'Information du secteur',
  annonce: 'Nouvelle annonce près de chez vous',
};

const CLE = 'mpp-vu-le';
const INTERVALLE = 45000;

/**
 * Avis affichés en direct sur la page.
 *
 * Ce sont des notifications internes : nouveaux messages, informations
 * du secteur, et annonces qui reprennent des produits déjà achetés ou
 * publiés par la personne. Aucune notification du navigateur n'est
 * demandée, rien n'est envoyé à l'extérieur.
 */
export default function Avis() {
  const [file, setFile] = useState<Nouveaute[]>([]);
  const [replie, setReplie] = useState(false);
  const vus = useRef<Set<string>>(new Set());
  const path = usePathname();

  useEffect(() => {
    // Les pages où l'avis ferait doublon avec ce qu'on regarde déjà.
    if (path.startsWith('/messages') || path.startsWith('/connexion')
      || path.startsWith('/inscription')) return;

    let vivant = true;
    const sb = creerClient();

    async function relire() {
      const depuis = localStorage.getItem(CLE)
        ?? new Date(Date.now() - 3 * 864e5).toISOString();

      const { data } = await sb.rpc('nouveautes', { p_depuis: depuis });
      if (!vivant || !data) return;

      const neuves = (data as Nouveaute[]).filter((n) => !vus.current.has(n.genre + n.id));
      if (neuves.length > 0) {
        neuves.forEach((n) => vus.current.add(n.genre + n.id));
        setFile((f) => [...neuves, ...f].slice(0, 4));
        setReplie(false);
      }
    }

    relire();
    const t = setInterval(relire, INTERVALLE);
    return () => { vivant = false; clearInterval(t); };
  }, [path]);

  function fermer(cle: string) {
    setFile((f) => f.filter((n) => n.genre + n.id !== cle));
  }

  function toutMarquer() {
    localStorage.setItem(CLE, new Date().toISOString());
    setFile([]);
  }

  if (file.length === 0) return null;

  if (replie) {
    return (
      <button className="avis-replie" onClick={() => setReplie(false)}>
        {file.length} nouveauté{file.length > 1 ? 's' : ''}
      </button>
    );
  }

  return (
    <div className="avis" role="status" aria-live="polite">
      <div className="avis-tete">
        <b>Du nouveau</b>
        <button onClick={() => setReplie(true)} aria-label="Replier les nouveautés">Replier</button>
        <button onClick={toutMarquer} aria-label="Tout marquer comme vu">Tout vu</button>
      </div>

      {file.map((n) => {
        const cle = n.genre + n.id;
        return (
          <div className="avis-l" key={cle}>
            <Link href={n.lien} onClick={() => fermer(cle)}>
              <span className="avis-etq">{ETIQUETTE[n.genre]}</span>
              <b>{n.titre}</b>
              {n.apercu && <span className="avis-ap">{n.apercu}</span>}
            </Link>
            <button className="btn-x" onClick={() => fermer(cle)}
              aria-label={`Masquer : ${n.titre}`}>×</button>
          </div>
        );
      })}
    </div>
  );
}
