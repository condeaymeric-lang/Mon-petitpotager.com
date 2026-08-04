import Link from 'next/link';
import { familleCode, libelleCode, type Meteo, type Gravite } from '@/lib/meteo';

/** Icônes météo, au trait, dans l'esprit des illustrations produits. */
function IconeMeteo({ code, taille = 30 }: { code: number; taille?: number }) {
  const f = familleCode(code);
  const soleil = <circle cx="9" cy="9" r="4" fill="#E8A72C" />;
  const rayons = (
    <g stroke="#E8A72C" strokeWidth="1.6" strokeLinecap="round">
      <path d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.7 3.7l1.3 1.3M13 13l1.3 1.3M14.3 3.7 13 5M5 13l-1.3 1.3" />
    </g>
  );
  const nuage = (
    <path d="M8 20a4 4 0 0 1 .4-8 5.5 5.5 0 0 1 10.4 1.6A3.6 3.6 0 0 1 18 20Z"
      fill="#DDE3DA" stroke="#9BAA9E" strokeWidth="1.1" strokeLinejoin="round" />
  );
  const gouttes = (
    <g stroke="#4A7FA8" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 22.5v2.5M13 22.5v3.5M18 22.5v2.5" />
    </g>
  );

  return (
    <svg width={taille} height={taille} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {f === 'soleil' && <g transform="translate(5 5)">{rayons}{soleil}</g>}
      {f === 'eclaircies' && (<>
        <g transform="translate(2 0) scale(.85)">{rayons}{soleil}</g>
        {nuage}
      </>)}
      {f === 'couvert' && (<>
        <path d="M5 16a3.4 3.4 0 0 1 1.6-6.4 5 5 0 0 1 9.4-.6A3.2 3.2 0 0 1 16 16Z"
          fill="#C9D2C8" stroke="#9BAA9E" strokeWidth="1.1" strokeLinejoin="round" />
        {nuage}
      </>)}
      {f === 'brouillard' && (<>
        {nuage}
        <g stroke="#9BAA9E" strokeWidth="1.6" strokeLinecap="round">
          <path d="M5 23h14M7 26h11" />
        </g>
      </>)}
      {f === 'pluie' && (<>{nuage}{gouttes}</>)}
      {f === 'averse' && (<>
        <g transform="translate(1 -1) scale(.8)">{rayons}{soleil}</g>
        {nuage}{gouttes}
      </>)}
      {f === 'orage' && (<>
        {nuage}
        <path d="M14 21.5l-4 4h3.5l-1.5 3.5 4.5-4.5H13Z" fill="#E8A72C" />
      </>)}
      {f === 'neige' && (<>
        {nuage}
        <g stroke="#7FA8C4" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 24h2M9 23v2M17 24h2M18 23v2M12.5 26.5h2M13.5 25.5v2" />
        </g>
      </>)}
    </svg>
  );
}

const CLASSE_GRAVITE: Record<Gravite, string> = {
  alerte: 'cs-alerte',
  attention: 'cs-attention',
  info: 'cs-info',
  bon: 'cs-bon',
};

export default function BlocMeteo({ meteo }: { meteo: Meteo }) {
  const auj = meteo.jours[0];
  const conseils = meteo.conseils.slice(0, 4);

  return (
    <section className="bloc" aria-labelledby="titre-meteo">
      <div className="bloc-head">
        <h2 id="titre-meteo">Au jardin cette semaine</h2>
        <span className="tiny">{meteo.commune}</span>
      </div>

      <div className="meteo">
        <div className="meteo-auj">
          <IconeMeteo code={meteo.maintenant.code} taille={54} />
          <div className="meteo-temp">
            <b>{meteo.maintenant.temperature}<span>°C</span></b>
            <span className="tiny">{libelleCode(meteo.maintenant.code)}</span>
          </div>
          <dl className="meteo-detail">
            <div><dt>Max</dt><dd>{Math.round(auj.tMax)} °C</dd></div>
            <div><dt>Min</dt><dd>{Math.round(auj.tMin)} °C</dd></div>
            <div><dt>Vent</dt><dd>{meteo.maintenant.vent} km/h</dd></div>
            <div><dt>Humidité</dt><dd>{meteo.maintenant.humidite} %</dd></div>
          </dl>
        </div>

        <ol className="meteo-semaine">
          {meteo.jours.map((j, i) => (
            <li key={j.date} className={i === 0 ? 'on' : undefined}>
              <span className="mj-jour">
                {i === 0 ? "Auj." : new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
              </span>
              <IconeMeteo code={j.code} taille={26} />
              <span className="mj-temp"><b>{Math.round(j.tMax)}°</b> {Math.round(j.tMin)}°</span>
              <span className="mj-pluie">{j.pluieMm >= 0.5 ? `${j.pluieMm.toFixed(1)} mm` : '—'}</span>
            </li>
          ))}
        </ol>
      </div>

      {conseils.length > 0 && (
        <ul className="conseils">
          {conseils.map((c) => (
            <li key={c.id} className={CLASSE_GRAVITE[c.gravite]}>
              <b>{c.titre}</b>
              <p>{c.texte}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="tiny meteo-src">
        Prévisions <a href="https://open-meteo.com" target="_blank" rel="noreferrer noopener">Open-Meteo</a>,
        pour {meteo.commune}. Les conseils sont indicatifs : votre terrain, son exposition
        et son sol comptent autant que le ciel.{' '}
        <Link href="/vendre/publier">Publier une annonce</Link>.
      </p>
    </section>
  );
}
