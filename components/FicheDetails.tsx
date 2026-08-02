const PAIEMENTS: Record<string, string> = {
  especes: 'Espèces', carte: 'Carte', cheque: 'Chèque', virement: 'Virement',
};

interface Details {
  role?: string | null;
  specialites?: string | null;
  disponibilites?: string | null;
  moyens_paiement?: string[] | null;
  methode_culture?: string | null;
  label_qualite?: string | null;
  annee_installation?: number | null;
  surface_ha?: number | null;
  site_web?: string | null;
  reseau_social?: string | null;
}

/** Adresse rendue cliquable sans supposer que la personne a tapé le protocole. */
function lien(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Les renseignements complémentaires d'une fiche, quand ils existent.
 * Rien n'est affiché à vide : une fiche à moitié remplie donne une
 * plus mauvaise impression qu'une fiche courte.
 */
export function FicheDetails({ p }: { p: Details }) {
  const paiements = (p.moyens_paiement ?? []).map((m) => PAIEMENTS[m] ?? m);

  const lignes: [string, string][] = [];
  if (p.specialites) lignes.push(['Productions', p.specialites]);
  if (p.methode_culture) lignes.push(['Méthode de culture', p.methode_culture]);
  if (p.label_qualite) lignes.push(['Label', p.label_qualite]);
  if (p.annee_installation) lignes.push(['Installé depuis', String(p.annee_installation)]);
  if (p.surface_ha) lignes.push(['Surface exploitée', `${(+p.surface_ha).toLocaleString('fr-FR')} ha`]);
  if (p.disponibilites) lignes.push(['Disponibilités', p.disponibilites]);
  if (paiements.length) lignes.push(['Paiements acceptés', paiements.join(', ')]);

  const liens = [
    p.site_web && { url: p.site_web, label: 'Site internet' },
    p.reseau_social && { url: p.reseau_social, label: 'Page sur les réseaux' },
  ].filter(Boolean) as { url: string; label: string }[];

  if (lignes.length === 0 && liens.length === 0) return null;

  return (
    <div className="card">
      <h3>En pratique</h3>
      {lignes.length > 0 && (
        <dl className="fiche-dl">
          {lignes.map(([cle, valeur]) => (
            <div key={cle}>
              <dt>{cle}</dt>
              <dd>{valeur}</dd>
            </div>
          ))}
        </dl>
      )}
      {liens.length > 0 && (
        <p className="fiche-liens">
          {liens.map((l) => (
            <a key={l.url} href={lien(l.url)} target="_blank" rel="noopener noreferrer nofollow">
              {l.label}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}
