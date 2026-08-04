import Link from 'next/link';
import { Marque } from './Marque';

/** Panneau de marque affiché à côté des formulaires de connexion/inscription
 *  sur grand écran. Contenu réel du produit, aucune promesse inventée. */
export function PanneauMarque() {
  return (
    <div className="onb-marque">
      <div className="onb-marque-in">
        <Link href="/" className="brand">
          <Marque hauteur={168} signature clair />
        </Link>
        <p className="onb-tagline">Cultivons le bon. Partageons le meilleur.</p>
        <ul className="onb-promesses">
          <li>Vous ne voyez jamais d'annonce au-delà de votre rayon.</li>
          <li>Le vendeur n'est payé qu'après votre confirmation de retrait.</li>
          <li>Le troc et le don restent gratuits, sans commission, pour toujours.</li>
        </ul>
      </div>
    </div>
  );
}
