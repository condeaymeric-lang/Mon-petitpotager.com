'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { LIBELLE_TYPE } from '@/components/CarteEvenement';
import { distanceKm, compresserImage } from '@/lib/utils';
import type { Secteur, TypeEvenement } from '@/lib/types';

const TYPES: TypeEvenement[] = ['marche', 'fete', 'brocante', 'porte_ouverte', 'autre'];
const GEO = 'https://geo.api.gouv.fr';

interface Commune {
  nom: string;
  code: string;
  centre: { coordinates: [number, number] };
}

interface EvenementExistant {
  id: string; titre: string; type: TypeEvenement; debut: string;
  lieu: string | null; description: string | null; commune: string;
  lat: number | null; lon: number | null; photos: string[] | null;
}

/** Valeur attendue par un champ datetime-local, en heure locale. */
function pourChamp(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function FormulaireEvenement({
  profilId, secteur, rayonKm, evenement, moderation = false,
}: {
  profilId: string; secteur: Secteur; rayonKm: number;
  evenement?: EvenementExistant; moderation?: boolean;
}) {
  const modif = !!evenement;
  const [titre, setTitre] = useState(evenement?.titre ?? '');
  const [type, setType] = useState<TypeEvenement>(evenement?.type ?? 'fete');
  const [debut, setDebut] = useState(evenement ? pourChamp(evenement.debut) : '');
  const [lieu, setLieu] = useState(evenement?.lieu ?? '');
  const [description, setDescription] = useState(evenement?.description ?? '');
  const [photos, setPhotos] = useState<string[]>(evenement?.photos ?? []);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  // Commune de l'événement : celle du membre par défaut, modifiable.
  const [commune, setCommune] = useState({
    nom: evenement?.commune ?? secteur.nom,
    lat: evenement?.lat ?? secteur.lat,
    lon: evenement?.lon ?? secteur.lon,
    km: evenement?.lat && evenement?.lon
      ? +distanceKm(secteur.lat, secteur.lon, evenement.lat, evenement.lon).toFixed(1)
      : 0,
  });
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<Commune[]>([]);
  const [chargeGeo, setChargeGeo] = useState(false);

  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const q = recherche.trim();
    if (q.length < 2) { setResultats([]); return; }
    setChargeGeo(true);
    const t = setTimeout(async () => {
      const params = /^\d{5}$/.test(q)
        ? `codePostal=${q}`
        : `nom=${encodeURIComponent(q)}&boost=population`;
      const r = await fetch(`${GEO}/communes?${params}&fields=nom,code,centre&limit=12&format=json`)
        .then((x) => x.json()).catch(() => []);
      setResultats(Array.isArray(r) ? r.filter((x: any) => x.centre) : []);
      setChargeGeo(false);
    }, 400);
    return () => clearTimeout(t);
  }, [recherche]);

  function choisirCommune(c: Commune) {
    const [lon, lat] = c.centre.coordinates;
    const km = +distanceKm(secteur.lat, secteur.lon, lat, lon).toFixed(1);
    if (km > rayonKm) {
      setErreur(
        `${c.nom} est à ${km} km, au-delà de votre rayon de ${rayonKm} km. ` +
        `Personne ne verrait cet événement, pas même vous.`
      );
      return;
    }
    setErreur('');
    setCommune({ nom: c.nom, lat, lon, km });
    setRecherche('');
    setResultats([]);
  }

  async function ajouterPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    if (!fichiers.length) return;
    setEnvoiPhoto(true);
    const sb = creerClient();

    for (const f of fichiers.slice(0, 6 - photos.length)) {
      try {
        const blob = await compresserImage(f, 1400, 0.8);
        const chemin = `${profilId}/evenement-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await sb.storage.from('photos')
          .upload(chemin, blob, { contentType: 'image/jpeg' });
        if (error) { toast("Une photo n'a pas pu être envoyée."); continue; }
        const url = sb.storage.from('photos').getPublicUrl(chemin).data.publicUrl;
        setPhotos((p) => [...p, url]);
      } catch {
        toast('Photo illisible, essayez-en une autre.');
      }
    }

    setEnvoiPhoto(false);
    if (fichier.current) fichier.current.value = '';
  }

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) { setErreur("Donnez un nom à l'événement."); return; }
    if (!debut) { setErreur("Indiquez la date et l'heure de début."); return; }
    if (!modif && new Date(debut).getTime() < Date.now()) {
      setErreur('La date doit être dans le futur.');
      return;
    }
    setErreur(''); setEnvoi(true);

    const champs = {
      titre: titre.trim(),
      type,
      debut: new Date(debut).toISOString(),
      lieu: lieu.trim() || null,
      description: description.trim() || null,
      commune: commune.nom,
      lat: commune.lat,
      lon: commune.lon,
      photos,
    };

    const sb = creerClient();
    const { error } = modif
      ? await sb.from('evenements').update(champs).eq('id', evenement!.id)
      : await sb.from('evenements').insert({
          ...champs, auteur_id: profilId, secteur: secteur.code_insee,
        });

    setEnvoi(false);
    if (error) {
      setErreur(modif
        ? "Les modifications n'ont pas pu être enregistrées. Réessayez."
        : "L'événement n'a pas pu être publié. Vérifiez votre connexion et réessayez.");
      return;
    }
    toast(modif ? 'Événement mis à jour' : 'Événement publié');
    router.push(modif ? `/evenements/${evenement!.id}` : '/evenements');
    router.refresh();
  }

  return (
    <div className="page page-form">
      <button className="back" onClick={() => router.back()}>← Retour</button>
      <div className="page-head">
        <h1>{modif ? "Modifier l'événement" : 'Proposer un événement'}</h1>
        <p>
          {modif
            ? 'Les changements sont visibles aussitôt par les habitants du secteur.'
            : 'Il sera visible par les habitants du secteur, dans leur rayon.'}
        </p>
      </div>

      {moderation && (
        <div className="avert" role="status">
          <b>Vous modifiez l&apos;événement d&apos;un autre membre.</b>
          <p>
            Cette correction se fait au titre de la modération. Prévenez
            l&apos;organisateur si elle change le sens de son annonce.
          </p>
        </div>
      )}

      <form onSubmit={publier}>
        <div className="field">
          <label htmlFor="ti">Nom de l&apos;événement</label>
          <input className="inp" id="ti" required maxLength={120}
            value={titre} onChange={(ev) => setTitre(ev.target.value)}
            placeholder="Marché de producteurs" />
        </div>

        <div className="field">
          <label id="type-label">Type</label>
          <div className="seg" role="group" aria-labelledby="type-label">
            {TYPES.map((t) => (
              <button key={t} type="button" className={type === t ? 'on' : ''}
                onClick={() => setType(t)}>{LIBELLE_TYPE[t]}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="db">Date et heure</label>
          <input className="inp" id="db" type="datetime-local" required
            value={debut} onChange={(ev) => setDebut(ev.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="rech">Commune</label>
          <div className="commune-on">
            <span>
              <b>{commune.nom}</b>
              {commune.km > 0 && <span className="tiny"> · à {commune.km} km de chez vous</span>}
            </span>
          </div>
          <input className="inp" id="rech" style={{ marginTop: 8 }}
            value={recherche} onChange={(ev) => setRecherche(ev.target.value)}
            placeholder="Changer de commune : nom ou code postal"
            autoComplete="off" />
          <p className="help" aria-live="polite">
            {chargeGeo ? 'Recherche…'
              : resultats.length > 0 ? `${resultats.length} commune${resultats.length > 1 ? 's' : ''} trouvée${resultats.length > 1 ? 's' : ''}.`
              : `Seules les communes situées à moins de ${rayonKm} km peuvent être choisies.`}
          </p>

          {resultats.length > 0 && (
            <div className="var-list" style={{ marginTop: 8 }}>
              {resultats.map((c) => {
                const [lon, lat] = c.centre.coordinates;
                const km = +distanceKm(secteur.lat, secteur.lon, lat, lon).toFixed(1);
                const trop = km > rayonKm;
                return (
                  <button key={c.code} type="button" className="var-btn"
                    onClick={() => choisirCommune(c)}
                    aria-disabled={trop}
                    style={trop ? { opacity: .5 } : undefined}>
                    <div>
                      <b>{c.nom}</b>
                      <span>{km} km{trop ? ' — hors de votre rayon' : ''}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="li">Lieu précis</label>
          <input className="inp" id="li" maxLength={160}
            value={lieu} onChange={(ev) => setLieu(ev.target.value)}
            placeholder="Place du village" />
        </div>

        <div className="field">
          <label htmlFor="de">Description</label>
          <textarea className="inp" id="de" maxLength={400}
            value={description} onChange={(ev) => setDescription(ev.target.value)} />
        </div>

        <div className="field">
          <label id="photos-label">Photos</label>
          <p className="help">
            Jusqu&apos;à six photos. Avant l&apos;événement, une affiche ou le lieu ;
            après, ce qu&apos;il s&apos;y est passé.
          </p>
          <div className="evt-photos" role="group" aria-labelledby="photos-label">
            {photos.map((url, i) => (
              <div className="evt-photo" key={url}>
                <img src={url} alt="" loading="lazy" />
                <button type="button" className="btn-x" aria-label={`Retirer la photo ${i + 1}`}
                  onClick={() => setPhotos((p) => p.filter((x) => x !== url))}>×</button>
              </div>
            ))}
            {photos.length < 6 && (
              <button type="button" className="evt-photo evt-photo-plus"
                onClick={() => fichier.current?.click()} disabled={envoiPhoto}>
                {envoiPhoto ? 'Envoi…' : 'Ajouter'}
              </button>
            )}
          </div>
          <input ref={fichier} type="file" accept="image/*" multiple hidden
            onChange={ajouterPhotos} />
        </div>

        {erreur && <p className="errmsg" style={{ marginBottom: 12 }} role="alert">{erreur}</p>}
        <button className="btn btn-p" disabled={envoi || envoiPhoto}>
          {envoi ? 'Enregistrement…' : modif ? 'Enregistrer les modifications' : "Publier l'événement"}
        </button>
      </form>
    </div>
  );
}
