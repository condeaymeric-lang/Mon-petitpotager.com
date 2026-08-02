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
  return (
    <article className="event">
      <div className="event-date" aria-hidden="true">
        <b>{d.getDate()}</b>
        <span>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
      </div>
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
          <span>Proposé par {e.auteur_prenom}</span>
        </div>
      </div>
    </article>
  );
}
