import Link from 'next/link';
import { Marque } from './Marque';

const LIENS = [
  { href: '/pourquoi', label: "Pourquoi l'application" },
  { href: '/contact', label: 'Contact' },
  { href: '/cgu', label: 'CGU et CGV' },
  { href: '/confidentialite', label: 'Données personnelles' },
  { href: '/mentions-legales', label: 'Mentions légales' },
];

export default function PiedDePage() {
  return (
    <footer className="pied">
      <Link href="/" className="pied-marque" aria-label="Retour à l'accueil">
        <Marque hauteur={78} signature />
      </Link>
      <nav className="pied-in" aria-label="Liens de bas de page">
        {LIENS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
      </nav>
    </footer>
  );
}
