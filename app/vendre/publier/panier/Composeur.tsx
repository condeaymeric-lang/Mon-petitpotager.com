'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { Illustration } from '@/components/Illustrations';
import { eur, estDeSaison } from '@/lib/utils';
import type { Produit, Variete, Profil, Secteur } from '@/lib/types';

interface Composant {
  produit: Produit;
  quantite: string;
  variete: Variete | null;
  varieteLibre: string;
  /** Le sélecteur de variété n'est déplié que sur demande. */
  ouvert: boolean;
}

/**
 * Composition d'un panier : plusieurs produits vendus ensemble à un
 * prix unique. La comparaison grande surface est la somme des prix de
 * référence de chaque composant, donc vérifiable ligne à ligne.
 */
export default function Composeur({
  produits, varietes, profil, secteur, communes,
}: {
  produits: Produit[]; varietes: Variete[]; profil: Profil;
  secteur: Secteur; communes: string[];
}) {
  const [lignes, setLignes] = useState<Composant[]>([]);
  const [recherche, setRecherche] = useState('');
  const [titre, setTitre] = useState('');
  const [prix, setPrix] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [commune, setCommune] = useState(secteur.nom);
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  const estPro = profil.role === 'pro';

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (q.length < 1) return [];
    const dejaLa = new Set(lignes.map((l) => l.produit.id));
    return produits
      .filter((p) => !dejaLa.has(p.id) && p.nom.toLowerCase().includes(q))
      .filter((p) => estPro || !p.transforme)
      .slice(0, 8);
  }, [recherche, produits, lignes, estPro]);

  // Prix grande surface équivalent : on n'additionne que ce dont on
  // connaît la référence, et on le dit si certains produits manquent.
  const { reference, sansReference } = useMemo(() => {
    let total = 0;
    let manquants = 0;
    lignes.forEach((l) => {
      const q = parseFloat(l.quantite.replace(',', '.'));
      if (!(q > 0)) return;
      if (l.produit.prix_ref != null) total += l.produit.prix_ref * q;
      else manquants += 1;
    });
    return { reference: total, sansReference: manquants };
  }, [lignes]);

  const prixNum = parseFloat(prix.replace(',', '.'));
  const ecart = reference > 0 && prixNum > 0 ? reference - prixNum : 0;

  /** Sous-total grande surface d'une ligne, pour rendre l'unité évidente. */
  function sousTotal(l: Composant) {
    const q = parseFloat(l.quantite.replace(',', '.'));
    return q > 0 && l.produit.prix_ref != null ? l.produit.prix_ref * q : 0;
  }

  function ajouter(p: Produit) {
    setLignes((l) => [...l, {
      produit: p, quantite: '1', variete: null, varieteLibre: '', ouvert: false,
    }]);
    setRecherche('');
  }

  function majLigne(id: number, champs: Partial<Composant>) {
    setLignes((l) => l.map((x) => (x.produit.id === id ? { ...x, ...champs } : x)));
  }

  /** Nom de la variété retenue, du catalogue ou saisie à la main. */
  function nomVariete(l: Composant) {
    return l.variete?.nom ?? (l.varieteLibre.trim() || null);
  }

  function retirer(id: number) {
    setLignes((l) => l.filter((x) => x.produit.id !== id));
  }

  async function publier() {
    const valides = lignes.filter((l) => parseFloat(l.quantite.replace(',', '.')) > 0);
    if (valides.length < 2) {
      setErreur('Un panier contient au moins deux produits.');
      return;
    }
    if (!(prixNum > 0)) {
      setErreur('Indiquez un prix supérieur à zéro pour le panier.');
      return;
    }
    setErreur(''); setEnvoi(true);
    const sb = creerClient();

    const nb = Math.max(1, parseInt(quantite) || 1);
    const { data: annonce, error } = await sb.from('annonces').insert({
      vendeur_id: profil.id,
      secteur: secteur.code_insee,
      produit_id: null,
      variete_id: null,
      est_lot: true,
      titre: titre.trim() || 'Panier composé',
      description: description.trim() || null,
      mode: 'vente',
      prix: prixNum,
      unite: 'panier',
      quantite: nb,
      quantite_initiale: nb,
      commune,
      lat: secteur.lat,
      lon: secteur.lon,
      statut: 'en_ligne',
    }).select().single();

    if (error || !annonce) {
      setEnvoi(false);
      setErreur('Publication impossible. Réessayez dans un instant.');
      return;
    }

    const { error: eComp } = await sb.from('composants_lot').insert(
      valides.map((l, i) => ({
        annonce_id: annonce.id,
        produit_id: l.produit.id,
        variete_id: l.variete?.id ?? null,
        variete_libre: l.variete ? null : (l.varieteLibre.trim() || null),
        quantite: parseFloat(l.quantite.replace(',', '.')),
        unite: l.produit.unite,
        position: i,
      }))
    );

    if (eComp) {
      // Sans composants, le panier n'aurait aucun sens : on retire l'annonce.
      await sb.from('annonces').delete().eq('id', annonce.id);
      setEnvoi(false);
      setErreur(
        eComp.message?.includes('professionnels')
          ? "Un produit transformé ne peut entrer dans un panier que sur un compte professionnel."
          : "Le contenu du panier n'a pas pu être enregistré."
      );
      return;
    }

    toast('Panier publié');
    router.push('/vendre/annonces');
    router.refresh();
  }

  return (
    <div className="page page-form">
      <Link href="/vendre/publier" className="back">← Publier autrement</Link>
      <div className="page-head">
        <h1>Composer un panier</h1>
        <p>
          Plusieurs produits vendus ensemble, à un prix unique. Six tomates,
          douze abricots et deux salades dans le même lot.
        </p>
      </div>

      <div className="card">
        <h3>Le contenu</h3>

        <p className="tiny" style={{ marginTop: 6 }}>
          Les quantités s&apos;expriment dans l&apos;unité du catalogue : en kilos
          pour les tomates, à la pièce pour les salades. Le sous-total affiché sous
          chaque ligne vous montre tout de suite si vous vous êtes trompé d&apos;unité.
        </p>

        <label htmlFor="rech-prod" className="tiny" style={{ display: 'block', marginTop: 14 }}>
          Ajouter un produit
        </label>
        <input className="inp" id="rech-prod" type="search" value={recherche}
          placeholder="Tomate, abricot, salade…" autoComplete="off"
          onChange={(e) => setRecherche(e.target.value)} />

        {recherche.trim() && (
          <div className="var-list" style={{ marginTop: 8 }}>
            {resultats.length > 0 ? resultats.map((p) => (
              <button key={p.id} type="button" className="var-btn" onClick={() => ajouter(p)}>
                <div>
                  <b>{p.nom}</b>
                  <span>
                    {p.categorie} · par {p.unite}
                    {p.prix_ref != null && ` · ${eur(p.prix_ref)} en grande surface`}
                    {estDeSaison(p.mois_saison) ? ' · de saison' : ''}
                  </span>
                </div>
              </button>
            )) : (
              <p className="tiny" style={{ padding: '8px 2px' }}>
                Aucun produit ne correspond{!estPro ? ", ou il est réservé aux comptes professionnels" : ''}.
              </p>
            )}
          </div>
        )}

        {lignes.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            {lignes.map((l) => {
              const sesVarietes = varietes.filter((v) => v.produit_id === l.produit.id);
              return (
              <div className="compo" key={l.produit.id}>
              <div className="line">
                <div className="th"><Illustration nom={l.produit.illustration} /></div>
                <div className="line-b">
                  <h4>{l.produit.nom}</h4>
                  <p>
                    {l.produit.prix_ref != null
                      ? `${eur(l.produit.prix_ref)} / ${l.produit.unite} en grande surface`
                      : 'Pas de prix de référence connu'}
                    {l.produit.prix_ref != null && sousTotal(l) > 0
                      && ` · soit ${eur(sousTotal(l))} pour la quantité indiquée`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="sr-only" htmlFor={`q-${l.produit.id}`}>
                    Quantité de {l.produit.nom}, en {l.produit.unite}
                  </label>
                  <input className="inp" id={`q-${l.produit.id}`} type="text" inputMode="decimal"
                    value={l.quantite} style={{ width: 66, textAlign: 'right' }}
                    onChange={(e) => majLigne(l.produit.id, { quantite: e.target.value })} />
                  <span className="tiny">{l.produit.unite}</span>
                  <button type="button" className="btn-x"
                    aria-label={`Retirer ${l.produit.nom} du panier`}
                    onClick={() => retirer(l.produit.id)}>×</button>
                </div>
              </div>

              <div className="compo-var">
                <button type="button" className="compo-var-b"
                  aria-expanded={l.ouvert}
                  onClick={() => majLigne(l.produit.id, { ouvert: !l.ouvert })}>
                  {nomVariete(l)
                    ? <>Variété : <b>{nomVariete(l)}</b></>
                    : <>Préciser la variété <span className="tiny">(facultatif)</span></>}
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
                    style={{ transform: l.ouvert ? 'rotate(90deg)' : 'none' }}>
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>

                {l.ouvert && (
                  <>
                    <div className="var-list" style={{ marginTop: 8 }}>
                      <button type="button"
                        className={`var-btn${!l.variete && !l.varieteLibre.trim() ? ' on' : ''}`}
                        onClick={() => majLigne(l.produit.id, { variete: null, varieteLibre: '' })}>
                        <div><b>Sans précision</b><span>La variété n&apos;est pas indiquée à l&apos;acheteur.</span></div>
                      </button>
                      {sesVarietes.map((v) => (
                        <button key={v.id} type="button"
                          className={`var-btn${l.variete?.id === v.id ? ' on' : ''}`}
                          onClick={() => majLigne(l.produit.id, { variete: v, varieteLibre: '' })}>
                          <div>
                            <b>{v.nom}</b>
                            {v.description && <span>{v.description}</span>}
                          </div>
                        </button>
                      ))}
                    </div>

                    <label htmlFor={`vl-${l.produit.id}`} className="tiny"
                      style={{ display: 'block', marginTop: 10 }}>
                      Une autre variété, absente de la liste
                    </label>
                    <input className="inp" id={`vl-${l.produit.id}`} type="text" maxLength={60}
                      value={l.varieteLibre} placeholder="Nom de la variété"
                      onChange={(e) => majLigne(l.produit.id, {
                        varieteLibre: e.target.value, variete: null,
                      })} />
                  </>
                )}
              </div>
              </div>
              );
            })}
          </div>
        ) : (
          <p className="tiny" style={{ marginTop: 12 }}>
            Le panier est vide. Ajoutez au moins deux produits.
          </p>
        )}
      </div>

      {reference > 0 && (
        <div className="priceref" aria-live="polite">
          <b>{eur(reference)} en grande surface pour le même contenu</b>
          <p>
            Somme des prix moyens constatés pour chaque produit du panier.
            {sansReference > 0 && ` ${sansReference} produit${sansReference > 1 ? 's' : ''} sans prix de référence connu n'${sansReference > 1 ? 'y sont' : 'y est'} pas compté${sansReference > 1 ? 's' : ''}.`}
            {ecart > 0.05 && ` Votre panier à ${eur(prixNum)} fait économiser ${eur(ecart)} à l'acheteur.`}
            {prixNum > 0 && ecart <= 0.05 && ` Votre panier à ${eur(prixNum)} n'est pas moins cher : l'acheteur le verra.`}
          </p>
        </div>
      )}

      <div className="card">
        <h3>L&apos;annonce</h3>

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="titre">Nom du panier</label>
          <input className="inp" id="titre" type="text" value={titre} maxLength={60}
            placeholder="Panier de la semaine"
            onChange={(e) => setTitre(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="prix">Prix du panier</label>
          <input className="inp" id="prix" type="text" inputMode="decimal" value={prix}
            placeholder="12,50" onChange={(e) => setPrix(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="nb">Nombre de paniers disponibles</label>
          <input className="inp" id="nb" type="number" min={1} value={quantite}
            onChange={(e) => setQuantite(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="commune">Commune de retrait</label>
          <select className="inp" id="commune" value={commune} onChange={(e) => setCommune(e.target.value)}>
            {communes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="desc">Description</label>
          <textarea className="inp" id="desc" rows={3} value={description} maxLength={400}
            placeholder="Récolté ce matin. Le contenu peut varier selon la récolte."
            onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      {erreur && <p className="errmsg" style={{ marginBottom: 12 }}>{erreur}</p>}
      <button className="btn btn-p" onClick={publier} disabled={envoi}>
        {envoi ? 'Publication…' : 'Publier mon panier'}
      </button>
      <p className="tiny center" style={{ marginTop: 11 }}>
        Vous serez payé après la confirmation de retrait par l&apos;acheteur.
      </p>
    </div>
  );
}
