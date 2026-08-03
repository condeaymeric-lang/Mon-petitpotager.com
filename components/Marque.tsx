/**
 * Le logo de la marque, dans sa version dessinée.
 *
 * Deux déclinaisons du même fichier : le mot-symbole seul, et le
 * mot-symbole accompagné de sa signature. La hauteur est toujours
 * imposée, la largeur suit, pour que le logo ne se déforme jamais.
 */
export function Marque({
  hauteur = 44, signature = false, clair = false, className,
}: { hauteur?: number; signature?: boolean; clair?: boolean; className?: string }) {
  // Version claire pour les fonds sombres : le logo d'origine, en encre
  // vert foncé, y devient illisible.
  const src = signature
    ? (clair ? '/logo-complet-clair.png' : '/logo-complet.png')
    : (clair ? '/logo-clair.png' : '/logo.png');
  // Rapports mesurés sur les fichiers : 620×319 et 700×478.
  const ratio = signature ? 700 / 478 : 620 / 319;

  return (
    <img
      src={src}
      alt="mon-petitpotager.com"
      width={Math.round(hauteur * ratio)}
      height={hauteur}
      className={className}
      style={{ height: hauteur, width: 'auto', display: 'block' }}
    />
  );
}
