'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { compresserImage } from '@/lib/utils';
import { THEMES } from '@/components/CarteSujet';

/** Ouverture d'une discussion au bistrot. */
export default function FormulaireSujet({
  profilId, secteurCode,
}: { profilId: string; secteurCode: string }) {
  const [theme, setTheme] = useState('conseils');
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const fichier = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files ?? []).slice(0, 4 - photos.length);
    if (!fs.length) return;
    setEnvoiPhoto(true);
    const sb = creerClient();
    for (const f of fs) {
      try {
        const blob = await compresserImage(f, 1400, 0.8);
        const chemin = `${profilId}/bistrot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await sb.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) { toast("Une photo n'a pas pu être envoyée."); continue; }
        setPhotos((p) => [...p, sb.storage.from('photos').getPublicUrl(chemin).data.publicUrl]);
      } catch { toast('Photo illisible, essayez-en une autre.'); }
    }
    setEnvoiPhoto(false);
    if (fichier.current) fichier.current.value = '';
  }

  async function publier() {
    if (titre.trim().length < 3) { setErreur('Donnez un titre à votre discussion.'); return; }
    if (texte.trim().length < 3) { setErreur('Écrivez votre message.'); return; }
    setErreur(''); setEnvoi(true);

    const { data, error } = await creerClient().from('sujets').insert({
      auteur_id: profilId, secteur: secteurCode, theme,
      titre: titre.trim(), texte: texte.trim(), photos,
    }).select('id').single();

    setEnvoi(false);
    if (error || !data) {
      setErreur(error?.message?.includes('row-level')
        ? "Votre compte doit être validé avant de pouvoir publier."
        : "La discussion n'a pas pu être ouverte. Réessayez.");
      return;
    }
    toast('Discussion ouverte');
    router.push(`/bistrot/${data.id}`);
    router.refresh();
  }

  return (
    <div className="page page-form">
      <Link href="/bistrot" className="back">← Le bistrot</Link>
      <div className="page-head">
        <h1>Ouvrir une discussion</h1>
        <p>Elle sera lue par les voisins de votre rayon, et par eux seuls.</p>
      </div>

      <div className="field">
        <label id="th-label">Thème</label>
        <div className="var-list" role="group" aria-labelledby="th-label">
          {THEMES.map(([c, l, d]) => (
            <button key={c} type="button" className={`var-btn${theme === c ? ' on' : ''}`}
              onClick={() => setTheme(c)}>
              <div><b>{l}</b><span>{d}</span></div>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="su-ti">Titre</label>
        <input className="inp" id="su-ti" maxLength={160} value={titre}
          placeholder="Mes courgettes jaunissent, une idée ?"
          onChange={(e) => setTitre(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="su-tx">Votre message</label>
        <textarea className="inp" id="su-tx" rows={7} maxLength={4000} value={texte}
          onChange={(e) => setTexte(e.target.value)} />
      </div>

      <div className="field">
        <label id="su-ph">Photos</label>
        <div className="evt-photos" role="group" aria-labelledby="su-ph">
          {photos.map((url, i) => (
            <div className="evt-photo" key={url}>
              <img src={url} alt="" loading="lazy" />
              <button type="button" className="btn-x" aria-label={`Retirer la photo ${i + 1}`}
                onClick={() => setPhotos((p) => p.filter((x) => x !== url))}>×</button>
            </div>
          ))}
          {photos.length < 4 && (
            <button type="button" className="evt-photo evt-photo-plus" disabled={envoiPhoto}
              onClick={() => fichier.current?.click()}>
              {envoiPhoto ? 'Envoi…' : 'Ajouter'}
            </button>
          )}
        </div>
        <input ref={fichier} type="file" accept="image/*" multiple hidden onChange={ajouterPhotos} />
      </div>

      {erreur && <p className="errmsg" style={{ marginBottom: 12 }}>{erreur}</p>}
      <button className="btn btn-p" onClick={publier} disabled={envoi || envoiPhoto}>
        {envoi ? 'Publication…' : 'Ouvrir la discussion'}
      </button>
    </div>
  );
}
