import PageLegale from '@/components/PageLegale';
import { eur, FRAIS_SERVICE, RAYON_DEFAUT, PALIER_POINTS, PALIER_EUROS } from '@/lib/utils';

export const metadata = { title: 'CGU et CGV — monpetitpotager.com' };

export default function Cgu() {
  return (
    <PageLegale titre="Conditions générales" maj="2 août 2026">
      <h2>1. Objet</h2>
      <p>
        monpetitpotager.com est un service de mise en relation entre habitants
        d&apos;un même secteur : jardiniers amateurs, producteurs professionnels et
        acheteurs. L&apos;éditeur n&apos;est ni vendeur, ni producteur : il fournit
        l&apos;outil qui permet aux membres d&apos;échanger entre eux.
      </p>

      <h2>2. Inscription</h2>
      <p>
        L&apos;inscription est gratuite et réservée aux personnes majeures. Chaque
        membre choisit une commune de rattachement, qui détermine son secteur.
        Vous vous engagez à fournir des informations exactes et à ne pas usurper
        l&apos;identité d&apos;autrui.
      </p>

      <h2>3. Périmètre géographique</h2>
      <p>
        Vous ne voyez que les annonces situées dans un rayon de {RAYON_DEFAUT} km
        autour de votre commune (réglable dans votre profil). Cette limite est un
        principe du service, sans exception. Vous pouvez modifier votre commune de
        rattachement et votre rayon à tout moment depuis votre profil.
      </p>

      <h2>4. Publication des annonces</h2>
      <p>
        Vous êtes seul responsable du contenu que vous publiez, de son exactitude et
        de sa conformité à la réglementation applicable, notamment en matière
        d&apos;hygiène, d&apos;étiquetage et de traçabilité des denrées alimentaires.
      </p>
      <p>Sont notamment interdits :</p>
      <ul>
        <li>les produits dont la vente est réglementée ou interdite entre particuliers ;</li>
        <li>l&apos;alcool, les médicaments, les animaux vivants ;</li>
        <li>toute annonce trompeuse sur la nature, l&apos;origine ou la quantité du produit ;</li>
        <li>tout contenu injurieux, discriminatoire ou portant atteinte à autrui.</li>
      </ul>
      <p>
        L&apos;éditeur peut retirer sans préavis une annonce manifestement illicite qui
        lui est signalée.
      </p>

      <h2>5. Vente, troc et don</h2>
      <p>
        Trois modes sont possibles. <b>Le troc et le don sont entièrement gratuits :
        aucun frais, aucune commission, et cela ne changera pas.</b> Les frais de
        service ne s&apos;appliquent qu&apos;aux paniers contenant au moins un produit
        vendu.
      </p>

      <h2>6. Prix et frais de service</h2>
      <p>
        Les prix sont fixés librement par les vendeurs, toutes taxes comprises. Un frais
        de service de {eur(FRAIS_SERVICE)} par commande contenant une vente est ajouté
        au moment de la validation du panier. Il est affiché avant toute confirmation.
      </p>
      <p>
        Les prix de référence « en grande surface » affichés à titre de comparaison sont
        indicatifs et varient selon la saison et la région.
      </p>

      <h2>7. Paiement</h2>
      <p>
        <b>À ce jour, le paiement en ligne n&apos;est pas activé.</b> Les commandes sont
        enregistrées par le service, mais le règlement s&apos;effectue directement entre
        l&apos;acheteur et le vendeur au moment du retrait. L&apos;éditeur
        n&apos;encaisse aucune somme et ne détient aucun fonds.
      </p>
      <p>
        Lorsque le paiement en ligne sera activé, le principe suivant s&apos;appliquera :
        le vendeur n&apos;est payé qu&apos;après confirmation du retrait par
        l&apos;acheteur.
      </p>

      <h2>8. Retrait des commandes</h2>
      <p>
        Le retrait s&apos;effectue en main propre ou dans un point relais tenu par un
        membre du secteur. Les modalités sont convenues entre les parties. L&apos;éditeur
        n&apos;assure aucun transport ni aucune livraison.
      </p>

      <h2>9. Points de fidélité et bons d&apos;achat</h2>
      <p>
        Les points sont attribués lors de la publication d&apos;annonces et des achats.
        Ils ne constituent pas une monnaie et ne sont pas dépensables directement.
      </p>
      <p>
        À partir de {PALIER_POINTS} points, le membre peut demander leur conversion en un
        bon d&apos;achat de {eur(PALIER_EUROS)}. La conversion débite définitivement les
        points correspondants. Le bon est nominatif, à usage unique, valable un an à
        compter de son émission, et déductible du sous-total d&apos;une commande. Si le
        montant du bon dépasse celui de la commande, la différence n&apos;est ni reportée
        ni remboursée.
      </p>
      <p>
        Les points comme les bons sont strictement personnels, non cessibles, sans valeur
        monétaire et ne peuvent en aucun cas être échangés contre de l&apos;argent. Ils
        sont perdus à la fermeture du compte.
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        La vente s&apos;effectue entre membres. L&apos;éditeur n&apos;est pas partie au
        contrat de vente et ne garantit ni la qualité, ni la conformité, ni la
        disponibilité effective des produits. Il met en œuvre les moyens raisonnables
        pour assurer la disponibilité du service, sans garantie d&apos;absence
        d&apos;interruption.
      </p>

      <h2>11. Droit de rétractation</h2>
      <p>
        Les ventes entre particuliers ne relèvent pas du droit de la consommation : le
        droit de rétractation ne s&apos;applique pas. Pour les vendeurs professionnels,
        les denrées périssables en sont exclues par l&apos;article L221-28 du code de la
        consommation.
      </p>

      <h2>12. Fermeture du compte</h2>
      <p>
        Vous pouvez demander la suppression de votre compte à tout moment via le{' '}
        <a href="/contact">formulaire de contact</a>. L&apos;éditeur peut suspendre un
        compte en cas de manquement grave aux présentes conditions.
      </p>

      <h2>13. Modification des conditions</h2>
      <p>
        Les présentes conditions peuvent évoluer. Les membres sont informés des
        modifications substantielles, qui ne s&apos;appliquent pas aux commandes déjà
        passées.
      </p>

      <h2>14. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, une
        solution amiable sera recherchée en priorité, y compris par recours à un
        médiateur de la consommation lorsque celui-ci est applicable.
      </p>
    </PageLegale>
  );
}
