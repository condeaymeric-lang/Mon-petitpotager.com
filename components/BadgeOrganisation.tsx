const LIBELLE: Record<string, string> = {
  mairie: 'Mairie',
  association: 'Association',
  collectif: 'Collectif',
};

interface Porteur {
  organisation?: string | null;
  organisation_nom?: string | null;
  organisation_verifiee?: boolean | null;
}

/**
 * Signale qu'un membre porte aussi une structure.
 *
 * Le rôle — producteur, jardinier amateur, acheteur — et la structure
 * sont deux choses distinctes : on peut tenir une association tout en
 * étant amateur, ou une mairie sans rien vendre. Les deux s'affichent
 * donc côte à côte, et non l'un à la place de l'autre.
 */
export function BadgeOrganisation({ p }: { p: Porteur }) {
  if (!p.organisation) return null;

  return (
    <span className={`badge ${p.organisation_verifiee ? 'b-ok' : 'b-done'}`}>
      {LIBELLE[p.organisation] ?? p.organisation}
      {p.organisation_nom ? ` · ${p.organisation_nom}` : ''}
      {p.organisation_verifiee ? '' : ' (non vérifiée)'}
    </span>
  );
}

/** Ligne détaillée, pour la fiche complète. */
export function LigneOrganisation({ p }: { p: Porteur }) {
  if (!p.organisation) return null;

  return (
    <div className="card">
      <h3>Structure</h3>
      <p className="muted" style={{ marginTop: 7 }}>
        Ce membre porte également {p.organisation === 'mairie' ? 'une mairie'
          : p.organisation === 'association' ? 'une association' : 'un collectif'}
        {p.organisation_nom ? ` : ${p.organisation_nom}` : ''}.
        {p.organisation_verifiee
          ? ' La structure a été vérifiée par la modération.'
          : " La structure est déclarée mais n'a pas encore été vérifiée : recoupez l'information auprès d'elle."}
      </p>
    </div>
  );
}
