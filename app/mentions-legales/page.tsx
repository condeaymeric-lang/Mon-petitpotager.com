import PageLegale from '@/components/PageLegale';

export const metadata = { title: 'Mentions légales — monpetitpotager.com' };

export default function MentionsLegales() {
  return (
    <PageLegale titre="Mentions légales" maj="2 août 2026">
      <div className="legal-todo">
        <b>Informations à compléter par l&apos;éditeur</b>
        <p>
          Les champs marqués « à compléter » ci-dessous doivent être renseignés avant
          toute ouverture au public. Leur absence est une infraction à l&apos;article
          6-III de la loi pour la confiance dans l&apos;économie numérique.
        </p>
      </div>

      <h2>Éditeur du site</h2>
      <ul>
        <li>Dénomination sociale : <em>à compléter</em></li>
        <li>Forme juridique et capital social : <em>à compléter</em></li>
        <li>Siège social : <em>à compléter</em></li>
        <li>Numéro SIRET : <em>à compléter</em></li>
        <li>Numéro de TVA intracommunautaire : <em>à compléter</em></li>
        <li>Directeur de la publication : <em>à compléter</em></li>
        <li>Contact : via le <a href="/contact">formulaire de contact</a></li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut,
        CA 91789, États-Unis. Les traitements applicatifs sont exécutés depuis
        la région de Paris.
      </p>
      <p>
        La base de données et les fichiers envoyés par les utilisateurs sont hébergés
        par Supabase Inc., dans la région Europe (Francfort, Allemagne).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, illustrations et éléments graphiques du site sont la propriété de
        l&apos;éditeur. Les photographies publiées dans les annonces restent la propriété
        de leurs auteurs, qui en concèdent l&apos;affichage sur le service.
      </p>

      <h2>Signalement d&apos;un contenu</h2>
      <p>
        Tout contenu manifestement illicite peut être signalé via le{' '}
        <a href="/contact">formulaire de contact</a>, en précisant l&apos;annonce concernée.
      </p>
    </PageLegale>
  );
}
