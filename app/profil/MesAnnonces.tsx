import Link from 'next/link';
import { Illustration } from '@/components/Illustrations';
import { eur } from '@/lib/utils';

export interface AnnonceCourte {
  id: string;
  titre: string;
  variete_libre: string | null;
  mode: string;
  prix: number;
  unite: string;
  quantite: number;
  statut: string;
  photos: string[] | null;
  est_lot: boolean;
  produit: { illustration: string | null } | null;
  variete: { nom: string; illustration: string | null } | null;
}

const STATUTS: Record<string, [string, string]> = {
  en_ligne: ['En ligne', 'b-ok'],
  epuise: ['Épuisée', 'b-am'],
  retire: ['Retirée', 'b-done'],
};

/**
 * Les annonces du membre, directement sur son profil.
 *
 * Il fallait auparavant passer en mode vendeur puis ouvrir un onglet
 * pour les retrouver. Elles sont ici, avec le bouton de modification
 * sur chaque ligne : deux clics de moins à chaque correction.
 */
export function MesAnnonces({ annonces, total }: { annonces: AnnonceCourte[]; total: number }) {
  return (
    <div className="card">
      <div className="bloc-head" style={{ marginBottom: 0 }}>
        <h3>Mes annonces{total > 0 && ` (${total})`}</h3>
        {total > annonces.length && (
          <Link href="/vendre/annonces" className="tiny">Toutes</Link>
        )}
      </div>

      {annonces.length > 0 ? (
        <div style={{ marginTop: 6 }}>
          {annonces.map((a) => {
            const [libelle, classe] = STATUTS[a.statut] ?? [a.statut, 'b-am'];
            const nomVariete = a.variete?.nom ?? a.variete_libre;
            return (
              <div className="line" key={a.id}>
                <Link href={`/annonce/${a.id}`} className="th">
                  {a.photos?.[0]
                    ? <img src={a.photos[0]} alt="" loading="lazy" />
                    : <Illustration nom={a.variete?.illustration ?? a.produit?.illustration
                        ?? (a.est_lot ? 'bocal' : null)} />}
                </Link>
                <div className="line-b">
                  <h4>
                    <Link href={`/annonce/${a.id}`}>{a.titre}</Link>
                    {nomVariete ? ` — ${nomVariete}` : ''}
                  </h4>
                  <p>
                    <span className={`badge ${classe}`}>{libelle}</span>
                    {' '}
                    {a.mode === 'vente' ? `${eur(a.prix)} / ${a.unite}`
                      : a.mode === 'troc' ? 'Troc' : 'Don'}
                    {' · '}{a.quantite} restant{a.quantite > 1 ? 's' : ''}
                  </p>
                </div>
                <Link className="btn btn-s btn-sm" href={`/vendre/annonces/${a.id}/modifier`}>
                  Modifier
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 8 }}>
          Vous n&apos;avez encore rien publié. Un surplus de courgettes suffit
          pour commencer.
        </p>
      )}

      <div className="row-btn" style={{ marginTop: 14 }}>
        <Link className="btn btn-p" style={{ flex: 1 }} href="/vendre/publier">
          Publier une annonce
        </Link>
        <Link className="btn btn-s" style={{ flex: 1 }} href="/vendre/publier/panier">
          Composer un panier
        </Link>
      </div>
    </div>
  );
}

/** Raccourcis vers les espaces du membre, pour éviter les détours. */
export function Raccourcis({
  estPro, moderateur, organisation, nbNonLus,
}: { estPro: boolean; moderateur: boolean; organisation: boolean; nbNonLus: number }) {
  const liens = [
    { href: '/vendre/annonces', label: 'Mes annonces',
      d: 'M4 4h16v16H4zM4 9h16M9 9v11' },
    { href: '/commandes', label: 'Mes achats',
      d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
    { href: '/vendre/commandes', label: 'Mes ventes',
      d: 'M18.5 6.5a7 7 0 1 0 0 11M4 10.5h11M4 14h9.5' },
    { href: '/messages', label: 'Messages', badge: nbNonLus,
      d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.1-4.1A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z' },
    { href: '/place', label: 'La place',
      d: 'M3 21h18M6 21V11M18 21V11M4 11h16l-8-6-8 6ZM10 21v-5h4v5' },
    ...(organisation ? [{ href: '/officiel', label: 'Ma structure',
      d: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6' }] : []),
    { href: '/evenements', label: 'Événements',
      d: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z' },
    ...(estPro ? [{ href: '/vendre/gestion', label: 'Gestion',
      d: 'M3 3v18h18M7 15l4-5 3 3 5-7' }] : []),
    ...(moderateur ? [{ href: '/moderation', label: 'Modération',
      d: 'M12 2 4 6v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10V6Z' }] : []),
  ];

  return (
    <div className="raccourcis">
      {liens.map((l) => (
        <Link key={l.href} href={l.href} className="raccourci">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={l.d} />
          </svg>
          {l.label}
          {!!l.badge && l.badge > 0 && <span className="raccourci-pastille">{l.badge}</span>}
        </Link>
      ))}
    </div>
  );
}
