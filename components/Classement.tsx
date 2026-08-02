import Link from 'next/link';

export interface Voisin {
  id: string;
  prenom: string;
  avatar_url: string | null;
  role: string;
  points: number;
  est_relais: boolean;
  nb_annonces: number;
  commune: string;
}

/**
 * Classement des voisins les plus actifs du secteur.
 *
 * Il s'appuie sur les points, donc sur les achats retirés et les colis
 * remis en point relais : publier ne suffit pas à monter, il faut que
 * des échanges aient réellement eu lieu.
 */
export function Classement({ voisins, compact = false }: { voisins: Voisin[]; compact?: boolean }) {
  if (voisins.length === 0) {
    return (
      <div className={compact ? 'classement' : 'card classement'}>
        <h3>Voisins les plus actifs</h3>
        <p className="tiny" style={{ marginTop: 8 }}>
          Le classement apparaîtra dès les premiers échanges du secteur.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'classement' : 'card classement'}>
      <h3>Voisins les plus actifs</h3>
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
                  {v.role === 'pro' ? 'Producteur' : 'Voisin'}
                  {v.est_relais ? ' · relais' : ''}
                  {v.nb_annonces > 0 ? ` · ${v.nb_annonces} annonce${v.nb_annonces > 1 ? 's' : ''}` : ''}
                </span>
              </span>
              <span className="clst-pts">{v.points}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="tiny clst-note">
        Les points s&apos;obtiennent sur les achats retirés et les colis remis
        en point relais.
      </p>
    </div>
  );
}
