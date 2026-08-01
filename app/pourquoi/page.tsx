import Link from 'next/link';
import { eur } from '@/lib/utils';

const RAISONS = [
  { t: 'Votre argent est protégé',
    d: "Le paiement n'est reversé au vendeur qu'après votre confirmation de retrait. Si le panier n'est pas conforme ou n'arrive jamais, vous êtes remboursé. En direct, vous n'avez aucun recours.",
    p: 'M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6z M9 12l2 2 4-4' },
  { t: 'Vous savez à qui vous avez affaire',
    d: "Avis, historique de ventes, badge vérifié pour les professionnels. Un vendeur qui triche perd sa réputation, et il le sait. C'est ce qui rend la confiance possible entre inconnus.",
    p: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8' },
  { t: 'Moins cher que la grande surface',
    d: "Sans centrale d'achat, sans transport longue distance et sans marge de distributeur, les prix sont en moyenne 20 à 40 % en dessous. Et vous cumulez des points sur chaque commande.",
    p: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { t: 'Un revenu réel pour vos voisins',
    d: "Le jardinier qui vend son surplus, le maraîcher qui remplit sa semaine, l'habitant qui tient un point relais : chacun touche directement. Rien ne part dans une marge intermédiaire.",
    p: 'M3 3v18h18 M7 15l4-5 3 3 5-7' },
  { t: 'Un seul déplacement',
    d: "Commandez chez trois producteurs différents, payez une fois, retirez tout au même point relais. En direct, il faudrait trois trajets et trois rendez-vous.",
    p: 'M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z M12 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6' },
  { t: 'Vous soutenez les pros du coin',
    d: "Fermes, artisans, commerces et associations du secteur y ont leur place. Chaque commande fait tourner l'économie de votre territoire plutôt qu'un entrepôt à 400 km.",
    p: 'M3 21h18M5 21V8l7-5 7 5v13 M10 21v-6h4v6' },
  { t: 'Rien ne se perd',
    d: "Vente, troc ou don : les surplus qui finissaient au compost trouvent preneur. C'est souvent là que commence la première rencontre entre voisins.",
    p: 'M16 3l4 4-4 4M20 7H9a5 5 0 0 0-5 5M8 21l-4-4 4-4M4 17h11a5 5 0 0 0 5-5' },
];

const PANIER = [
  ['1 kg de tomates', 3.0, 4.5],
  ['1 barquette de fraises', 3.2, 4.8],
  ['6 œufs plein air', 2.1, 2.9],
];

export default function Pourquoi() {
  const eco = PANIER.reduce((a, [, p, r]) => a + ((r as number) - (p as number)), 0);
  return (
    <div className="app has-tabbar"><div className="page">
      <div className="page-head">
        <h1>Pourquoi passer par l'application ?</h1>
        <p>Vous pourriez frapper à la porte de votre voisin. Voici ce que l'application ajoute.</p>
      </div>

      <div className="pourquoi-layout">
        <div className="why">
          {RAISONS.map((r) => (
            <div key={r.t} className="why-i">
              <div className="ic">
                <svg width="19" height="19" viewBox="0 0 24 24"><path d={r.p} /></svg>
              </div>
              <div><h4>{r.t}</h4><p>{r.d}</p></div>
            </div>
          ))}
        </div>

        <div className="pourquoi-aside">
          <div className="compare">
            <h3>Un panier type, comparé</h3>
            {PANIER.map(([nom, prix, ref]) => (
              <div key={nom as string}>
                <div className="crow"><span>{nom as string}</span><b className="good">{eur(prix as number)}</b></div>
                <div className="crow">
                  <span>En grande surface</span>
                  <b style={{ opacity: .55, textDecoration: 'line-through' }}>{eur(ref as number)}</b>
                </div>
              </div>
            ))}
            <div className="crow" style={{ paddingTop: 16 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Vous économisez</span>
              <b className="good" style={{ fontSize: '1.4rem' }}>{eur(eco)}</b>
            </div>
            <p className="tiny" style={{ color: 'rgba(255,255,255,.5)', marginTop: 12 }}>
              Prix de référence indicatifs relevés en grande surface. Ils varient selon la saison et la région.
            </p>
          </div>

          <Link className="btn btn-p" href="/" style={{ marginTop: 14 }}>
            Voir ce qui pousse près de chez moi
          </Link>
        </div>
      </div>
    </div></div>
  );
}
