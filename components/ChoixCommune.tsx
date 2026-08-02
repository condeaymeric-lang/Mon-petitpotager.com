'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { Logo } from '@/components/Illustrations';
import { RAYON_DEFAUT } from '@/lib/utils';

const GEO = 'https://geo.api.gouv.fr';
const COOKIE = 'mpp-secteur';

interface Commune {
  nom: string; code: string; population?: number;
  centre: { coordinates: [number, number] };
}

/** Écran d'entrée pour les visiteurs sans compte : sans commune, il n'y a
 *  pas de rayon, donc rien à montrer. */
export default function ChoixCommune({ communeActuelle }: { communeActuelle?: string }) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<Commune[]>([]);
  const [charge, setCharge] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();

  useEffect(() => {
    const q = recherche.trim();
    if (q.length < 2) { setResultats([]); return; }
    setCharge(true);
    const t = setTimeout(async () => {
      const params = /^\d{5}$/.test(q)
        ? `codePostal=${q}`
        : `nom=${encodeURIComponent(q)}&boost=population`;
      const r = await fetch(`${GEO}/communes?${params}&fields=nom,code,centre,population&limit=12&format=json`)
        .then((x) => x.json()).catch(() => []);
      setResultats(Array.isArray(r) ? r.filter((x: any) => x.centre) : []);
      setCharge(false);
    }, 400);
    return () => clearTimeout(t);
  }, [recherche]);

  async function choisir(c: Commune) {
    setEnvoi(true); setErreur('');
    const [lon, lat] = c.centre.coordinates;

    // Le secteur doit exister en base pour que les requêtes de rayon fonctionnent.
    const { error } = await creerClient().from('secteurs').upsert({
      code_insee: c.code, nom: c.nom,
      departement: c.code.slice(0, 2),
      population: c.population ?? 0, lat, lon,
    }, { onConflict: 'code_insee', ignoreDuplicates: true });

    if (error) {
      setEnvoi(false);
      setErreur("La commune n'a pas pu être enregistrée. Réessayez.");
      return;
    }

    // Un an : la commune n'est pas une donnée sensible, juste un repère.
    document.cookie = `${COOKIE}=${c.code}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="onb">
      <div className="onb-in">
        <div className="brand" style={{ fontSize: '1.7rem' }}>
          <Logo size={29} />mon<i>petit</i>potager
        </div>
        <h1>Que pousse-t-il près de chez vous ?</h1>
        <p className="lede">
          Choisissez votre commune pour voir ce qui se vend, se troque et se donne
          dans les {RAYON_DEFAUT} km alentour. Aucun compte n&apos;est nécessaire
          pour regarder.
        </p>

        <div className="field">
          <label htmlFor="rc">Votre commune</label>
          <input className="inp" id="rc" autoComplete="off" autoFocus
            value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom de commune ou code postal" />
          <p className="help" aria-live="polite">
            {charge ? 'Recherche…'
              : resultats.length > 0
                ? `${resultats.length} commune${resultats.length > 1 ? 's' : ''} trouvée${resultats.length > 1 ? 's' : ''}.`
                : 'Communes fournies par l’API Géo de l’État.'}
          </p>
        </div>

        {erreur && <p className="errmsg" role="alert">{erreur}</p>}

        {resultats.length > 0 && (
          <div className="var-list">
            {resultats.map((c) => (
              <button key={c.code} type="button" className="var-btn"
                disabled={envoi} onClick={() => choisir(c)}>
                <div>
                  <b>{c.nom}</b>
                  <span>
                    {c.population ? `${c.population.toLocaleString('fr-FR')} habitants` : 'Population inconnue'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="tiny center" style={{ marginTop: 22 }}>
          {communeActuelle
            ? <>Vous consultez actuellement {communeActuelle}. </>
            : null}
          Vous avez déjà un compte ?{' '}
          <Link href="/connexion" style={{ color: 'var(--forest-2)', fontWeight: 600 }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
