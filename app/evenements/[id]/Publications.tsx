'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { compresserImage } from '@/lib/utils';

export interface Publication {
  id: string;
  texte: string;
  photos: string[] | null;
  created_at: string;
  auteur_id: string;
  auteur_prenom: string;
  auteur_avatar: string | null;
  auteur_role: string;
}

function quand(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/**
 * Le mur d'un événement : ce que les participants en racontent.
 *
 * Il ne s'ouvre qu'une fois l'événement commencé. Avant, il n'y a rien
 * à raconter, et un fil de commentaires anticipés n'aide personne.
 */
export default function Publications({
  evenementId, publications, commence, connecte, profilId, moderateur,
}: {
  evenementId: string; publications: Publication[]; commence: boolean;
  connecte: boolean; profilId: string | null; moderateur: boolean;
}) {
  const [texte, setTexte] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState('');
  const fichier = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    if (!fichiers.length || !profilId) return;
    setEnvoiPhoto(true);
    const sb = creerClient();

    for (const f of fichiers.slice(0, 4 - photos.length)) {
      try {
        const blob = await compresserImage(f, 1400, 0.8);
        const chemin = `${profilId}/mur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await sb.storage.from('photos')
          .upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) { toast("Une photo n'a pas pu être envoyée."); continue; }
        setPhotos((p) => [...p, sb.storage.from('photos').getPublicUrl(chemin).data.publicUrl]);
      } catch {
        toast('Photo illisible, essayez-en une autre.');
      }
    }

    setEnvoiPhoto(false);
    if (fichier.current) fichier.current.value = '';
  }

  async function publier() {
    if (texte.trim().length < 1) { setErreur('Écrivez quelques mots.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().from('publications_evenement').insert({
      evenement_id: evenementId, auteur_id: profilId, texte: texte.trim(), photos,
    });
    setEnvoi(false);
    if (error) {
      setErreur("La publication n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    setTexte(''); setPhotos([]);
    toast('Publication ajoutée');
    router.refresh();
  }

  async function supprimer(p: Publication) {
    const { error } = await creerClient()
      .from('publications_evenement').delete().eq('id', p.id);
    if (error) { toast('Suppression impossible.'); return; }
    toast('Publication retirée');
    router.refresh();
  }

  return (
    <section className="bloc" aria-labelledby="titre-mur">
      <div className="bloc-head">
        <h2 id="titre-mur">
          Ce qu&apos;on en dit{publications.length > 0 && ` (${publications.length})`}
        </h2>
      </div>

      {!commence ? (
        <div className="card">
          <p className="muted">
            Le mur s&apos;ouvrira le jour de l&apos;événement. Vous pourrez y
            déposer vos photos et vos impressions.
          </p>
        </div>
      ) : !connecte ? (
        <div className="card">
          <p className="muted">
            Créez un compte pour raconter votre passage et partager vos photos.
          </p>
          <Link className="btn btn-p" href="/inscription" style={{ marginTop: 14 }}>
            Créer un compte
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="mur-txt">Votre publication</label>
            <textarea className="inp" id="mur-txt" rows={3} maxLength={1000} value={texte}
              placeholder="Ce que vous avez vu, goûté, trouvé…"
              onChange={(e) => setTexte(e.target.value)} />
          </div>

          {photos.length > 0 && (
            <div className="evt-photos" style={{ marginBottom: 10 }}>
              {photos.map((url, i) => (
                <div className="evt-photo" key={url}>
                  <img src={url} alt="" loading="lazy" />
                  <button type="button" className="btn-x" aria-label={`Retirer la photo ${i + 1}`}
                    onClick={() => setPhotos((p) => p.filter((x) => x !== url))}>×</button>
                </div>
              ))}
            </div>
          )}

          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}

          <div className="row-btn">
            <button className="btn btn-s" style={{ flex: 1 }} disabled={envoiPhoto || photos.length >= 4}
              onClick={() => fichier.current?.click()}>
              {envoiPhoto ? 'Envoi…' : photos.length >= 4 ? 'Quatre photos au plus' : 'Ajouter une photo'}
            </button>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={publier}
              disabled={envoi || envoiPhoto}>
              {envoi ? 'Publication…' : 'Publier'}
            </button>
          </div>
          <input ref={fichier} type="file" accept="image/*" multiple hidden onChange={ajouterPhotos} />
        </div>
      )}

      {publications.map((p) => (
        <div className="card pub-evt" key={p.id}>
          <div className="pub-evt-tete">
            <Link href={`/membre/${p.auteur_id}`} className="pub-evt-auteur">
              {p.auteur_avatar
                ? <img src={p.auteur_avatar} alt="" loading="lazy" className="clst-photo" />
                : <span className="clst-photo clst-photo-vide">{p.auteur_prenom?.[0]?.toUpperCase()}</span>}
              <span>
                <b>{p.auteur_prenom}</b>
                <span className="tiny">
                  {p.auteur_role === 'pro' ? 'Producteur · ' : ''}{quand(p.created_at)}
                </span>
              </span>
            </Link>
            {(p.auteur_id === profilId || moderateur) && (
              <button className="btn-x" onClick={() => supprimer(p)}
                aria-label={`Supprimer la publication de ${p.auteur_prenom}`}>×</button>
            )}
          </div>

          <p className="pub-evt-txt">{p.texte}</p>

          {p.photos && p.photos.length > 0 && (
            <div className="evt-photos" style={{ marginTop: 10 }}>
              {p.photos.map((url) => (
                <a className="evt-photo" key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}

      {commence && publications.length === 0 && (
        <div className="card">
          <p className="muted">
            Personne n&apos;a encore rien publié. Soyez le premier à raconter.
          </p>
        </div>
      )}
    </section>
  );
}
