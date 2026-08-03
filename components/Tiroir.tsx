'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Entree {
  href: string;
  label: string;
  d: string;
  badge?: number;
}

interface Groupe {
  titre: string;
  entrees: Entree[];
}

/**
 * Tiroir latéral des rubriques, sur téléphone et tablette.
 *
 * La barre du bas ne porte que cinq entrées ; tout le reste vit ici.
 * Le tiroir s'ouvre par la gauche, se ferme au clic sur le voile, à la
 * touche Échap, et au changement de page. Le défilement de la page est
 * bloqué pendant l'ouverture, sinon on fait défiler le fond en croyant
 * faire défiler le menu.
 */
export default function Tiroir({
  groupes, prenom, avatar,
}: { groupes: Groupe[]; prenom?: string; avatar?: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [monte, setMonte] = useState(false);
  const path = usePathname();
  const panneau = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMonte(true); }, []);
  useEffect(() => { setOuvert(false); }, [path]);

  useEffect(() => {
    if (!ouvert) return;

    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function echap(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOuvert(false); bouton.current?.focus(); }
    }
    document.addEventListener('keydown', echap);

    // Le premier lien reçoit le focus : au clavier comme au lecteur
    // d'écran, on entre dans le menu, pas derrière lui.
    panneau.current?.querySelector<HTMLAnchorElement>('a')?.focus();

    return () => {
      document.body.style.overflow = avant;
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  return (
    <>
      <button ref={bouton} type="button" className="tiroir-b"
        aria-expanded={ouvert} aria-controls="tiroir"
        aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        onClick={() => setOuvert((v) => !v)}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          {ouvert
            ? <path d="M18 6 6 18M6 6l12 12" />
            : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {ouvert && monte && createPortal(
        <>
          <div className="tiroir-voile" onClick={() => setOuvert(false)} aria-hidden="true" />
          <div className="tiroir" id="tiroir" ref={panneau}
            role="dialog" aria-modal="true" aria-label="Menu des rubriques">
            <div className="tiroir-tete">
              {prenom && (
                <Link href="/profil" className="tiroir-moi">
                  {avatar
                    ? <img src={avatar} alt="" className="tiroir-avatar" />
                    : <span className="tiroir-avatar tiroir-avatar-vide">
                        {prenom[0]?.toUpperCase()}
                      </span>}
                  <span>
                    <b>{prenom}</b>
                    <span className="tiny">Voir mon profil</span>
                  </span>
                </Link>
              )}
              <button type="button" className="btn-x" aria-label="Fermer le menu"
                onClick={() => setOuvert(false)}>×</button>
            </div>

            <nav className="tiroir-nav" aria-label="Rubriques">
              {groupes.map((g) => (
                <div className="tiroir-g" key={g.titre}>
                  <p className="tiroir-t">{g.titre}</p>
                  {g.entrees.map((e) => {
                    const actif = e.href === '/' ? path === '/' : path.startsWith(e.href);
                    return (
                      <Link key={e.href} href={e.href} className={actif ? 'on' : ''}>
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                          <path d={e.d} />
                        </svg>
                        {e.label}
                        {!!e.badge && e.badge > 0 && (
                          <span className="tiroir-badge">{e.badge > 9 ? '9+' : e.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </>,
        // La barre du haut porte un backdrop-filter, qui piège les
        // éléments en position fixe à l'intérieur d'elle. Le tiroir est
        // donc rendu directement dans le corps de la page.
        document.body
      )}
    </>
  );
}
