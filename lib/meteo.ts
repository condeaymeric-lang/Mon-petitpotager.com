/**
 * Météo du secteur et conseils de jardinage.
 *
 * Source : Open-Meteo (open-meteo.com), service européen, gratuit et sans clé.
 * L'appel est fait côté serveur : l'adresse IP des utilisateurs n'est jamais
 * transmise, seules les coordonnées du centre de la commune le sont.
 */

export type Gravite = 'alerte' | 'attention' | 'info' | 'bon';

export interface Conseil {
  id: string;
  gravite: Gravite;
  titre: string;
  texte: string;
}

export interface JourMeteo {
  date: string;
  code: number;
  tMax: number;
  tMin: number;
  pluieMm: number;
  pluiePct: number;
  rafales: number;
  uv: number;
}

export interface Meteo {
  commune: string;
  maintenant: { temperature: number; code: number; vent: number; humidite: number };
  jours: JourMeteo[];
  conseils: Conseil[];
}

/** Libellés des codes météo WMO utilisés par Open-Meteo. */
export function libelleCode(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code === 1) return 'Peu nuageux';
  if (code === 2) return 'Partiellement nuageux';
  if (code === 3) return 'Couvert';
  if (code === 45 || code === 48) return 'Brouillard';
  if (code >= 51 && code <= 55) return 'Bruine';
  if (code === 56 || code === 57) return 'Bruine verglaçante';
  if (code >= 61 && code <= 65) return 'Pluie';
  if (code === 66 || code === 67) return 'Pluie verglaçante';
  if (code >= 71 && code <= 77) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code === 85 || code === 86) return 'Averses de neige';
  if (code === 95) return 'Orage';
  if (code === 96 || code === 99) return 'Orage et grêle';
  return 'Temps variable';
}

/** Famille d'icône à afficher pour un code WMO. */
export function familleCode(code: number) {
  if (code === 0) return 'soleil' as const;
  if (code === 1 || code === 2) return 'eclaircies' as const;
  if (code === 3) return 'couvert' as const;
  if (code === 45 || code === 48) return 'brouillard' as const;
  if (code >= 95) return 'orage' as const;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'neige' as const;
  if (code >= 80 && code <= 82) return 'averse' as const;
  if (code >= 51) return 'pluie' as const;
  return 'couvert' as const;
}

/**
 * Construit les conseils à partir des prévisions, du plus urgent au moins urgent.
 * Chaque règle est indépendante ; l'affichage n'en retient que les premières.
 */
function construireConseils(jours: JourMeteo[]): Conseil[] {
  const c: Conseil[] = [];
  if (!jours.length) return c;

  const auj = jours[0];
  const semaine = jours.slice(0, 5);
  const minSemaine = Math.min(...semaine.map((j) => j.tMin));
  const maxSemaine = Math.max(...semaine.map((j) => j.tMax));
  const rafalesMax = Math.max(...semaine.map((j) => j.rafales));
  const pluieSemaine = semaine.reduce((a, j) => a + j.pluieMm, 0);
  const joursSansPluie = semaine.filter((j) => j.pluieMm < 1).length;
  const orage = semaine.some((j) => j.code >= 95);
  const grele = semaine.some((j) => j.code === 96 || j.code === 99);
  const neige = semaine.some((j) => (j.code >= 71 && j.code <= 77) || j.code === 85 || j.code === 86);

  // ── Alertes ────────────────────────────────────────────────
  if (minSemaine <= 0) {
    c.push({
      id: 'gel', gravite: 'alerte',
      titre: `Gel annoncé, jusqu'à ${Math.round(minSemaine)} °C`,
      texte: "Rentrez les plants en pot et les semis. Couvrez les cultures sensibles d'un voile d'hivernage en fin de journée, et retirez-le le matin pour laisser respirer.",
    });
  } else if (minSemaine <= 3) {
    c.push({
      id: 'gelee', gravite: 'alerte',
      titre: `Risque de gelée au sol, ${Math.round(minSemaine)} °C attendus`,
      texte: 'Même sans gel annoncé, le sol peut geler en fin de nuit. Protégez tomates, courgettes et jeunes semis, plus fragiles que les cultures installées.',
    });
  }

  if (grele) {
    c.push({
      id: 'grele', gravite: 'alerte',
      titre: 'Grêle possible cette semaine',
      texte: 'Mettez les cultures fragiles à l’abri sous un filet ou un tunnel. La grêle abîme surtout les feuillages larges : salades, courges, jeunes plants.',
    });
  }

  if (rafalesMax >= 80) {
    c.push({
      id: 'tempete', gravite: 'alerte',
      titre: `Rafales jusqu'à ${Math.round(rafalesMax)} km/h`,
      texte: 'Tuteurez solidement tomates et haricots à rames, rentrez les pots et les serres légères, et retirez les voiles qui feraient prise au vent.',
    });
  }

  if (maxSemaine >= 34) {
    c.push({
      id: 'canicule', gravite: 'alerte',
      titre: `Forte chaleur, jusqu'à ${Math.round(maxSemaine)} °C`,
      texte: 'Arrosez tôt le matin ou après le coucher du soleil, jamais en plein midi. Paillez le pied des plants pour garder l’humidité, et ombrez les jeunes semis.',
    });
  }

  // ── Attention ──────────────────────────────────────────────
  if (maxSemaine >= 28 && maxSemaine < 34) {
    c.push({
      id: 'chaleur', gravite: 'attention',
      titre: `Il va faire chaud, ${Math.round(maxSemaine)} °C attendus`,
      texte: 'Pensez à arroser en fin de journée, quand la terre a refroidi. Un arrosage copieux tous les deux jours vaut mieux qu’un petit arrosage quotidien.',
    });
  }

  if (rafalesMax >= 55 && rafalesMax < 80) {
    c.push({
      id: 'vent', gravite: 'attention',
      titre: `Vent soutenu, rafales à ${Math.round(rafalesMax)} km/h`,
      texte: 'Vérifiez les tuteurs et rapprochez les pots d’un mur abrité. Le vent dessèche autant que le soleil : surveillez l’humidité du sol.',
    });
  }

  if (orage && !grele) {
    c.push({
      id: 'orage', gravite: 'attention',
      titre: 'Orages prévus',
      texte: 'Récoltez ce qui est mûr avant l’orage, surtout les fruits rouges et les tomates qui éclatent avec un excès d’eau soudain.',
    });
  }

  if (joursSansPluie >= 5 && maxSemaine >= 22) {
    c.push({
      id: 'secheresse', gravite: 'attention',
      titre: 'Aucune pluie prévue cette semaine',
      texte: 'Arrosez au pied plutôt qu’au jet sur les feuilles, et binez la surface : un sol ameubli garde mieux l’eau qu’un sol tassé.',
    });
  }

  // Mildiou : chaleur douce et humidité prolongée, le risque classique du potager.
  const joursHumides = semaine.filter((j) => j.pluieMm >= 2 && j.tMax >= 15 && j.tMax <= 27).length;
  if (joursHumides >= 3) {
    c.push({
      id: 'mildiou', gravite: 'attention',
      titre: 'Conditions favorables au mildiou',
      texte: 'Pluie douce et températures moyennes plusieurs jours de suite : c’est le climat du mildiou. Aérez les plants de tomates et de pommes de terre, arrosez au pied sans mouiller le feuillage, retirez les feuilles tachées.',
    });
  }

  // Échelle officielle : 6-7 élevé, 8-10 très élevé, 11 et plus extrême.
  const uvMax = Math.max(...semaine.map((j) => j.uv));
  if (uvMax >= 6) {
    c.push({
      id: 'uv', gravite: 'attention',
      titre: `Indice UV ${uvMax >= 11 ? 'extrême' : uvMax >= 8 ? 'très élevé' : 'élevé'} (${Math.round(uvMax)})`,
      texte: 'Ombrez les jeunes plants aux heures les plus chaudes avec un voile ou un cageot retourné. Et protégez-vous : évitez de jardiner entre 12 h et 16 h.',
    });
  }

  if (neige) {
    c.push({
      id: 'neige', gravite: 'attention',
      titre: 'Neige annoncée',
      texte: 'Secouez la neige des tunnels et des serres, dont la structure peut céder sous le poids. Sur les cultures d’hiver, elle protège du froid : laissez-la en place.',
    });
  }

  // ── Informations et bonnes nouvelles ───────────────────────
  if (pluieSemaine >= 15) {
    c.push({
      id: 'pluie', gravite: 'info',
      titre: `${Math.round(pluieSemaine)} mm de pluie attendus`,
      texte: 'Inutile d’arroser cette semaine. Profitez-en pour désherber : les racines viennent bien plus facilement dans une terre humide.',
    });
  } else if (auj.pluieMm >= 3) {
    c.push({
      id: 'pluie-jour', gravite: 'info',
      titre: 'Pluie aujourd’hui',
      texte: 'Arrosage inutile. C’est aussi le bon moment pour repiquer : les jeunes plants reprennent mieux par temps couvert et humide.',
    });
  }

  if (auj.tMax >= 15 && auj.tMax <= 27 && auj.pluieMm < 2 && auj.rafales < 40) {
    c.push({
      id: 'bon-jour', gravite: 'bon',
      titre: 'Belle journée pour le potager',
      texte: 'Conditions idéales pour semer, récolter ou entretenir. C’est aussi le moment de photographier vos surplus et de publier une annonce : les récoltes fraîches partent vite.',
    });
  }

  return c;
}

/** Récupère la météo du secteur. Renvoie null si le service est indisponible. */
export async function meteoSecteur(
  lat: number, lon: number, commune: string
): Promise<Meteo | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,' +
    'precipitation_probability_max,wind_gusts_10m_max,uv_index_max' +
    '&timezone=Europe%2FParis&forecast_days=7';

  try {
    // Rafraîchi toutes les 30 minutes : inutile d'interroger le service à chaque visite.
    const r = await fetch(url, { next: { revalidate: 1800 } });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.daily?.time?.length || !d?.current) return null;

    const jours: JourMeteo[] = d.daily.time.map((date: string, i: number) => ({
      date,
      code: d.daily.weather_code[i] ?? 0,
      tMax: d.daily.temperature_2m_max[i] ?? 0,
      tMin: d.daily.temperature_2m_min[i] ?? 0,
      pluieMm: d.daily.precipitation_sum[i] ?? 0,
      pluiePct: d.daily.precipitation_probability_max[i] ?? 0,
      rafales: d.daily.wind_gusts_10m_max[i] ?? 0,
      uv: d.daily.uv_index_max[i] ?? 0,
    }));

    return {
      commune,
      maintenant: {
        temperature: Math.round(d.current.temperature_2m),
        code: d.current.weather_code ?? 0,
        vent: Math.round(d.current.wind_speed_10m ?? 0),
        humidite: Math.round(d.current.relative_humidity_2m ?? 0),
      },
      jours,
      conseils: construireConseils(jours),
    };
  } catch {
    // Service indisponible : la page s'affiche sans le bloc météo.
    return null;
  }
}
