'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { eur, compresserImage } from '@/lib/utils';
import type { ModeTransaction } from '@/lib/types';

export default function ModifierAnnonce({
  annonce, profilId,
}: { annonce: any; profilId: string }) {
  const [titre, setTitre] = useState(annonce.titre ?? '');
  const [variete, setVariete] = useState(
    annonce.variete?.nom ?? annonce.variete_libre ?? '');
  const [mode, setMode] = useState<ModeTransaction>(annonce.mode);
  const [prix, setPrix] = useState(String(annonce.prix ?? ''));
  const [quantite, setQuantite] = useState(String(annonce.quantite ?? 1));
  const [description, setDescription] = useState(annonce.description ?? '');
  const [photos, setPhotos] = useState<string[]>(annonce.photos ?? []);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const fichier = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const ref = annonce.produit?.prix_ref ?? 0;

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = [...(e.target.files ?? [])].slice(0, 4 - photos.length);
    if (!fs.length) return;
    const sb = creerClient();
    for (const f of fs) {
      try {
        const blob = await compresserImage(f);
        const chemin = `${profilId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
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

  async function enregistrer() {
    const p = parseFloat(prix.replace(',', '.'));
    if (!titre.trim()) { setErreur("Le titre ne peut pas être vide."); return; }
    if (mode === 'vente' && !(p > 0)) { setErreur('Indiquez un prix supérieur à zéro.'); return; }
    setErreur(''); setEnvoi(true);

    // La variété saisie ici remplace celle du catalogue : c'est le texte
    // affiché qui compte, et le vendeur sait mieux ce qu'il vend.
    const varieteTexte = variete.trim();
    const varieteCatalogue = annonce.variete?.nom ?? null;

    const sb = creerClient();
    const { error } = await sb.from('annonces').update({
      titre: titre.trim(),
      ...(varieteTexte === varieteCatalogue
        ? {}
        : { variete_id: null, variete_libre: varieteTexte || null }),
      mode,
      prix: mode === 'vente' ? p : 0,
      quantite: Math.max(0, parseInt(quantite) || 0),
      description: description.trim() || null,
      photos,
      statut: (parseInt(quantite) || 0) > 0 ? 'en_ligne' : 'epuise',
    }).eq('id', annonce.id);

    setEnvoi(false);
    if (error) { setErreur('Modification impossible. Réessayez.'); return; }
    toast('Annonce mise à jour');
    router.push('/vendre/annonces');
    router.refresh();
  }

  return (
    <div className="page page-form">
      <div className="page-head">
        <h1>Modifier l&apos;annonce</h1>
        <p>Titre, variété, prix, quantité, description et photos.</p>
      </div>

      <div className="field">
        <label htmlFor="ti-ann">Titre de l&apos;annonce</label>
        <input className="inp" id="ti-ann" maxLength={80} value={titre}
          onChange={(e) => setTitre(e.target.value)} />
        <p className="help">C&apos;est ce que vos voisins lisent en premier.</p>
      </div>

      <div className="field">
        <label htmlFor="va-ann">Variété</label>
        <input className="inp" id="va-ann" maxLength={60} value={variete}
          placeholder="Facultatif" onChange={(e) => setVariete(e.target.value)} />
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
            <button className="addphoto" onClick={() => fichier.current?.click()} type="button">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1E5233" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Photo
            </button>
          )}
        </div>
        <input ref={fichier} type="file" accept="image/*" capture="environment" multiple
          hidden onChange={ajouterPhotos} />
      </div>

      <div className="field">
        <label>Mode</label>
        <div className="seg">
          {(['vente', 'troc', 'don'] as ModeTransaction[]).map((m) => (
            <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {m === 'vente' ? 'Vendre' : m === 'troc' ? 'Troquer' : 'Donner'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'vente' && (
        <div className="field">
          <label htmlFor="pr">Prix par {annonce.unite}</label>
          <input className="inp" id="pr" type="number" step="0.10" min="0"
            value={prix} onChange={(e) => setPrix(e.target.value)} />
          {ref > 0 && <p className="help">Prix moyen en grande surface : {eur(ref)} / {annonce.unite}</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="qt">Quantité disponible</label>
        <input className="inp" id="qt" type="number" min="0"
          value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        <p className="help">Mettre 0 marque l'annonce comme épuisée.</p>
      </div>

      <div className="field">
        <label htmlFor="ds">Description</label>
        <textarea className="inp" id="ds" maxLength={300}
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {erreur && <p className="errmsg" style={{ marginBottom: 12 }}>{erreur}</p>}
      <button className="btn btn-p" onClick={enregistrer} disabled={envoi}>
        {envoi ? 'Enregistrement…' : 'Enregistrer les modifications'}
      </button>
      <button type="button" className="btn btn-s" style={{ marginTop: 10 }} onClick={() => router.back()}>
        Annuler
      </button>
    </div>
  );
}
