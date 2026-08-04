/**
 * Vocabulaire commun de la modération.
 *
 * Les huit domaines correspondent un pour un à ceux que la base
 * connaît (fonction `domaines_moderation`). Ajouter un domaine ici sans
 * l'ajouter là-bas ne donne aucun pouvoir : c'est la base qui tranche.
 */
export type Domaine =
  | 'annonces' | 'evenements' | 'informations' | 'discussions'
  | 'commentaires' | 'comptes' | 'membres' | 'droits';

export const DOMAINES: { cle: Domaine; nom: string; aide: string }[] = [
  { cle: 'annonces', nom: 'Annonces',
    aide: 'Retirer, rétablir ou supprimer une vente, un troc, un don' },
  { cle: 'evenements', nom: 'Événements',
    aide: 'Annuler ou supprimer un événement et les messages de son mur' },
  { cle: 'informations', nom: 'Informations',
    aide: 'Masquer ou supprimer une publication de mairie ou d’association' },
  { cle: 'discussions', nom: 'Discussions',
    aide: 'Fermer ou supprimer un sujet du bistrot et ses réponses' },
  { cle: 'commentaires', nom: 'Commentaires',
    aide: 'Masquer ou supprimer un commentaire, où qu’il soit' },
  { cle: 'comptes', nom: 'Inscriptions',
    aide: 'Valider ou refuser les inscriptions et les demandes de structure' },
  { cle: 'membres', nom: 'Membres',
    aide: 'Consulter l’annuaire, corriger un profil, accorder une vérification' },
  { cle: 'droits', nom: 'Droits',
    aide: 'Nommer et révoquer les modérateurs. Le droit le plus lourd.' },
];

/** Genres de contenus, et le domaine qui les commande. */
export type Genre =
  | 'annonce' | 'evenement' | 'mur' | 'information'
  | 'discussion' | 'reponse' | 'commentaire';

export const GENRES: {
  cle: Genre; nom: string; domaine: Domaine;
  vide: string; masquable: boolean; motMasquer: string; motRetablir: string;
}[] = [
  { cle: 'annonce', nom: 'Annonces', domaine: 'annonces',
    vide: 'Aucune annonce publiée.', masquable: true,
    motMasquer: 'Retirer de la vitrine', motRetablir: 'Remettre en ligne' },
  { cle: 'evenement', nom: 'Événements', domaine: 'evenements',
    vide: 'Aucun événement proposé.', masquable: true,
    motMasquer: 'Annuler', motRetablir: 'Rétablir' },
  { cle: 'mur', nom: 'Murs d’événement', domaine: 'evenements',
    vide: 'Aucun message de mur.', masquable: false,
    motMasquer: '', motRetablir: '' },
  { cle: 'information', nom: 'Informations', domaine: 'informations',
    vide: 'Aucune information publiée.', masquable: true,
    motMasquer: 'Masquer', motRetablir: 'Réafficher' },
  { cle: 'discussion', nom: 'Discussions', domaine: 'discussions',
    vide: 'Aucun sujet ouvert au bistrot.', masquable: true,
    motMasquer: 'Fermer aux réponses', motRetablir: 'Rouvrir' },
  { cle: 'reponse', nom: 'Réponses', domaine: 'discussions',
    vide: 'Aucune réponse au bistrot.', masquable: false,
    motMasquer: '', motRetablir: '' },
  { cle: 'commentaire', nom: 'Commentaires', domaine: 'commentaires',
    vide: 'Aucun commentaire.', masquable: true,
    motMasquer: 'Masquer', motRetablir: 'Réafficher' },
];

/** Les droits d'un profil, quelle que soit la forme reçue de la base. */
export function droitsDe(p: { droits_moderation?: string[] | null } | null): Domaine[] {
  return (p?.droits_moderation ?? []) as Domaine[];
}

export function aLeDroit(p: { droits_moderation?: string[] | null } | null, d: Domaine) {
  return droitsDe(p).includes(d);
}
