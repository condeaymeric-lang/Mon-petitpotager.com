import Link from 'next/link';

export interface Voisin {
  id: string;
  prenom: string;
  avatar_url: string | null;
  role: string;
  est_relais: boolean;
  commune: string;
  nb_annonces: number;
  nb_ventes: number;
  nb_achats: number;
  nb_evenements: number;
  nb_messages: number;
  nb_publications: number;
  score: number;
}

/** Le titre du moment, pour ne pas se prendre trop au sérieux. */
function titre(v: Voisin, rang: number) {
  if (rang === 0) return 'Chef de village';
  if (v.est_relais) return 'Gardien du colis';
  if (v.nb_evenements > 0) return 'Boute-en-train';
  if (v.nb_ventes >= 3) return 'Marchand du coin';
  if (v.nb_annonces >= 3) return 'Semeur en série';
  if (v.nb_messages >= 10) return 'Grande langue';
  if (v.nb_achats > 0) return 'Bon client';
  return 'Voisin discret';
}

/**
 * La bataille des voisins : un classement d'activité, pas de fortune.
 *
 * Les points servent aux bons d'achat ; ils n'ont pas à dire qui fait
 * vivre le secteur. Ici comptent les annonces, les ventes, les achats
 * retirés, les événements organisés, les messages échangés, et le fait
 * de tenir un point relais.
 */
export function Classement({ voisins, compact = false }: { voisins: Voisin[]; compact?: boolean }) {
  if (voisins.length === 0) {
    return (
      <div className={compact ? 'classement' : 'card classement'}>
        <h3>La bataille des voisins</h3>
        <p className="tiny" style={{ marginTop: 8 }}>
          Personne n&apos;est encore monté sur le ring. Publiez, échangez,
          organisez : le classement se remplira tout seul.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'classement' : 'card classement'}>
      <h3>La bataille des voisins</h3>
      <ol className="clst">
        {voisins.map((v, i) => (
          <li key={v.id}>
            <Link href={`/membre/${v.id}`}>
              <span className={`clst-rang${i < 3 ? ' clst-podium' : ''}`}>{i + 1}</span>
              {v.avatar_url
                ? <img src={v.avatar_url} alt="" loading="lazy" className="clst-photo" />
                : <span className="clst-photo clst-photo-vide">{v.prenom?.[0]?.toUpperCase()}</span>}
              <span className="clst-nom">
                <b>{v.prenom}</b>
                <span>
                  {titre(v, i)}
                  {!compact && v.nb_annonces > 0
                    ? ` · ${v.nb_annonces} annonce${v.nb_annonces > 1 ? 's' : ''}` : ''}
                  {!compact && v.nb_evenements > 0
                    ? ` · ${v.nb_evenements} événement${v.nb_evenements > 1 ? 's' : ''}` : ''}
                </span>
              </span>
              <span className="clst-pts">{v.score}<i>pts</i></span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="tiny clst-note">
        Classement d&apos;activité sur trois mois : annonces, ventes, achats
        retirés, événements, messages. Sans conséquence, sinon la gloire.
      </p>
    </div>
  );
}
