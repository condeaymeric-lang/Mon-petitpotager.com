'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePanier } from '@/components/PanierContext';
import { useToast } from '@/components/Toast';
import { Illustration } from '@/components/Illustrations';
import { creerClient } from '@/lib/supabase-client';
import { eur, FRAIS_SERVICE, PALIER_POINTS, PALIER_EUROS } from '@/lib/utils';

interface Bon {
  id: string;
  code: string;
  montant: number;
  expire_le: string;
}

interface Relais {
  id: string;
  prenom: string;
  relais_adresse: string | null;
  relais_horaires: string | null;
}

export default function ContenuPanier({
  points, secteurCode, commune, relais,
}: { points: number; secteurCode: string | null; commune: string; relais: Relais[] }) {
  const { lignes, sousTotal, totalReference, modifier, vider } = usePanier();
  const [bons, setBons] = useState<Bon[]>([]);
  const [bonId, setBonId] = useState('');
  const [retrait, setRetrait] = useState<'relais' | 'main_propre'>(relais.length > 0 ? 'relais' : 'main_propre');
  const [relaisId, setRelaisId] = useState(relais[0]?.id ?? '');
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Le troc et le don sont gratuits, sans frais, pour toujours : les frais de
  // service ne s'appliquent que s'il y a au moins un produit vendu dans le panier.
  const aDesVentes = lignes.some((l) => l.mode === 'vente');
  const fraisService = aDesVentes ? FRAIS_SERVICE : 0;

  // Bons d'achat disponibles : non utilisés et non expirés.
  useEffect(() => {
    const sb = creerClient();
    sb.from('bons_achat')
      .select('id, code, montant, expire_le')
      .eq('utilise', false)
      .gt('expire_le', new Date().toISOString())
      .order('expire_le', { ascending: true })
      .then(({ data }) => setBons((data ?? []) as Bon[]));
  }, []);

  const bonChoisi = bons.find((b) => b.id === bonId) ?? null;
  // Un bon ne peut pas dépasser le montant du panier : le reliquat est perdu,
  // on prévient donc l'acheteur avant qu'il ne l'utilise.
  const reduction = bonChoisi ? Math.min(bonChoisi.montant, sousTotal) : 0;
  const total = Math.max(0, sousTotal - reduction) + fraisService;
  const economie = totalReference - sousTotal;

  const groupes = useMemo(() => {
    const g: Record<string, typeof lignes> = {};
    lignes.forEach((l) => { (g[l.vendeur_prenom] ||= []).push(l); });
    return g;
  }, [lignes]);

  async function valider() {
    if (!lignes.length) return;
    if (retrait === 'relais' && !relaisId) { toast('Choisissez un point relais.'); return; }
    setEnvoi(true);
    const sb = creerClient();

    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setEnvoi(false); router.push('/connexion'); return; }

    const relaisChoisi = relais.find((r) => r.id === relaisId);
    const adresse = retrait === 'relais' && relaisChoisi
      ? `${relaisChoisi.relais_adresse}, ${commune}`
      : 'Remise en main propre';

    const { data: commande, error } = await sb.from('commandes').insert({
      acheteur_id: user.id,
      secteur: secteurCode,
      sous_total: sousTotal,
      reduction,
      bon_id: bonChoisi?.id ?? null,
      points_utilises: 0,
      frais_service: fraisService,
      total,
      mode_retrait: retrait,
      relais_id: retrait === 'relais' ? relaisId : null,
      adresse_retrait: adresse,
      statut: 'confirmee',
      paye_le: new Date().toISOString(),
    }).select().single();

    if (error || !commande) {
      setEnvoi(false);
      toast('Commande impossible. Réessayez.');
      return;
    }

    const { error: eLignes } = await sb.from('lignes_commande').insert(
      lignes.map((l) => ({
        commande_id: commande.id,
        annonce_id: l.annonce_id,
        vendeur_id: l.vendeur_id,
        titre: l.titre,
        variete: l.variete,
        photo: l.photo,
        prix_unitaire: l.prix,
        quantite: l.quantite,
      }))
    );

    if (eLignes) {
      // On annule la commande pour ne pas laisser d'orpheline en base.
      await sb.from('commandes').update({ statut: 'annulee' }).eq('id', commande.id);
      setEnvoi(false);
      toast("Le détail de la commande n'a pas pu être enregistré.");
      return;
    }

    // Décrémenter les stocks
    await Promise.all(lignes.map(async (l) => {
      const reste = Math.max(0, l.stock - l.quantite);
      await sb.from('annonces')
        .update({ quantite: reste, statut: reste === 0 ? 'epuise' : 'en_ligne' })
        .eq('id', l.annonce_id);
    }));

    // Le bon est consommé : la condition « utilise = false » dans la requête
    // empêche qu'il serve deux fois si deux onglets valident en même temps.
    if (bonChoisi) {
      const { error: eBon } = await sb.rpc('utiliser_bon', {
        p_bon: bonChoisi.id, p_commande: commande.id,
      });
      if (eBon) {
        // Le bon n'a pas pu être consommé : on ne fait pas cadeau de la
        // réduction, on repasse la commande au montant plein.
        await sb.from('commandes')
          .update({ reduction: 0, bon_id: null, total: sousTotal + fraisService })
          .eq('id', commande.id);
        toast("Le bon d'achat n'a pas pu être appliqué : commande au tarif normal.");
      }
    }
    // Les points de l'achat sont crédités : ils se convertiront en bon plus tard.
    await sb.rpc('ajouter_points', {
      p_profil: user.id, p_montant: Math.floor(sousTotal),
      p_motif: `Achat — ${commande.reference}`, p_commande: commande.id,
    });

    vider();
    toast(`Commande confirmée · +${Math.floor(sousTotal)} points`);
    router.push(`/commandes/${commande.id}`);
    router.refresh();
  }

  if (!lignes.length) {
    return (
      <div className="page page-form"><div className="empty">
        <Illustration nom="plant" className="e-ico" />
        <h3>Votre panier est vide</h3>
        <p>Composez un panier auprès de plusieurs voisins : vous ne paierez et ne vous déplacerez qu'une fois.</p>
        <Link className="btn btn-p" href="/">Voir les annonces</Link>
      </div></div>
    );
  }

  return (
    <div className="page page-form">
      <div className="page-head">
        <h1>Mon panier</h1>
        <p>
          {lignes.length} produit{lignes.length > 1 ? 's' : ''} chez {Object.keys(groupes).length}{' '}
          vendeur{Object.keys(groupes).length > 1 ? 's' : ''} — un seul retrait.
        </p>
      </div>

      {Object.entries(groupes).map(([vendeur, items]) => (
        <div className="card" key={vendeur}>
          <div className="grp-head">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6FA83A" strokeWidth="2.2">
              <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {vendeur} · {items[0].commune}
          </div>
          {items.map((l) => (
            <div className="line" key={l.annonce_id}>
              <div className="th">
                {l.photo ? <img src={l.photo} alt="" loading="lazy" /> : <Illustration />}
              </div>
              <div className="line-b">
                <h4>{l.titre}</h4>
                <p>
                  {l.variete ? `${l.variete} · ` : ''}
                  {l.mode === 'don' ? 'Don' : l.mode === 'troc' ? 'Troc' : `${eur(l.prix)} / ${l.unite}`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="qty">
                  <button onClick={() => modifier(l.annonce_id, l.quantite - 1)} aria-label={`Diminuer la quantité de ${l.titre}`}>−</button>
                  <span>{l.quantite}</span>
                  <button aria-label={`Augmenter la quantité de ${l.titre}`}
                    onClick={() => {
                      if (l.quantite >= l.stock) { toast('Stock maximum atteint'); return; }
                      modifier(l.annonce_id, l.quantite + 1);
                    }}>+</button>
                </div>
                <p className="tiny" style={{ marginTop: 5 }}>
                  {l.mode === 'vente' ? eur(l.prix * l.quantite) : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ))}

      {economie > 0.05 && (
        <div className="priceref" style={{ marginTop: 12 }}>
          <b>Vous économisez {eur(economie)} par rapport à la grande surface</b>
          <p>Sur la base des prix moyens constatés pour les mêmes produits.</p>
        </div>
      )}

      {aDesVentes && (
        <div className="card">
          <h3>Mes bons d'achat</h3>
          <p className="tiny" style={{ marginTop: 5 }}>
            {points} points cumulés. {PALIER_POINTS} points se convertissent en un bon de{' '}
            {eur(PALIER_EUROS)} depuis votre profil.
          </p>
          {bons.length > 0 ? (
            <div className="var-list" style={{ marginTop: 12 }} role="group" aria-label="Bon d'achat à utiliser">
              <button type="button" className={`var-btn${bonId === '' ? ' on' : ''}`} onClick={() => setBonId('')}>
                <div><b>Ne pas utiliser de bon</b><span>Vos bons restent valables pour une prochaine commande.</span></div>
              </button>
              {bons.map((b) => (
                <button key={b.id} type="button" className={`var-btn${bonId === b.id ? ' on' : ''}`}
                  onClick={() => setBonId(b.id)}>
                  <div>
                    <b>{b.code} · {eur(b.montant)}</b>
                    <span>Valable jusqu'au {new Date(b.expire_le).toLocaleDateString('fr-FR')}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="tiny" style={{ marginTop: 10 }}>
              Aucun bon disponible. Cumulez des points en achetant, en publiant et en vendant.
            </p>
          )}
          {bonChoisi && bonChoisi.montant > sousTotal && (
            <p className="tiny" style={{ marginTop: 10, color: 'var(--bark)' }} aria-live="polite">
              Ce bon vaut {eur(bonChoisi.montant)} et votre panier {eur(sousTotal)} : la différence
              ne sera pas reportée sur une prochaine commande.
            </p>
          )}
        </div>
      )}

      <div className="card">
        <div className="sum-row"><span>Sous-total</span><span>{eur(sousTotal)}</span></div>
        {reduction > 0 && bonChoisi && (
          <div className="sum-row disc">
            <span>Bon d'achat {bonChoisi.code}</span><span>−{eur(reduction)}</span>
          </div>
        )}
        <div className="sum-row">
          <span>Frais de service</span>
          <span>{aDesVentes ? eur(fraisService) : 'Aucun (troc et dons)'}</span>
        </div>
        <div className="sum-row total"><span>À payer</span><b>{eur(total)}</b></div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label id="retrait-label">Retrait</label>
        <div className="seg" role="group" aria-labelledby="retrait-label">
          {relais.length > 0 && (
            <button type="button" className={retrait === 'relais' ? 'on' : ''} onClick={() => setRetrait('relais')}>
              Point relais
            </button>
          )}
          <button type="button" className={retrait === 'main_propre' ? 'on' : ''} onClick={() => setRetrait('main_propre')}>
            Main propre
          </button>
        </div>
        {retrait === 'relais' && (
          relais.length > 0 ? (
            <div className="var-list" style={{ marginTop: 10 }}>
              {relais.map((r) => (
                <button key={r.id} type="button"
                  className={`var-btn${relaisId === r.id ? ' on' : ''}`}
                  onClick={() => setRelaisId(r.id)}>
                  <div>
                    <b>Chez {r.prenom}</b>
                    <span>{r.relais_adresse}{r.relais_horaires ? ` · ${r.relais_horaires}` : ''}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="tiny" style={{ marginTop: 8 }}>
              Aucun point relais n'est encore disponible dans ce secteur.
            </p>
          )
        )}
      </div>

      <button className="btn btn-p" onClick={valider} disabled={envoi}>
        {envoi ? 'Validation…' : `Valider ma commande — ${eur(total)}`}
      </button>
      <p className="tiny center" style={{ marginTop: 11 }}>
        Le vendeur n'est payé qu'après votre confirmation de retrait.
        Le paiement en ligne (Stripe) n'est pas encore branché : réglez sur place.
      </p>
    </div>
  );
}
