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
 * Les deux colonnes latérales, placées une fois pour toutes autour de
 * la mise en page. Elles n'apparaissent que sur les écrans assez larges
 * pour les accueillir sans rogner le contenu.
 */
export function ColonnesPub() {
  return (
    <>
      <div className="rail rail-g" aria-hidden={false}><EncartPub /></div>
      <div className="rail rail-d">
        <EncartPub libelle="Votre ferme, votre boutique, votre marché : visibles ici, auprès de vos voisins seulement." />
      </div>
    </>
  );
}
