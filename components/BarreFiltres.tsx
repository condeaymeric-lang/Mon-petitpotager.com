'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * Rangée de filtres qui défile horizontalement.
 *
 * Sans repère visuel, une rangée qui déborde donne l'impression d'être
 * coupée : on ajoute donc un dégradé à chaque extrémité utile et, sur
 * grand écran, deux boutons de défilement. Le clavier reste prioritaire,
 * la rangée se parcourt aussi à la tabulation.
 */
export default function BarreFiltres({
  categories, active,
}: { categories: string[]; active?: string }) {
  const piste = useRef<HTMLDivElement>(null);
  const [aGauche, setAGauche] = useState(false);
  const [aDroite, setADroite] = useState(false);

  function mesurer() {
    const el = piste.current;
    if (!el) return;
    setAGauche(el.scrollLeft > 4);
    setADroite(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    mesurer();
    const el = piste.current;
    if (!el) return;
    el.addEventListener('scroll', mesurer, { passive: true });
    window.addEventListener('resize', mesurer);
    return () => {
      el.removeEventListener('scroll', mesurer);
      window.removeEventListener('resize', mesurer);
    };
  }, [categories.length]);

  // La catégorie active peut être hors champ au chargement : on l'amène
  // dans la vue, sinon la personne ne voit pas où elle se trouve.
  useEffect(() => {
    piste.current?.querySelector('.on')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);

  const glisser = (sens: number) =>
    piste.current?.scrollBy({ left: sens * Math.max(200, (piste.current.clientWidth * 0.7)), behavior: 'smooth' });

  return (
    <div className={`filtres-zone${aGauche ? ' fade-g' : ''}${aDroite ? ' fade-d' : ''}`}>
      <button type="button" className="filtres-fl fl-g" onClick={() => glisser(-1)}
        disabled={!aGauche} aria-label="Faire défiler les catégories vers la gauche">
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
      </button>

      <div className="filters" ref={piste} role="list">
        <Link href="/" className={`fchip${!active ? ' on' : ''}`} role="listitem">Tout</Link>
        {categories.map((c) => (
          <Link key={c} href={`/?cat=${encodeURIComponent(c)}`} role="listitem"
            className={`fchip${active === c ? ' on' : ''}`}>{c}</Link>
        ))}
      </div>

      <button type="button" className="filtres-fl fl-d" onClick={() => glisser(1)}
        disabled={!aDroite} aria-label="Faire défiler les catégories vers la droite">
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </div>
  );
}
