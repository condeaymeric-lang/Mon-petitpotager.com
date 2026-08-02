import PageLegale from '@/components/PageLegale';

export const metadata = { title: 'Mentions légales — monpetitpotager.com' };

export default function MentionsLegales() {
  return (
    <PageLegale titre="Mentions légales" maj="2 août 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le service est en cours de développement et n&apos;est pas ouvert au public.
        L&apos;identité complète de l&apos;éditeur — dénomination sociale, forme
        juridique, siège social, SIRET et directeur de la publication — sera publiée
        ici avant l&apos;ouverture des inscriptions.
      </p>
      <p>
        Pour toute question d&apos;ici là, utilisez le{' '}
        <a href="/contact">formulaire de contact</a>.
      </p>

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
