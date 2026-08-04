'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Illustration } from '@/components/Illustrations';
import { Marque } from '@/components/Marque';

export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="onb">
      <div className="onb-in">
        <Link href="/" className="brand" style={{ fontSize: '1.7rem' }}>
          <Marque hauteur={58} />
        </Link>
        <div className="empty" style={{ marginTop: 24 }}>
          <Illustration nom="plant" className="e-ico" />
          <h3>La page n'a pas pu s'afficher.</h3>
          <p>
            Une erreur inattendue s'est produite. Vérifiez votre connexion et réessayez ;
            si le problème persiste, revenez à l'accueil.
          </p>
          <div className="row-btn" style={{ marginTop: 4 }}>
            <button className="btn btn-s" onClick={reset}>Réessayer</button>
            <Link className="btn btn-p" href="/">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
