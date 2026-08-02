/**
 * Le logo de la marque, dans sa version dessinée.
 *
 * Deux déclinaisons du même fichier : le mot-symbole seul, et le
 * mot-symbole accompagné de sa signature. La hauteur est toujours
 * imposée, la largeur suit, pour que le logo ne se déforme jamais.
 */
export function Marque({
  hauteur = 44, signature = false, className,
}: { hauteur?: number; signature?: boolean; className?: string }) {
  const src = signature ? '/logo-complet.png' : '/logo.png';
  // Rapports mesurés sur les fichiers : 620×319 et 700×478.
  const ratio = signature ? 700 / 478 : 620 / 319;

  return (
    <img
      src={src}
      alt="monpetitpotager.com"
      width={Math.round(hauteur * ratio)}
      height={hauteur}
      className={className}
      style={{ height: hauteur, width: 'auto', display: 'block' }}
    />
  );
}
