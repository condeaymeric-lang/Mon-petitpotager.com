'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Illustrations';

const COOKIE = 'mpp-secteur';

/** Barre du haut pour les personnes sans compte : repère de commune,
 *  possibilité d'en changer, et accès à l'inscription. */
export default function BarreVisiteur({
  commune, rayonKm,
}: { commune: string; rayonKm: number }) {
  const router = useRouter();

  function changerCommune() {
    document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    router.push('/');
    router.refresh();
  }

  return (
    <div className="topbar">
      <div className="topbar-in">
        <div className="tb-row">
          <Link href="/" className="brand"><Logo size={25} />mon<i>petit</i>potager</Link>
          <div className="tb-right">
            <nav className="dsk-nav" aria-label="Navigation">
              <Link href="/producteurs">Producteurs</Link>
              <Link href="/evenements">Événements</Link>
              <Link href="/pourquoi">Pourquoi</Link>
            </nav>
            <button type="button" className="loc" onClick={changerCommune}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6FA83A" strokeWidth="2.2">
                <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <b>{commune} · {rayonKm} km</b>
            </button>
            <Link href="/inscription" className="dsk-publier">Créer un compte</Link>
          </div>
        </div>
        <p className="visiteur-note">
          Vous consultez sans compte. Créez-en un pour acheter, vendre ou donner.{' '}
          <Link href="/connexion">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
