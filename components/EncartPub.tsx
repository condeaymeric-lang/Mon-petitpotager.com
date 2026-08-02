import Link from 'next/link';

/**
 * Emplacement réservé à une future annonce publicitaire.
 *
 * Il n'affiche aucune publicité inventée : tant qu'aucun annonceur
 * n'est signé, l'encart dit ce qu'il est et propose de le réserver.
 * Le jour venu, il suffira d'y injecter le contenu de l'annonceur.
 */
export function EncartPub({
  format = 'colonne', libelle,
}: { format?: 'colonne' | 'banniere'; libelle?: string }) {
  return (
    <aside className={`pub pub-${format}`} aria-label="Emplacement publicitaire">
      <span className="pub-etiq">Emplacement publicitaire</span>
      <p>
        {libelle ?? 'Cet espace est réservé aux producteurs et artisans du secteur.'}
      </p>
      <Link href="/contact" className="pub-lien">Réserver cet espace</Link>
    </aside>
  );
}

/**
 * La colonne publicitaire, posée une fois pour toutes à droite de la
 * mise en page. Elle n'apparaît que sur les écrans assez larges pour
 * l'accueillir sans rogner le contenu.
 */
export function ColonnePub() {
  return (
    <div className="rail rail-d">
      <EncartPub libelle="Votre ferme, votre boutique, votre marché : visibles ici, auprès de vos voisins seulement." />
    </div>
  );
}
