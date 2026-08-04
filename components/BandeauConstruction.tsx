import Link from 'next/link';

/**
 * Bandeau permanent tant que le service n'est pas ouvert.
 * À retirer le jour de l'ouverture réelle : voir README, section
 * « Avant d'ouvrir au public ».
 */
export default function BandeauConstruction() {
  return (
    <div className="bandeau" role="status">
      <p>
        <b>Site en construction — les inscriptions ne sont pas ouvertes.</b>{' '}
        mon-petitpotager.com est en cours de développement et n&apos;est pas un service
        fonctionnel. Le paiement en ligne n&apos;est pas actif, aucune commande
        n&apos;est réellement traitée, et les comptes comme les données sont des
        éléments de test qui peuvent être effacés à tout moment.{' '}
        <Link href="/contact">Nous contacter</Link>.
      </p>
    </div>
  );
}
