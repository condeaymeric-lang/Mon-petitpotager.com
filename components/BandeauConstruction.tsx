import Link from 'next/link';

/**
 * Bandeau permanent tant que le service n'est pas complet.
 * À retirer le jour de l'ouverture réelle : voir README, section
 * « Avant d'ouvrir au public ».
 */
export default function BandeauConstruction() {
  return (
    <div className="bandeau" role="status">
      <p>
        <b>Site en construction.</b> Le service est en cours de développement.
        Le paiement en ligne n&apos;est pas actif : les règlements se font sur place,
        entre voisins. Certaines fonctionnalités sont incomplètes et les données
        peuvent être réinitialisées.{' '}
        <Link href="/contact">Nous signaler un problème</Link>.
      </p>
    </div>
  );
}
