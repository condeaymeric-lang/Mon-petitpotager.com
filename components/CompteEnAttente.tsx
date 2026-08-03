import Link from 'next/link';
import { Marque } from './Marque';

/**
 * Écran d'un compte pas encore validé.
 *
 * Il peut consulter le site, pas y publier. Le dire franchement vaut
 * mieux que de laisser buter sur des refus sans explication.
 */
export function CompteEnAttente({ refus }: { refus?: string | null }) {
  return (
    <div className="card">
      <h3>{refus ? "Votre inscription n'a pas été retenue" : 'Compte en attente de validation'}</h3>
      <p className="muted" style={{ marginTop: 8 }}>
        {refus
          ? refus
          : "Le site est en construction : chaque inscription est examinée par une personne avant d'être activée. En attendant, vous pouvez consulter les annonces, les producteurs et les informations de votre secteur, mais pas publier ni commander."}
      </p>
      <p className="muted" style={{ marginTop: 8 }}>
        {refus
          ? 'Écrivez-nous si vous pensez qu’il s’agit d’une erreur.'
          : 'Vous recevrez un courriel dès que votre compte sera activé.'}
      </p>
      <Link className="btn btn-s" href="/contact" style={{ marginTop: 14 }}>
        Nous écrire
      </Link>
    </div>
  );
}

/** Bandeau discret, à poser en tête des pages de publication. */
export function BandeauAttente({ refus }: { refus?: string | null }) {
  return (
    <div className="avert" role="status">
      <b>{refus ? "Inscription non retenue." : 'Compte en attente de validation.'}</b>
      <p>
        {refus ?? "Vous pourrez publier dès qu'un modérateur aura activé votre compte. Vous serez prévenu par courriel."}
      </p>
    </div>
  );
}
