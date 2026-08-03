'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { compresserImage } from '@/lib/utils';

export interface PublicationOff {
  id: string; categorie: string; titre: string; texte: string;
  epinglee: boolean; expire_le: string | null; created_at: string;
}
export interface SondageOff {
  id: string; question: string; clos_le: string | null; created_at: string;
  nb_votants: number;
}

export const CATEGORIES: [string, string][] = [
  ['information', 'Information'],
  ['alerte', 'Alerte'],
  ['travaux', 'Travaux'],
  ['evenement', 'Événement'],
  ['consultation', 'Consultation'],
  ['rappel', 'Rappel'],
];

const jour = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Espace de publication d'une mairie, d'une association ou d'un collectif. */
export default function Espace({
  profilId, secteurCode, publications, sondages, nomOrganisation, verifiee,
}: {
  profilId: string; secteurCode: string;
  publications: PublicationOff[]; sondages: SondageOff[];
  nomOrganisation: string; verifiee: boolean;
}) {
  const [onglet, setOnglet] = useState<'publier' | 'sonder'>('publier');

  return (
    <>
      {!verifiee && (
        <div className="avert" role="status">
          <b>Compte déclaré, en attente de vérification.</b>
          <p>
            Vos publications portent la mention « non vérifié » tant que la
            modération n&apos;a pas confirmé que vous représentez bien
            {' '}{nomOrganisation}. Écrivez par le formulaire de contact pour
            faire vérifier le compte.
          </p>
        </div>
      )}

      <div className="seg" role="tablist" aria-label="Type de publication">
        <button role="tab" aria-selected={onglet === 'publier'}
          className={onglet === 'publier' ? 'on' : ''} onClick={() => setOnglet('publier')}>
          Publier une information
        </button>
        <button role="tab" aria-selected={onglet === 'sonder'}
          className={onglet === 'sonder' ? 'on' : ''} onClick={() => setOnglet('sonder')}>
          Lancer un sondage
        </button>
      </div>

      {onglet === 'publier'
        ? <FormPublication profilId={profilId} secteurCode={secteurCode} />
        : <FormSondage profilId={profilId} secteurCode={secteurCode} />}

      <div className="card">
        <h3>Mes publications{publications.length > 0 && ` (${publications.length})`}</h3>
        {publications.length > 0 ? publications.map((p) => (
          <div className="pts-log" key={p.id}>
            <span>
              <Link href={`/informations/${p.id}`}>{p.titre}</Link><br />
              <span className="tiny">
                {CATEGORIES.find(([c]) => c === p.categorie)?.[1] ?? p.categorie}
                {' · '}{jour(p.created_at)}
                {p.epinglee ? ' · épinglée' : ''}
                {p.expire_le ? ` · jusqu'au ${jour(p.expire_le)}` : ''}
              </span>
            </span>
          </div>
        )) : <p className="muted" style={{ marginTop: 8 }}>Aucune publication.</p>}
      </div>

      <div className="card">
        <h3>Mes sondages{sondages.length > 0 && ` (${sondages.length})`}</h3>
        {sondages.length > 0 ? sondages.map((s) => (
          <div className="pts-log" key={s.id}>
            <span>
              <Link href={`/sondages/${s.id}`}>{s.question}</Link><br />
              <span className="tiny">
                {jour(s.created_at)}
                {s.clos_le && new Date(s.clos_le) <= new Date() ? ' · clos' : ''}
              </span>
            </span>
            <b>{s.nb_votants} vote{s.nb_votants > 1 ? 's' : ''}</b>
          </div>
        )) : <p className="muted" style={{ marginTop: 8 }}>Aucun sondage.</p>}
      </div>
    </>
  );
}

function FormPublication({ profilId, secteurCode }: { profilId: string; secteurCode: string }) {
  const [categorie, setCategorie] = useState('information');
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [lien, setLien] = useState('');
  const [expire, setExpire] = useState('');
  const [epinglee, setEpinglee] = useState(false);
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
        const chemin = `${profilId}/officiel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await sb.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) { toast("Une photo n'a pas pu être envoyée."); continue; }
        setPhotos((p) => [...p, sb.storage.from('photos').getPublicUrl(chemin).data.publicUrl]);
      } catch { toast('Photo illisible, essayez-en une autre.'); }
    }
    setEnvoiPhoto(false);
    if (fichier.current) fichier.current.value = '';
  }

  async function publier() {
    if (titre.trim().length < 3) { setErreur('Donnez un titre à votre information.'); return; }
    if (texte.trim().length < 3) { setErreur('Écrivez le contenu de votre information.'); return; }
    setErreur(''); setEnvoi(true);

    const { data, error } = await creerClient().from('publications_officielles').insert({
      auteur_id: profilId, secteur: secteurCode, categorie,
      titre: titre.trim(), texte: texte.trim(),
      lien: lien.trim() || null, photos,
      epinglee, expire_le: expire ? new Date(expire).toISOString() : null,
    }).select('id').single();

    setEnvoi(false);
    if (error || !data) { setErreur("La publication n'a pas pu être enregistrée."); return; }
    toast('Information publiée, les habitants du secteur sont prévenus');
    router.push(`/informations/${data.id}`);
    router.refresh();
  }

  return (
    <div className="card">
      <h3>Nouvelle information</h3>
      <p className="tiny" style={{ marginTop: 5 }}>
        Elle apparaîtra sur la page d&apos;accueil des habitants du secteur, et
        chacun recevra une notification dans ses messages.
      </p>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="of-cat">Nature</label>
        <select className="inp" id="of-cat" value={categorie}
          onChange={(e) => setCategorie(e.target.value)}>
          {CATEGORIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="of-ti">Titre</label>
        <input className="inp" id="of-ti" maxLength={140} value={titre}
          placeholder="Coupure d'eau mardi matin"
          onChange={(e) => setTitre(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="of-tx">Contenu</label>
        <textarea className="inp" id="of-tx" rows={6} maxLength={4000} value={texte}
          onChange={(e) => setTexte(e.target.value)} />
      </div>

      <div className="grille-2">
        <div className="field">
          <label htmlFor="of-li">Lien</label>
          <input className="inp" id="of-li" type="url" maxLength={300} value={lien}
            placeholder="https://" onChange={(e) => setLien(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="of-ex">Retirer après le</label>
          <input className="inp" id="of-ex" type="date" value={expire}
            onChange={(e) => setExpire(e.target.value)} />
          <p className="help">Facultatif. Utile pour une information datée.</p>
        </div>
      </div>

      <div className="field">
        <label id="of-ph">Photos</label>
        <div className="evt-photos" role="group" aria-labelledby="of-ph">
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

      <label className="case">
        <input type="checkbox" checked={epinglee} onChange={(e) => setEpinglee(e.target.checked)} />
        Épingler en tête des informations
      </label>

      {erreur && <p className="errmsg" style={{ margin: '10px 0' }}>{erreur}</p>}
      <button className="btn btn-p" onClick={publier} disabled={envoi || envoiPhoto}
        style={{ marginTop: 12 }}>
        {envoi ? 'Publication…' : "Publier l'information"}
      </button>
    </div>
  );
}

function FormSondage({ profilId, secteurCode }: { profilId: string; secteurCode: string }) {
  const [question, setQuestion] = useState('');
  const [precisions, setPrecisions] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiple, setMultiple] = useState(false);
  const [clos, setClos] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function lancer() {
    const propres = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3) { setErreur('Formulez votre question.'); return; }
    if (propres.length < 2) { setErreur('Proposez au moins deux réponses.'); return; }
    setErreur(''); setEnvoi(true);

    const sb = creerClient();
    const { data, error } = await sb.from('sondages').insert({
      auteur_id: profilId, secteur: secteurCode,
      question: question.trim(), precisions: precisions.trim() || null,
      choix_multiple: multiple,
      clos_le: clos ? new Date(clos).toISOString() : null,
    }).select('id').single();

    if (error || !data) {
      setEnvoi(false);
      setErreur("Le sondage n'a pas pu être créé.");
      return;
    }

    const { error: eOpt } = await sb.from('sondage_options').insert(
      propres.map((libelle, i) => ({ sondage_id: data.id, libelle, position: i }))
    );

    setEnvoi(false);
    if (eOpt) {
      // Un sondage sans réponses n'a pas de sens : on le retire.
      await sb.from('sondages').delete().eq('id', data.id);
      setErreur("Les réponses n'ont pas pu être enregistrées.");
      return;
    }

    toast('Sondage lancé, les habitants du secteur sont prévenus');
    router.push(`/sondages/${data.id}`);
    router.refresh();
  }

  return (
    <div className="card">
      <h3>Nouveau sondage</h3>
      <p className="tiny" style={{ marginTop: 5 }}>
        Les résultats se mettent à jour au fil des votes. Les totaux sont
        publics, les votes individuels ne le sont pour personne, pas même
        pour vous.
      </p>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="so-q">Question</label>
        <input className="inp" id="so-q" maxLength={300} value={question}
          placeholder="Où installer le prochain composteur collectif ?"
          onChange={(e) => setQuestion(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="so-p">Précisions</label>
        <textarea className="inp" id="so-p" rows={3} maxLength={1000} value={precisions}
          onChange={(e) => setPrecisions(e.target.value)} />
      </div>

      <div className="field">
        <label>Réponses possibles</label>
        {options.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label className="sr-only" htmlFor={`so-o-${i}`}>Réponse {i + 1}</label>
            <input className="inp" id={`so-o-${i}`} maxLength={120} value={o}
              placeholder={`Réponse ${i + 1}`}
              onChange={(e) => setOptions((v) => v.map((x, j) => (j === i ? e.target.value : x)))} />
            {options.length > 2 && (
              <button type="button" className="btn-x" aria-label={`Retirer la réponse ${i + 1}`}
                onClick={() => setOptions((v) => v.filter((_, j) => j !== i))}>×</button>
            )}
          </div>
        ))}
        {options.length < 8 && (
          <button type="button" className="btn btn-s btn-sm"
            onClick={() => setOptions((v) => [...v, ''])}>
            Ajouter une réponse
          </button>
        )}
      </div>

      <label className="case">
        <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
        Autoriser plusieurs réponses
      </label>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="so-c">Clore le</label>
        <input className="inp" id="so-c" type="date" value={clos}
          onChange={(e) => setClos(e.target.value)} />
        <p className="help">Facultatif. Sans date, le sondage reste ouvert.</p>
      </div>

      {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
      <button className="btn btn-p" onClick={lancer} disabled={envoi}>
        {envoi ? 'Création…' : 'Lancer le sondage'}
      </button>
    </div>
  );
}
