import Link from 'next/link';

export const THEMES: [string, string, string][] = [
  ['conseils', 'Conseils de culture', 'Semis, taille, maladies, entretien'],
  ['entraide', 'Entraide', "Coup de main, prêt d'outil, question pratique"],
  ['bons_plans', 'Bons plans', 'Fournisseurs, occasions, astuces'],
  ['recettes', 'Recettes', 'Conserves, cuisine de saison, transformation'],
  ['vie_locale', 'Vie locale', 'Ce qui se passe au village'],
  ['discussion', 'Discussion', 'Tout le reste'],
];

export const LIBELLE_THEME: Record<string, string> =
  Object.fromEntries(THEMES.map(([c, l]) => [c, l]));

export interface SujetProche {
  id: string; theme: string; titre: string; texte: string;
  photos: string[] | null; epingle: boolean; ferme: boolean;
  dernier_le: string; created_at: string; distance_km: number;
  auteur_id: string; auteur_prenom: string; auteur_avatar: string | null;
  auteur_role: string; nb_reponses: number; dernier_prenom: string | null;
}

export function quandCourt(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  const j = Math.round(min / 1440);
  if (j < 7) return `il y a ${j} jour${j > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** Un sujet du bistrot, tel qu'il apparaît dans la liste. */
export default function CarteSujet({ sujet: s }: { sujet: SujetProche }) {
  return (
    <Link href={`/bistrot/${s.id}`} className="sujet">
      {s.auteur_avatar
        ? <img src={s.auteur_avatar} alt="" loading="lazy" className="sujet-photo" />
        : <span className="sujet-photo sujet-photo-vide">
            {s.auteur_prenom?.[0]?.toUpperCase()}
          </span>}

      <span className="sujet-b">
        <span className="sujet-tete">
          <span className="badge b-am">{LIBELLE_THEME[s.theme] ?? s.theme}</span>
          {s.epingle && <span className="badge b-pro">Épinglé</span>}
          {s.ferme && <span className="badge b-done">Clos</span>}
        </span>
        <b>{s.titre}</b>
        <span className="sujet-ap">{s.texte}</span>
        <span className="item-meta">
          <span>{s.auteur_prenom}</span>
          <span>
            {s.nb_reponses > 0
              ? `${s.nb_reponses} réponse${s.nb_reponses > 1 ? 's' : ''}`
              : 'Pas encore de réponse'}
          </span>
          <span>
            {s.nb_reponses > 0 && s.dernier_prenom
              ? `${s.dernier_prenom}, ${quandCourt(s.dernier_le)}`
              : quandCourt(s.created_at)}
          </span>
        </span>
      </span>

      {s.photos?.[0] && (
        <span className="sujet-vignette"><img src={s.photos[0]} alt="" loading="lazy" /></span>
      )}
    </Link>
  );
}
