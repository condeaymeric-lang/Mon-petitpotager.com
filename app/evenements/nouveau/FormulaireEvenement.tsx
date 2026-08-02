'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { LIBELLE_TYPE } from '@/components/CarteEvenement';
import { distanceKm } from '@/lib/utils';
import type { Secteur, TypeEvenement } from '@/lib/types';

const TYPES: TypeEvenement[] = ['marche', 'fete', 'brocante', 'porte_ouverte', 'autre'];
const GEO = 'https://geo.api.gouv.fr';

interface Commune {
  nom: string;
  code: string;
  centre: { coordinates: [number, number] };
}

export default function FormulaireEvenement({
  profilId, secteur, rayonKm,
}: { profilId: string; secteur: Secteur; rayonKm: number }) {
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<TypeEvenement>('fete');
  const [debut, setDebut] = useState('');
  const [lieu, setLieu] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  // Commune de l'événement : celle du membre par défaut, modifiable.
  const [commune, setCommune] = useState({
    nom: secteur.nom, lat: secteur.lat, lon: secteur.lon, km: 0,
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

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) { setErreur("Donnez un nom à l'événement."); return; }
    if (!debut) { setErreur("Indiquez la date et l'heure de début."); return; }
    if (new Date(debut).getTime() < Date.now()) {
      setErreur('La date doit être dans le futur.');
      return;
    }
    setErreur(''); setEnvoi(true);

    const { error } = await creerClient().from('evenements').insert({
      auteur_id: profilId,
      secteur: secteur.code_insee,
      titre: titre.trim(),
      type,
      debut: new Date(debut).toISOString(),
      lieu: lieu.trim() || null,
      description: description.trim() || null,
      commune: commune.nom,
      lat: commune.lat,
      lon: commune.lon,
    });

    setEnvoi(false);
    if (error) {
      setErreur("L'événement n'a pas pu être publié. Vérifiez votre connexion et réessayez.");
      return;
    }
    toast('Événement publié');
    router.push('/evenements');
    router.refresh();
  }

  return (
    <div className="page page-form">
      <button className="back" onClick={() => router.back()}>← Retour</button>
      <div className="page-head">
        <h1>Proposer un événement</h1>
        <p>Il sera visible par les habitants du secteur, dans leur rayon.</p>
      </div>

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

        {erreur && <p className="errmsg" style={{ marginBottom: 12 }} role="alert">{erreur}</p>}
        <button className="btn btn-p" disabled={envoi}>
          {envoi ? 'Publication…' : 'Publier l’événement'}
        </button>
      </form>
    </div>
  );
}
