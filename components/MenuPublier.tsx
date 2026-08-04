'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CHOIX = [
  { href: '/vendre/publier', label: 'Publier une annonce',
    aide: 'Un produit de votre jardin ou de votre ferme',
    d: 'M4 4h16v16H4zM4 9h16M9 9v11' },
  { href: '/vendre/publier/panier', label: 'Composer un panier',
    aide: 'Plusieurs produits vendus ensemble',
    d: 'M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6' },
  { href: '/evenements/nouveau', label: 'Proposer un événement',
    aide: 'Marché, fête, brocante, porte ouverte',
    d: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z' },
  { href: '/bistrot/nouveau', label: 'Ouvrir une discussion',
    aide: 'Une question, un conseil, un coup de main',
    d: 'M6 2h12l-1 9a5 5 0 0 1-10 0ZM8 21h8M12 16v5' },
];

/**
 * Le bouton central de la barre du bas.
 *
 * Il menait à la page de présentation, ce que le signe « plus » ne
 * laissait pas deviner. Il ouvre maintenant le choix de ce qu'on peut
 * publier, sans quitter la page où l'on se trouve.
 */
export default function MenuPublier() {
  const [ouvert, setOuvert] = useState(false);
  const [monte, setMonte] = useState(false);
  const path = usePathname();

  useEffect(() => { setMonte(true); }, []);
  useEffect(() => { setOuvert(false); }, [path]);

  useEffect(() => {
    if (!ouvert) return;
    function echap(e: KeyboardEvent) { if (e.key === 'Escape') setOuvert(false); }
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  }, [ouvert]);

  return (
    <>
      <button type="button" className="fab" aria-expanded={ouvert} aria-haspopup="menu"
        aria-label="Publier quelque chose" onClick={() => setOuvert((v) => !v)}>
        <i>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d={ouvert ? 'M18 6 6 18M6 6l12 12' : 'M12 5v14M5 12h14'} />
          </svg>
        </i>
      </button>

      {ouvert && monte && createPortal(
        <>
          <div className="pub-voile" onClick={() => setOuvert(false)} aria-hidden="true" />
          <div className="pub-choix" role="menu" aria-label="Que voulez-vous publier ?">
            <p className="pub-choix-t">Que voulez-vous publier ?</p>
            {CHOIX.map((c) => (
              <Link key={c.href} href={c.href} role="menuitem" onClick={() => setOuvert(false)}>
                <span className="pub-choix-i" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d={c.d} /></svg>
                </span>
                <span>
                  <b>{c.label}</b>
                  <span>{c.aide}</span>
                </span>
              </Link>
            ))}
            <button type="button" className="btn btn-s" onClick={() => setOuvert(false)}>
              Annuler
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
