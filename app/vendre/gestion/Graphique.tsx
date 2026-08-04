import { eur } from '@/lib/utils';

export interface Mois {
  mois: string;
  ventes_ligne: number;
  ventes_directes: number;
  depenses: number;
  resultat: number;
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/**
 * Recettes et dépenses mois par mois, dessiné à la main en SVG.
 * Aucune librairie de graphique : le besoin ne le justifie pas, et
 * cela évite d'alourdir la page de plusieurs centaines de kilo-octets.
 */
export default function Graphique({ donnees }: { donnees: Mois[] }) {
  const recettes = donnees.map((m) => +m.ventes_ligne + +m.ventes_directes);
  const sorties = donnees.map((m) => +m.depenses);
  const plafond = Math.max(10, ...recettes, ...sorties);

  const L = 100 / Math.max(1, donnees.length);   // largeur d'un mois, en %
  const hauteur = (v: number) => (v / plafond) * 100;

  const totalRecettes = recettes.reduce((a, b) => a + b, 0);
  const totalSorties = sorties.reduce((a, b) => a + b, 0);

  if (totalRecettes === 0 && totalSorties === 0) {
    return (
      <div className="card">
        <h3>Recettes et dépenses</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Rien à représenter pour l&apos;instant. Le graphique apparaîtra dès
          votre première vente ou votre première dépense enregistrée.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Recettes et dépenses sur douze mois</h3>
      <p className="tiny" style={{ marginTop: 5 }}>
        {eur(totalRecettes)} encaissés, {eur(totalSorties)} dépensés.
      </p>

      <div className="graph" role="img"
        aria-label={`Recettes et dépenses mensuelles. ${donnees.map((m) => {
          const d = new Date(m.mois);
          return `${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()} : ${eur(+m.ventes_ligne + +m.ventes_directes)} de recettes, ${eur(+m.depenses)} de dépenses`;
        }).join('. ')}.`}>
        <div className="graph-y" aria-hidden="true">
          <span>{eur(plafond)}</span>
          <span>{eur(plafond / 2)}</span>
          <span>0</span>
        </div>
        <div className="graph-plot" aria-hidden="true">
          <div className="graph-grille"><i /><i /><i /></div>
          {donnees.map((m) => {
            const d = new Date(m.mois);
            const rec = +m.ventes_ligne + +m.ventes_directes;
            return (
              <div className="graph-col" key={m.mois} style={{ width: `${L}%` }}>
                <div className="graph-barres">
                  <span className="b-rec" style={{ height: `${hauteur(rec)}%` }}
                    title={`${eur(rec)} de recettes`} />
                  <span className="b-dep" style={{ height: `${hauteur(+m.depenses)}%` }}
                    title={`${eur(+m.depenses)} de dépenses`} />
                </div>
                <span className="graph-x">{MOIS_COURTS[d.getMonth()]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="graph-leg">
        <span><i className="b-rec" />Recettes</span>
        <span><i className="b-dep" />Dépenses</span>
      </div>
    </div>
  );
}
