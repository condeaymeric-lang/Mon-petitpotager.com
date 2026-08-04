import Link from 'next/link';

export const LIBELLE_CATEGORIE: Record<string, string> = {
  information: 'Information',
  alerte: 'Alerte',
  travaux: 'Travaux',
  evenement: 'Événement',
  consultation: 'Consultation',
  rappel: 'Rappel',
};

export interface InformationProche {
  id: string; categorie: string; titre: string; texte: string;
  photos: string[] | null; epinglee: boolean; created_at: string;
  distance_km: number; auteur_nom: string; auteur_type: string | null;
  auteur_verifiee: boolean;
}

function quand(iso: string) {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (j < 1) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 7) return `il y a ${j} jours`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** Une information publiée par une mairie, une association ou un collectif. */
export default function CarteInformation({ info: i }: { info: InformationProche }) {
  return (
    <Link href={`/informations/${i.id}`} className={`info${i.categorie === 'alerte' ? ' info-alerte' : ''}`}>
      {i.photos?.[0] && (
        <div className="info-photo"><img src={i.photos[0]} alt="" loading="lazy" /></div>
      )}
      <div className="info-b">
        <div className="info-tete">
          <span className={`badge ${i.categorie === 'alerte' ? 'b-done' : 'b-am'}`}>
            {LIBELLE_CATEGORIE[i.categorie] ?? i.categorie}
          </span>
          {i.epinglee && <span className="badge b-pro">Épinglée</span>}
          {i.auteur_verifiee && <span className="badge b-ok">Vérifié</span>}
        </div>
        <h4>{i.titre}</h4>
        <p className="info-txt">{i.texte}</p>
        <div className="item-meta">
          <span>{i.auteur_nom}</span>
          <span>{quand(i.created_at)}</span>
          {i.distance_km > 0 && <span>{i.distance_km} km</span>}
        </div>
      </div>
    </Link>
  );
}
