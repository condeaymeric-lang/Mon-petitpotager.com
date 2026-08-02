'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { Illustration } from '@/components/Illustrations';
import { eur, estDeSaison, compresserImage } from '@/lib/utils';
import type { Produit, Variete, ModeTransaction, Profil, Secteur } from '@/lib/types';

export default function Formulaire({
  produits, varietes, profil, secteur, communes, produitInitial,
}: {
  produits: Produit[];
  varietes: Variete[];
  profil: Profil;
  secteur: Secteur;
  communes: string[];
  produitInitial?: string;
}) {
  const initial = produits.find((p) => p.cle === produitInitial) ?? null;
  const [etape, setEtape] = useState(initial ? 1 : 0);
  const [produit, setProduit] = useState<Produit | null>(initial);
  const [variete, setVariete] = useState<Variete | null>(null);
  const [varieteLibre, setVarieteLibre] = useState('');
  const [saisieLibre, setSaisieLibre] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [categorieOuverte, setCategorieOuverte] = useState<string | null>(null);

  const [mode, setMode] = useState<ModeTransaction>('vente');
  const [prix, setPrix] = useState('');
  const [quantite, setQuantite] = useState('6');
  const [commune, setCommune] = useState(secteur.nom);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const fichier = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const toast = useToast();

  const categories = [...new Set(produits.map((p) => p.categorie))];
  const mesVarietes = varietes.filter((v) => v.produit_id === produit?.id);
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const nomVariete = variete?.nom ?? varieteLibre.trim();

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = [...(e.target.files ?? [])].slice(0, 4 - photos.length);
    if (!fs.length) return;
    const sb = creerClient();
    for (const f of fs) {
      try {
        const blob = await compresserImage(f);
        const chemin = `${profil.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await sb.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) { toast("Envoi de la photo impossible."); continue; }
        const { data } = sb.storage.from('photos').getPublicUrl(chemin);
        setPhotos((p) => [...p, data.publicUrl]);
      } catch {
        toast('Photo illisible, essayez-en une autre.');
      }
    }
    if (fichier.current) fichier.current.value = '';
  }

  async function publier() {
    if (!produit || !nomVariete) return;
    const p = parseFloat(prix.replace(',', '.'));
    if (mode === 'vente' && !(p > 0)) { setErreur('Indiquez un prix supérieur à zéro.'); return; }
    setErreur(''); setEnvoi(true);

    const sb = creerClient();
    const { data, error } = await sb.from('annonces').insert({
      vendeur_id: profil.id,
      secteur: secteur.code_insee,
      produit_id: produit.id,
      variete_id: variete?.id ?? null,
      variete_libre: variete ? null : nomVariete,
      titre: produit.nom,
      description: description.trim() || variete?.description || null,
      mode,
      prix: mode === 'vente' ? p : 0,
      unite: produit.unite,
      quantite: Math.max(1, parseInt(quantite) || 1),
      quantite_initiale: Math.max(1, parseInt(quantite) || 1),
      commune,
      lat: secteur.lat,
      lon: secteur.lon,
      photos,
      statut: 'en_ligne',
    }).select().single();

    if (error || !data) {
      setEnvoi(false);
      setErreur(
        error?.message?.includes('professionnels')
          ? 'Ce produit transformé est réservé aux comptes professionnels. Changez de statut dans votre profil, ou choisissez un produit brut.'
          : "Publication impossible. Réessayez dans un instant."
      );
      return;
    }

    await sb.rpc('ajouter_points', {
      p_profil: profil.id, p_montant: 10, p_motif: `Publication — ${produit.nom}`,
    });

    toast('Annonce publiée · +10 points');
    router.push('/vendre/annonces');
    router.refresh();
  }

  // ── Étape 1 : le produit ──
  if (etape === 0) {
    const q = recherche.trim().toLowerCase();
    const filtres = q.length > 0
      ? produits.filter((p) => p.nom.toLowerCase().includes(q))
      : [];
    const bloques = (p: Produit) => p.transforme && profil.role !== 'pro';

    const ligne = (p: Produit) => (
      <button key={p.id} className="pchoix" disabled={bloques(p)}
        onClick={() => { setProduit(p); setVariete(null); setVarieteLibre(''); setSaisieLibre(false); setEtape(1); }}>
        <span className="pchoix-ill"><Illustration nom={p.illustration} /></span>
        <span className="pchoix-t">
          <b>{p.nom}</b>
          <span>
            {bloques(p)
              ? 'Réservé aux comptes professionnels'
              : `${estDeSaison(p.mois_saison) ? 'De saison' : 'Hors saison'} · au ${p.unite}`}
          </span>
        </span>
        {p.transforme && <span className="badge b-pro">Pro</span>}
      </button>
    );

    return (
      <div className="page page-form">
        <div className="page-head">
          <h1>Que proposez-vous ?</h1>
          <p>Cherchez votre produit, ou parcourez les catégories.</p>
        </div>

        <div className="field">
          <label htmlFor="rp">Rechercher un produit</label>
          <input className="inp" id="rp" autoComplete="off" value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Tomate, miel, courgette…" />
          <p className="help" aria-live="polite">
            {q.length > 0
              ? `${filtres.length} résultat${filtres.length > 1 ? 's' : ''}.`
              : `${produits.length} produits au catalogue.`}
          </p>
        </div>

        {q.length > 0 ? (
          filtres.length > 0
            ? <div className="pliste">{filtres.map(ligne)}</div>
            : <p className="muted">Aucun produit ne correspond. Essayez un autre mot.</p>
        ) : (
          categories.map((cat) => {
            const ouverte = categorieOuverte === cat;
            const dedans = produits.filter((p) => p.categorie === cat);
            return (
              <div key={cat} className="pcat">
                <button className="pcat-t" aria-expanded={ouverte}
                  onClick={() => setCategorieOuverte(ouverte ? null : cat)}>
                  <b>{cat}</b>
                  <span className="tiny">{dedans.length}</span>
                  <span className="pcat-fleche" aria-hidden="true">{ouverte ? '−' : '+'}</span>
                </button>
                {ouverte && <div className="pliste">{dedans.map(ligne)}</div>}
              </div>
            );
          })
        )}

        {profil.role !== 'pro' && (
          <p className="tiny" style={{ marginTop: 16 }}>
            Les produits transformés (laitages, conserves, boissons, viandes) supposent
            un statut professionnel déclaré. Ils sont signalés « Pro » et ne peuvent pas
            être publiés depuis un compte de jardinier amateur.
          </p>
        )}
      </div>
    );
  }

  // ── Étape 2 : la variété ──
  if (etape === 1 && produit) {
    return (
      <div className="page page-form">
        <button className="back" onClick={() => setEtape(0)}>← Changer de produit</button>
        <div className="page-head">
          <h1>Quelle variété de {produit.nom.toLowerCase()} ?</h1>
          <p>La variété rassure l'acheteur et fait grimper les vues.</p>
        </div>

        {!estDeSaison(produit.mois_saison) && (
          <div className="card" style={{ background: 'var(--bark-soft)', borderColor: '#E8D5BE', marginBottom: 12 }}>
            <h4 style={{ color: 'var(--bark)' }}>Hors saison en {mois}</h4>
            <p className="tiny" style={{ color: '#6E4A26', marginTop: 5 }}>
              Vous pouvez publier quand même, mais attendez-vous à moins de demande.
            </p>
          </div>
        )}

        <div className="var-list">
          {mesVarietes.map((v) => (
            <button key={v.id} className="var-btn"
              onClick={() => {
                setVariete(v);
                setSaisieLibre(false);
                setDescription(v.description ?? '');
                if (produit.prix_ref) setPrix((produit.prix_ref * 0.7).toFixed(2));
                setEtape(2);
              }}>
              <div className="ill"><Illustration nom={v.illustration ?? produit.illustration} /></div>
              <div><b>{v.nom}</b><span>{v.description}</span></div>
            </button>
          ))}

          {!saisieLibre ? (
            <button className="var-btn var-btn-autre" onClick={() => setSaisieLibre(true)}>
              <div className="ill"><Illustration nom={produit.illustration} /></div>
              <div>
                <b>Une autre variété</b>
                <span>
                  {mesVarietes.length > 0
                    ? "Votre variété n'est pas dans la liste : indiquez son nom"
                    : 'Indiquez le nom de votre variété'}
                </span>
              </div>
            </button>
          ) : (
            <div className="card">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="vl">Nom de votre variété</label>
                <input className="inp" id="vl" autoFocus maxLength={80}
                  value={varieteLibre} onChange={(e) => setVarieteLibre(e.target.value)}
                  placeholder={`Par exemple : ${mesVarietes[0]?.nom ?? 'variété de pays'}`} />
                <p className="help">
                  Si vous ne connaissez pas le nom exact, décrivez-la simplement :
                  « ancienne du jardin », « rouge allongée ».
                </p>
              </div>
              <div className="row-btn" style={{ marginTop: 14 }}>
                <button className="btn btn-s" style={{ flex: 1 }}
                  onClick={() => { setSaisieLibre(false); setVarieteLibre(''); }}>
                  Annuler
                </button>
                <button className="btn btn-p" style={{ flex: 1 }}
                  disabled={!varieteLibre.trim()}
                  onClick={() => {
                    setVariete(null);
                    setDescription('');
                    if (produit.prix_ref) setPrix((produit.prix_ref * 0.7).toFixed(2));
                    setEtape(2);
                  }}>
                  Continuer
                </button>
              </div>
            </div>
          )}
        </div>

        {produit.prix_ref && (
          <div className="priceref" style={{ marginTop: 14 }}>
            <b>Prix moyen en grande surface : {eur(produit.prix_ref)} / {produit.unite}</b>
            <p>
              Pour rester attractif tout en gagnant votre vie, la plupart des vendeurs se placent
              entre {eur(produit.prix_ref * 0.6)} et {eur(produit.prix_ref * 0.85)}.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Étape 3 : la fiche ──
  if (!produit || !nomVariete) return null;
  const pNum = parseFloat(prix.replace(',', '.')) || 0;
  const ref = produit.prix_ref ?? 0;
  const ecart = ref - pNum;

  return (
    <div className="page page-form">
      <button className="back" onClick={() => setEtape(1)}>← Changer de variété</button>
      <div className="page-head">
        <h1>{produit.nom} — {nomVariete}</h1>
        <p>Plus c'est précis, plus ça part vite.</p>
      </div>

      <div className="field">
        <label>Vos photos</label>
        <div className="photos">
          {photos.map((p, i) => (
            <div className="photo" key={p}>
              <img src={p} alt="" loading="lazy" />
              <button onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))} aria-label="Retirer">×</button>
            </div>
          ))}
          {photos.length < 4 && (
            <button className="addphoto" onClick={() => fichier.current?.click()}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1E5233" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Photo
            </button>
          )}
        </div>
        <p className="help">Une vraie photo prise au jardin vaut mieux qu'une illustration. Jusqu'à 4.</p>
        <input ref={fichier} type="file" accept="image/*" capture="environment" multiple
          hidden onChange={ajouterPhotos} />
      </div>

      <div className="field">
        <label>Mode</label>
        <div className="seg">
          {(['vente', 'troc', 'don'] as ModeTransaction[]).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {m === 'vente' ? 'Vendre' : m === 'troc' ? 'Troquer' : 'Donner'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'vente' && (
        <>
          <div className="field">
            <label htmlFor="pr">Prix par {produit.unite}</label>
            <input className="inp" id="pr" type="number" step="0.10" min="0"
              value={prix} onChange={(e) => setPrix(e.target.value)} />
          </div>
          {ref > 0 && (
            <div className="priceref">
              {pNum <= 0 ? <b>Indiquez un prix pour voir la comparaison</b>
                : ecart > 0 ? (<>
                    <b>{Math.round((ecart / ref) * 100)} % moins cher qu'en grande surface</b>
                    <p>Référence {eur(ref)} / {produit.unite}. L'acheteur économise {eur(ecart)}, et tout revient chez vous.</p>
                  </>) : (<>
                    <b>Plus cher que la grande surface ({eur(ref)})</b>
                    <p>C'est possible si votre qualité le justifie, mais attendez-vous à moins de demande.</p>
                  </>)}
            </div>
          )}
        </>
      )}

      <div className="field" style={{ marginTop: 15 }}>
        <label htmlFor="qt">Quantité disponible</label>
        <input className="inp" id="qt" type="number" min="1"
          value={quantite} onChange={(e) => setQuantite(e.target.value)} />
      </div>

      <div className="field">
        <label id="lieu-label">Lieu de retrait</label>
        {communes.length > 1 ? (
          <select className="inp" aria-labelledby="lieu-label" value={commune} onChange={(e) => setCommune(e.target.value)}>
            {communes.map((c) => <option key={c}>{c}</option>)}
          </select>
        ) : (
          <p className="inp" aria-labelledby="lieu-label" style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}>
            {commune}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="ds">Description</label>
        <textarea className="inp" id="ds" maxLength={300}
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {erreur && <p className="errmsg" style={{ marginBottom: 12 }}>{erreur}</p>}
      <button className="btn btn-p" onClick={publier} disabled={envoi}>
        {envoi ? 'Publication…' : 'Publier mon annonce'}
      </button>
      <p className="tiny center" style={{ marginTop: 11 }}>
        +10 points à la publication, +20 à chaque vente.
      </p>
    </div>
  );
}
