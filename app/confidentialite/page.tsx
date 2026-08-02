import PageLegale from '@/components/PageLegale';

export const metadata = { title: 'Données personnelles — monpetitpotager.com' };

export default function Confidentialite() {
  return (
    <PageLegale titre="Données personnelles" maj="2 août 2026">
      <div className="legal-todo">
        <b>Document à faire valider</b>
        <p>
          Cette page décrit fidèlement les traitements réellement effectués par le
          service à ce jour. L&apos;identité du responsable de traitement reste à
          compléter, et l&apos;ensemble doit être relu par un juriste avant
          l&apos;ouverture au public.
        </p>
      </div>

      <h2>Responsable de traitement</h2>
      <p><em>À compléter</em> — voir les <a href="/mentions-legales">mentions légales</a>.</p>

      <h2>Données collectées</h2>
      <p>Le service ne collecte que ce dont il a besoin pour fonctionner :</p>
      <ul>
        <li><b>Compte</b> : adresse e-mail, mot de passe (stocké chiffré, jamais en clair), prénom.</li>
        <li><b>Profil</b> : commune choisie, rayon de recherche, rôle (acheteur, jardinier, professionnel),
          et si vous les renseignez : nom, téléphone, photo de profil, présentation.</li>
        <li><b>Vendeurs professionnels</b> : raison sociale et SIRET, si vous les déclarez.</li>
        <li><b>Points relais</b> : adresse et horaires du point de retrait, si vous en proposez un.</li>
        <li><b>Annonces</b> : produit, prix, description, photographies que vous envoyez.</li>
        <li><b>Commandes</b> : contenu, montants, mode de retrait, historique de points.</li>
        <li><b>Contact</b> : adresse e-mail et contenu des messages envoyés via le formulaire.</li>
      </ul>
      <p>
        Aucune adresse postale personnelle n&apos;est demandée pour les annonces : la
        localisation utilisée est celle du centre de votre commune, pas de votre domicile.
      </p>

      <h2>Ce que le service ne fait pas</h2>
      <ul>
        <li>Aucun cookie publicitaire, aucun traceur, aucun outil de mesure d&apos;audience.</li>
        <li>Aucune revente ni cession de données à des tiers.</li>
        <li>Aucun profilage publicitaire, aucune décision automatisée.</li>
      </ul>
      <p>
        Les seuls cookies déposés sont ceux nécessaires à votre session de connexion.
        Ils sont strictement fonctionnels et ne demandent donc pas de consentement.
      </p>

      <h2>Bases légales et durées</h2>
      <ul>
        <li><b>Exécution du contrat</b> : compte, annonces, commandes. Conservées tant que
          le compte existe.</li>
        <li><b>Obligation légale</b> : pièces liées aux transactions, conservées selon les
          durées comptables applicables.</li>
        <li><b>Intérêt légitime</b> : messages de contact, conservés le temps de traiter la
          demande.</li>
      </ul>

      <h2>Sous-traitants et localisation</h2>
      <ul>
        <li><b>Supabase Inc.</b> — base de données, comptes et fichiers. Données stockées
          dans l&apos;Union européenne (Francfort, Allemagne).</li>
        <li><b>Vercel Inc.</b> — hébergement du site. Les traitements sont exécutés depuis
          la région de Paris ; la société est établie aux États-Unis.</li>
        <li><b>API Géo</b> (service public de l&apos;État) — recherche des communes lors de
          l&apos;inscription.</li>
        <li><b>Google Fonts</b> — les polices d&apos;écriture sont chargées depuis les
          serveurs de Google, ce qui leur transmet votre adresse IP. Cette dépendance a
          vocation à être supprimée en hébergeant les polices sur le site.</li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
        de limitation, d&apos;opposition et de portabilité. Vous pouvez modifier la plupart
        de vos informations directement depuis votre profil. Pour toute autre demande,
        écrivez-nous via le <a href="/contact">formulaire de contact</a>.
      </p>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL
        (<a href="https://www.cnil.fr" rel="noreferrer noopener" target="_blank">www.cnil.fr</a>).
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS). L&apos;accès aux données est cloisonné au
        niveau de la base elle-même : chaque personne ne peut lire et modifier que ses
        propres informations, indépendamment de l&apos;interface utilisée.
      </p>
    </PageLegale>
  );
}
