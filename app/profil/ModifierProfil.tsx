'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { compresserImage } from '@/lib/utils';
import type { Profil, Role } from '@/lib/types';

export default function ModifierProfil({
  profil, ouvertParDefaut = false,
}: { profil: Profil; ouvertParDefaut?: boolean }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [prenom, setPrenom] = useState(profil.prenom);
  const [telephone, setTelephone] = useState(profil.telephone ?? '');
  const [bio, setBio] = useState(profil.bio ?? '');
  const [raisonSociale, setRaisonSociale] = useState(profil.raison_sociale ?? '');
  const [role, setRole] = useState<Role>(profil.role);
  const [avatar, setAvatar] = useState<string | null>(profil.avatar_url ?? null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [siteWeb, setSiteWeb] = useState(profil.site_web ?? '');
  const [reseau, setReseau] = useState(profil.reseau_social ?? '');
  const [dispos, setDispos] = useState(profil.disponibilites ?? '');
  const [specialites, setSpecialites] = useState(profil.specialites ?? '');
  const [paiements, setPaiements] = useState<string[]>(profil.moyens_paiement ?? []);
  const [methode, setMethode] = useState(profil.methode_culture ?? '');
  const [label, setLabel] = useState(profil.label_qualite ?? '');
  const [installation, setInstallation] = useState(
    profil.annee_installation ? String(profil.annee_installation) : '');
  const [surface, setSurface] = useState(profil.surface_ha ? String(profil.surface_ha) : '');
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
      role,
      site_web: siteWeb.trim() || null,
      reseau_social: reseau.trim() || null,
      disponibilites: dispos.trim() || null,
      specialites: specialites.trim() || null,
      moyens_paiement: paiements,
      ...(role === 'pro' ? {
        raison_sociale: raisonSociale.trim() || null,
        methode_culture: methode.trim() || null,
        label_qualite: label.trim() || null,
        annee_installation: parseInt(installation) || null,
        surface_ha: parseFloat(surface.replace(',', '.')) || null,
      } : {}),
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
            ? <img src={avatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="tiny" style={{ textAlign: 'center', padding: 6 }}>Ajouter une photo</span>}
        </button>
        <input ref={fichier} type="file" accept="image/*" hidden onChange={choisirAvatar} />
      </div>

      <div className="field">
        <label id="role-label">Je suis</label>
        <div className="seg" role="group" aria-labelledby="role-label" style={{ flexDirection: 'column' }}>
          {([['acheteur', 'Acheteur'],
             ['amateur', 'Jardinier amateur'],
             ['pro', 'Producteur professionnel']] as [Role, string][]).map(([v, l]) => (
            <button key={v} type="button" className={role === v ? 'on' : ''}
              style={{ textAlign: 'left' }} onClick={() => setRole(v)}>{l}</button>
          ))}
        </div>
        {role === 'pro' && profil.role !== 'pro' && (
          <p className="help">
            En tant que professionnel, vous apparaîtrez dans l&apos;annuaire des
            producteurs du secteur, avec la présentation de votre ferme.
          </p>
        )}
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
      {role === 'pro' && (
        <div className="field">
          <label htmlFor="rs">Nom de la ferme ou de l&apos;exploitation</label>
          <input className="inp" id="rs" maxLength={120} value={raisonSociale}
            onChange={(e) => setRaisonSociale(e.target.value)}
            placeholder="Ferme du Bugnon" />
          <p className="help">Affiché en tête de votre fiche producteur.</p>
        </div>
      )}

      <div className="field">
        <label htmlFor="bio">{role === 'pro' ? 'Présentation de la ferme' : 'À propos'}</label>
        <textarea className="inp" id="bio" maxLength={role === 'pro' ? 600 : 200} value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={role === 'pro' ? { minHeight: 130 } : undefined}
          placeholder={role === 'pro'
            ? 'Votre exploitation, vos méthodes de culture, votre histoire…'
            : 'Votre jardin, vos produits favoris…'} />
          {role === 'pro' && (
            <p className="help">Visible par les habitants du secteur sur votre fiche.</p>
          )}
      </div>

      <div className="field">
        <label htmlFor="spe">{role === 'pro' ? 'Vos productions' : 'Ce que vous cultivez'}</label>
        <input className="inp" id="spe" maxLength={140} value={specialites}
          onChange={(e) => setSpecialites(e.target.value)}
          placeholder="Tomates anciennes, petits fruits, plants…" />
        <p className="help">Quelques mots-clés, séparés par des virgules.</p>
      </div>

      <div className="field">
        <label htmlFor="dispo">Quand vous joindre</label>
        <input className="inp" id="dispo" maxLength={140} value={dispos}
          onChange={(e) => setDispos(e.target.value)}
          placeholder="Du mardi au samedi, de 9 h à 12 h" />
      </div>

      <div className="field">
        <label id="pai-label">Paiements acceptés</label>
        <div className="seg seg-4" role="group" aria-labelledby="pai-label">
          {[['especes', 'Espèces'], ['carte', 'Carte'],
            ['cheque', 'Chèque'], ['virement', 'Virement']].map(([v, l]) => (
            <button key={v} type="button" className={paiements.includes(v) ? 'on' : ''}
              aria-pressed={paiements.includes(v)}
              onClick={() => setPaiements((p) =>
                p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grille-2">
        <div className="field">
          <label htmlFor="web">Site internet</label>
          <input className="inp" id="web" type="url" maxLength={120} value={siteWeb}
            onChange={(e) => setSiteWeb(e.target.value)} placeholder="https://" />
        </div>
        <div className="field">
          <label htmlFor="res">Réseau social</label>
          <input className="inp" id="res" maxLength={120} value={reseau}
            onChange={(e) => setReseau(e.target.value)} placeholder="Adresse de votre page" />
        </div>
      </div>

      {role === 'pro' && (
        <>
          <div className="field">
            <label htmlFor="meth">Méthode de culture</label>
            <input className="inp" id="meth" maxLength={120} value={methode}
              onChange={(e) => setMethode(e.target.value)}
              placeholder="Agriculture biologique, culture raisonnée, permaculture…" />
          </div>
          <div className="grille-2">
            <div className="field">
              <label htmlFor="lab">Label ou certification</label>
              <input className="inp" id="lab" maxLength={80} value={label}
                onChange={(e) => setLabel(e.target.value)} placeholder="AB, Demeter, HVE…" />
              <p className="help">N&apos;indiquez qu&apos;un label réellement obtenu.</p>
            </div>
            <div className="field">
              <label htmlFor="inst">Année d&apos;installation</label>
              <input className="inp" id="inst" inputMode="numeric" maxLength={4} value={installation}
                onChange={(e) => setInstallation(e.target.value)} placeholder="2018" />
            </div>
            <div className="field">
              <label htmlFor="surf">Surface exploitée, en hectares</label>
              <input className="inp" id="surf" inputMode="decimal" value={surface}
                onChange={(e) => setSurface(e.target.value)} placeholder="3,5" />
            </div>
          </div>
        </>
      )}

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
