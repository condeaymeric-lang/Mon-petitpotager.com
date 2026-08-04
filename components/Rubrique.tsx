import Link from 'next/link';

export interface Raccourci {
  href: string;
  label: string;
  actif?: boolean;
}

/**
 * Titre de rubrique aux couleurs du site, avec sa ligne de raccourcis
 * dépliée juste en dessous. Un titre seul ne disait pas ce qu'on
 * trouvait dans la rubrique, ni où aller ensuite.
 */
export default function Rubrique({
  id, titre, aide, icone, lien, lienLabel, raccourcis, children,
}: {
  id: string; titre: string; aide?: string; icone: string;
  lien?: string; lienLabel?: string;
  raccourcis?: Raccourci[];
  children: React.ReactNode;
}) {
  return (
    <section className="rub" aria-labelledby={id}>
      <div className="rub-head">
        <span className="rub-ico" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24"><path d={icone} /></svg>
        </span>
        <span className="rub-t">
          <h2 id={id}>{titre}</h2>
          {aide && <p>{aide}</p>}
        </span>
        {lien && <Link href={lien} className="rub-lien">{lienLabel ?? 'Tout voir'}</Link>}
      </div>

      {raccourcis && raccourcis.length > 0 && (
        <nav className="rub-racc" aria-label={`Raccourcis : ${titre}`}>
          {raccourcis.map((r) => (
            <Link key={r.href} href={r.href} className={r.actif ? 'on' : ''}>{r.label}</Link>
          ))}
        </nav>
      )}

      {children}
    </section>
  );
}
