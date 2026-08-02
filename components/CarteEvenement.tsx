import Link from 'next/link';
import type { EvenementProche, TypeEvenement } from '@/lib/types';

export const LIBELLE_TYPE: Record<TypeEvenement, string> = {
  marche: 'Marché',
  fete: 'Fête',
  brocante: 'Brocante',
  porte_ouverte: 'Porte ouverte',
  autre: 'Événement',
};

export function dateLisible(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export function heureLisible(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function CarteEvenement({ evenement: e }: { evenement: EvenementProche }) {
  const d = new Date(e.debut);
  // La première photo sert d'affiche : sans elle, il fallait entrer dans
  // l'événement pour voir à quoi il ressemble.
  const affiche = e.photos?.[0] ?? null;

  return (
    <Link href={`/evenements/${e.id}`} className={`event${affiche ? ' event-illustre' : ''}`}>
      {affiche && (
        <div className="event-affiche">
          <img src={affiche} alt="" loading="lazy" />
          <span className="event-date event-date-sur" aria-hidden="true">
            <b>{d.getDate()}</b>
            <span>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
          </span>
          {e.photos.length > 1 && (
            <span className="event-nb">{e.photos.length} photos</span>
          )}
        </div>
      )}

      {!affiche && (
        <div className="event-date" aria-hidden="true">
          <b>{d.getDate()}</b>
          <span>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
        </div>
      )}

      <div className="event-b">
        <span className="badge b-am">{LIBELLE_TYPE[e.type]}</span>
        <h4>{e.titre}</h4>
        <p className="tiny">
          {dateLisible(e.debut)} à {heureLisible(e.debut)}
          {e.lieu ? ` · ${e.lieu}` : ''}
        </p>
        {e.description && <p className="event-desc">{e.description}</p>}
        <div className="item-meta">
          <span>{e.commune}</span>
          <span>{e.distance_km} km</span>
          {e.nb_oui > 0 && (
            <span className="event-oui">
              {e.nb_oui} voisin{e.nb_oui > 1 ? 's y vont' : ' y va'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
