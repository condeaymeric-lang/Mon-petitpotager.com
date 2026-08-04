'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

const GEO = 'https://geo.api.gouv.fr';

interface Commune {
  nom: string; code: string; population?: number;
  centre: { coordinates: [number, number] };
}

/**
 * Changement de commune de rattachement.
 *
 * On déménage, on change de jardin : le secteur ne doit pas être figé
 * au jour de l'inscription. Le déplacement est franc, et l'écran le
 * dit : ce qui était visible autour de l'ancienne commune ne le sera
 * plus, puisque la règle du rayon s'applique à la nouvelle.
 */
export default function ChangerSecteur({ communeActuelle }: { communeActuelle: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<Commune[]>([]);
  const [charge, setCharge] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const q = recherche.trim();
    if (q.length < 2) { setResultats([]); return; }
    setCharge(true);
    const t = setTimeout(async () => {
      const params = /^\d{5}$/.test(q)
        ? `codePostal=${q}`
        : `nom=${encodeURIComponent(q)}&boost=population`;
      const r = await fetch(
        `${GEO}/communes?${params}&fields=nom,code,centre,population&limit=12&format=json`
      ).then((x) => x.json()).catch(() => []);
      setResultats(Array.isArray(r) ? r.filter((x: any) => x.centre) : []);
      setCharge(false);
    }, 400);
    return () => clearTimeout(t);
  }, [recherche]);

  async function choisir(c: Commune) {
    setEnvoi(true); setErreur('');
    const sb = creerClient();
    const [lon, lat] = c.centre.coordinates;

    // La commune doit exister en base : les requêtes de rayon s'appuient dessus.
    const { error: eSecteur } = await sb.from('secteurs').upsert({
      code_insee: c.code, nom: c.nom, departement: c.code.slice(0, 2),
      population: c.population ?? 0, lat, lon,
    }, { onConflict: 'code_insee', ignoreDuplicates: true });

    if (eSecteur) {
      setEnvoi(false);
      setErreur("La commune n'a pas pu être enregistrée. Réessayez.");
      return;
    }

    const { error } = await sb.rpc('changer_secteur', { p_code: c.code });
    setEnvoi(false);
    if (error) { setErreur('Le changement de secteur a échoué. Réessayez.'); return; }

    toast(`Secteur déplacé sur ${c.nom}`);
    setOuvert(false);
    setRecherche('');
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button className="btn btn-s" style={{ marginTop: 12 }} onClick={() => setOuvert(true)}>
        Changer de commune
      </button>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="field">
        <label htmlFor="ch-com">Nouvelle commune de rattachement</label>
        <input className="inp" id="ch-com" type="search" value={recherche} autoComplete="off"
          placeholder="Nom de la commune ou code postal"
          onChange={(e) => setRecherche(e.target.value)} />
        <p className="help" aria-live="polite">
          {charge ? 'Recherche en cours…'
            : recherche.trim().length >= 2
              ? `${resultats.length} commune${resultats.length > 1 ? 's' : ''} trouvée${resultats.length > 1 ? 's' : ''}.`
              : 'Deux lettres suffisent pour lancer la recherche.'}
        </p>
      </div>

      {resultats.length > 0 && (
        <div className="var-list">
          {resultats.map((c) => (
            <button key={c.code} type="button" className="var-btn" disabled={envoi}
              onClick={() => choisir(c)}>
              <div>
                <b>{c.nom}</b>
                <span>
                  {c.code}
                  {c.population ? ` · ${c.population.toLocaleString('fr-FR')} habitants` : ''}
                  {communeActuelle === c.nom ? ' · commune actuelle' : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="tiny" style={{ marginTop: 10 }}>
        En changeant de commune, vous ne verrez plus que les annonces, les
        producteurs et les événements situés dans votre rayon autour de la
        nouvelle. Vos commandes et vos annonces en cours ne sont pas déplacées.
      </p>

      {erreur && <p className="errmsg" style={{ marginTop: 10 }}>{erreur}</p>}
      <button className="btn btn-s" style={{ marginTop: 12 }} onClick={() => setOuvert(false)}>
        Annuler
      </button>
    </div>
  );
}
