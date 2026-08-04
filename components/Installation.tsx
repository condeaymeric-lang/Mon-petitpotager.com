'use client';
import { useEffect } from 'react';

/**
 * Enregistre le service worker, qui rend l'application installable et
 * lui donne un écran d'attente quand le réseau manque.
 */
export default function Installation() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Après le chargement : l'enregistrement ne doit pas retarder
    // l'affichage de la première page.
    const t = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Sans service worker le site fonctionne normalement, il n'est
        // simplement plus installable.
      });
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return null;
}
