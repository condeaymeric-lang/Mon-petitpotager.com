'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { compresserImage } from '@/lib/utils';
import type { Profil } from '@/lib/types';

export default function ModifierProfil({ profil }: { profil: Profil }) {
  const [ouvert, setOuvert] = useState(false);
  const [prenom, setPrenom] = useState(profil.prenom);
  const [telephone, setTelephone] = useState(profil.telephone ?? '');
  const [bio, setBio] = useState(profil.bio ?? '');
  const [avatar, setAvatar] = useState<string | null>(profil.avatar_url ?? null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  async function choisirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await compresserImage(f, 480, 0.8);
      setAvatar(URL.createObjectURL(blob));
      setAvatarBlob(blob);
    } catch {
      toast('Photo illisible, essayez-en une autre.');
    }
  }

  async function enregistrer() {
    setEnvoi(true);
    const sb = creerClient();
    let avatar_url = profil.avatar_url;

    if (avatarBlob) {
      const chemin = `${profil.id}/avatar-${Date.now()}.jpg`;
      const { error: errPhoto } = await sb.storage.from('photos')
        .upload(chemin, avatarBlob, { contentType: 'image/jpeg', upsert: true });
      if (!errPhoto) avatar_url = sb.storage.from('photos').getPublicUrl(chemin).data.publicUrl;
    }

    const { error } = await sb.from('profils').update({
      prenom: prenom.trim() || profil.prenom,
      telephone: telephone.trim() || null,
      bio: bio.trim() || null,
      avatar_url,
    }).eq('id', profil.id);

    setEnvoi(false);
    if (error) { toast('Enregistrement impossible.'); return; }
    toast('Profil mis à jour');
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button className="btn btn-s" style={{ marginTop: 14 }} onClick={() => setOuvert(true)}>
        Modifier mon profil
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3>Modifier mon profil</h3>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
        <button type="button" onClick={() => fichier.current?.click()}
          style={{
            width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
            border: '1.5px dashed var(--line)', display: 'grid', placeItems: 'center',
            background: 'var(--paper)',
          }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="tiny" style={{ textAlign: 'center', padding: 6 }}>Ajouter une photo</span>}
        </button>
        <input ref={fichier} type="file" accept="image/*" hidden onChange={choisirAvatar} />
      </div>

      <div className="field">
        <label htmlFor="pr">Prénom</label>
        <input className="inp" id="pr" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="tel">Téléphone</label>
        <input className="inp" id="tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
          placeholder="Optionnel" />
      </div>
      <div className="field">
        <label htmlFor="bio">À propos</label>
        <textarea className="inp" id="bio" maxLength={200} value={bio}
          onChange={(e) => setBio(e.target.value)} placeholder="Votre jardin, vos produits favoris…" />
      </div>

      <div className="row-btn">
        <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setOuvert(false)} disabled={envoi}>
          Annuler
        </button>
        <button className="btn btn-p" style={{ flex: 1 }} onClick={enregistrer} disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
