'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { Logo } from '@/components/Illustrations';
import { SEUIL_OUVERTURE, RAYON_DEFAUT, distanceKm } from '@/lib/utils';
import type { Role } from '@/lib/types';

const Carte = dynamic(() => import('@/components/Carte'), {
  ssr: false,
  loading: () => <div className="map" style={{ display: 'grid', placeItems: 'center' }}><div className="spin" /></div>,
});

const GEO = 'https://geo.api.gouv.fr';

interface Commune {
  nom: string; code: string; population?: number;
  centre: { coordinates: [number, number] };
}

export default function Inscription() {
  const [etape, setEtape] = useState(0);
  const router = useRouter();

  // étape 1 — lieu
  const [regions, setRegions] = useState<{ code: string; nom: string }[]>([]);
  const [deps, setDeps] = useState<{ code: string; nom: string }[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [region, setRegion] = useState('');
  const [dep, setDep] = useState('');
  const [commune, setCommune] = useState<Commune | null>(null);
  const [cp, setCp] = useState('');
  const [resCp, setResCp] = useState<Commune[]>([]);
  const [chargeGeo, setChargeGeo] = useState(false);

  // étape 2 — voisines
  const [voisines, setVoisines] = useState<{ nom: string; lat: number; lon: number; km: number }[]>([]);
  const [membres, setMembres] = useState(0);

  // étape 3 — compte
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [role, setRole] = useState<Role>('amateur');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [confirme, setConfirme] = useState(false);

  useEffect(() => {
    fetch(`${GEO}/regions?fields=nom,code`)
      .then((r) => r.json())
      .then((d) => setRegions(d.sort((a: any, b: any) => a.nom.localeCompare(b.nom))))
      .catch(() => setErreur("L'annuaire des communes est momentanément indisponible."));
  }, []);

  async function choisirRegion(code: string) {
    setRegion(code); setDep(''); setCommunes([]); setCommune(null);
    if (!code) return setDeps([]);
    const d = await fetch(`${GEO}/regions/${code}/departements?fields=nom,code`).then((r) => r.json());
    setDeps(d.sort((a: any, b: any) => a.code.localeCompare(b.code)));
  }

  async function choisirDep(code: string) {
    setDep(code); setCommune(null);
    if (!code) return setCommunes([]);
    setChargeGeo(true);
    const c = await fetch(`${GEO}/departements/${code}/communes?fields=nom,code,centre,population&format=json`)
      .then((r) => r.json());
    setCommunes(c.filter((x: any) => x.centre).sort((a: any, b: any) => a.nom.localeCompare(b.nom)));
    setChargeGeo(false);
  }

  useEffect(() => {
    if (cp.length !== 5) return setResCp([]);
    const t = setTimeout(async () => {
      const c = await fetch(`${GEO}/communes?codePostal=${cp}&fields=nom,code,centre,population&format=json`)
        .then((r) => r.json()).catch(() => []);
      setResCp(c.filter((x: any) => x.centre));
    }, 400);
    return () => clearTimeout(t);
  }, [cp]);

  /** Communes réellement à moins de 20 km, tous départements confondus. */
  async function chargerVoisines(c: Commune) {
    const [lon, lat] = c.centre.coordinates;
    const depsProches = new Set<string>([c.code.slice(0, 2)]);
    // on sonde 8 points sur le cercle pour repérer les départements limitrophes
    const R = RAYON_DEFAUT / 111.32;
    await Promise.all([...Array(8)].map(async (_, i) => {
      const a = (i * Math.PI) / 4;
      const la = lat + R * Math.cos(a);
      const lo = lon + (R * Math.sin(a)) / Math.cos((lat * Math.PI) / 180);
      try {
        const r = await fetch(`${GEO}/communes?lat=${la.toFixed(5)}&lon=${lo.toFixed(5)}&fields=code`).then((x) => x.json());
        if (r?.[0]) depsProches.add(r[0].code.slice(0, 2));
      } catch { /* zone maritime ou hors France */ }
    }));

    const listes = await Promise.all([...depsProches].map((d) =>
      fetch(`${GEO}/departements/${d}/communes?fields=nom,code,centre,population&format=json`)
        .then((r) => r.json()).catch(() => [])
    ));

    const vus = new Set<string>();
    const proches = listes.flat()
      .filter((x: any) => x.centre && !vus.has(x.code) && vus.add(x.code))
      .map((x: any) => ({
        nom: x.nom, lat: x.centre.coordinates[1], lon: x.centre.coordinates[0],
        km: +distanceKm(lat, lon, x.centre.coordinates[1], x.centre.coordinates[0]).toFixed(1),
      }))
      .filter((x) => x.km <= RAYON_DEFAUT && x.nom !== c.nom)
      .sort((a, b) => a.km - b.km);

    setVoisines(proches);

    // combien de voisins déjà inscrits ou en attente sur ce secteur
    const sb = creerClient();
    const { data } = await sb.from('secteurs').select('membres, attente').eq('code_insee', c.code).maybeSingle();
    setMembres((data?.membres ?? 0) + (data?.attente ?? 0));
  }

  async function creerCompte(e: React.FormEvent) {
    e.preventDefault();
    if (!commune) return;
    setErreur(''); setEnvoi(true);
    const sb = creerClient();
    const [lon, lat] = commune.centre.coordinates;

    // le secteur doit exister avant que le profil ne le référence
    await sb.from('secteurs').upsert({
      code_insee: commune.code, nom: commune.nom,
      departement: commune.code.slice(0, 2),
      population: commune.population ?? 0, lat, lon,
    }, { onConflict: 'code_insee', ignoreDuplicates: true });

    const { data, error } = await sb.auth.signUp({
      email, password: mdp,
      options: {
        data: { prenom, role },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setEnvoi(false);
      setErreur(
        error.message.includes('already registered')
          ? 'Un compte existe déjà avec cette adresse.'
          : error.message.includes('Password')
          ? 'Le mot de passe doit faire au moins 6 caractères.'
          : "Création du compte impossible. Réessayez."
      );
      return;
    }

    // le trigger SQL a créé le profil : on complète le secteur
    if (data.user) {
      await sb.from('profils').update({
        prenom, role, secteur: commune.code, rayon_km: RAYON_DEFAUT,
        cgu_acceptees_le: new Date().toISOString(),
      }).eq('id', data.user.id);

      // chaque inscrit rejoint automatiquement la liste d'attente de son secteur
      await sb.from('liste_attente').insert({
        secteur: commune.code, email, profil_id: data.user.id,
      });
    }

    if (data.session) { router.push('/'); router.refresh(); }
    else { setConfirme(true); setEnvoi(false); }
  }

  const dots = (
    <div className="steps-dot">{[0, 1, 2].map((i) => <i key={i} className={i <= etape ? 'on' : ''} />)}</div>
  );

  if (confirme) {
    return (
      <div className="onb"><div className="onb-in">
        <div className="brand" style={{ fontSize: '1.1rem' }}><Logo size={29} />mon<i>petit</i>potager</div>
        <h1>Vérifiez vos e-mails.</h1>
        <p className="lede">Un lien de confirmation a été envoyé à {email}. Cliquez dessus pour activer votre compte.</p>
        <Link href="/connexion" className="btn btn-s">Retour à la connexion</Link>
      </div></div>
    );
  }

  return (
    <div className="onb"><div className="onb-in">
      <div className="brand" style={{ fontSize: '1.1rem' }}><Logo size={29} />mon<i>petit</i>potager</div>

      {etape === 0 && (<>
        <h1>Où est votre secteur ?</h1>
        <p className="lede">L'application couvre toute la France. Vous ne verrez que les {RAYON_DEFAUT} km autour de chez vous.</p>
        {dots}
        <div className="field">
          <label htmlFor="cp">Chercher par code postal</label>
          <input className="inp" id="cp" inputMode="numeric" maxLength={5} placeholder="38390"
            value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))} />
          <p className="help">Le plus rapide. Sinon, choisissez ci-dessous.</p>
        </div>
        {resCp.length > 0 && (
          <div className="var-list" style={{ marginBottom: 18 }}>
            {resCp.map((c) => (
              <button key={c.code} type="button"
                className={`var-btn${commune?.code === c.code ? ' on' : ''}`}
                onClick={() => setCommune(c)}>
                <div><b>{c.nom}</b><span>{c.population ? `${c.population.toLocaleString('fr-FR')} habitants` : 'Population inconnue'}</span></div>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="tiny">ou</span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <div className="field">
          <label htmlFor="reg">Région</label>
          <select className="inp" id="reg" value={region} onChange={(e) => choisirRegion(e.target.value)}>
            <option value="">Choisir une région</option>
            {regions.map((r) => <option key={r.code} value={r.code}>{r.nom}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dep">Département</label>
          <select className="inp" id="dep" value={dep} disabled={!region} onChange={(e) => choisirDep(e.target.value)}>
            <option value="">{region ? 'Choisir un département' : "Choisissez d'abord une région"}</option>
            {deps.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.nom}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="com">Commune</label>
          <select className="inp" id="com" disabled={!dep || chargeGeo}
            value={commune?.code ?? ''}
            onChange={(e) => setCommune(communes.find((c) => c.code === e.target.value) ?? null)}>
            <option value="">{chargeGeo ? 'Chargement…' : dep ? 'Choisir une commune' : "Choisissez d'abord un département"}</option>
            {communes.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nom}{c.population ? ` (${c.population.toLocaleString('fr-FR')} hab.)` : ''}
              </option>
            ))}
          </select>
        </div>

        {erreur && <p className="errmsg">{erreur}</p>}
        <button className="btn btn-p" disabled={!commune}
          onClick={() => { if (commune) { chargerVoisines(commune); setEtape(1); } }}>
          Continuer
        </button>
        <p className="tiny center" style={{ marginTop: 13 }}>Communes fournies par l'API Géo de l'État.</p>
      </>)}

      {etape === 1 && commune && (<>
        <h1>{commune.nom}</h1>
        <p className="lede">Voici exactement ce que vous verrez : {RAYON_DEFAUT} km à la ronde, rien de plus.</p>
        {dots}
        <Carte lat={commune.centre.coordinates[1]} lon={commune.centre.coordinates[0]}
          nom={commune.nom} voisines={voisines} rayonKm={RAYON_DEFAUT} />
        <div className="card" style={{ marginTop: 14 }}>
          <div className="stats">
            <div><b>{voisines.length + 1}</b><span className="tiny">communes</span></div>
            <div><b>{(voisines.reduce((a) => a, 0) + (commune.population ?? 0)).toLocaleString('fr-FR')}</b><span className="tiny">habitants</span></div>
            <div><b>{RAYON_DEFAUT}</b><span className="tiny">km de rayon</span></div>
          </div>
        </div>
        <div className={`gauge${membres >= SEUIL_OUVERTURE ? '' : ' wait'}`} style={{ marginTop: 12 }}>
          <div className="gauge-top">
            <span>{membres >= SEUIL_OUVERTURE ? 'Secteur ouvert' : 'Secteur en germination'}</span>
            <b>{membres} / {SEUIL_OUVERTURE} voisins</b>
          </div>
          <div className="gauge-bar"><i style={{ width: `${Math.min(100, (membres / SEUIL_OUVERTURE) * 100)}%` }} /></div>
          <p>{membres >= SEUIL_OUVERTURE
            ? 'Vous pourrez acheter et vendre dès votre inscription.'
            : `Encore ${SEUIL_OUVERTURE - membres} voisins et le secteur s'ouvre. Inscrivez-vous : vous serez prévenu le jour de l'ouverture.`}</p>
        </div>
        <div className="row-btn" style={{ marginTop: 18 }}>
          <button className="btn btn-s" onClick={() => setEtape(0)}>Retour</button>
          <button className="btn btn-p" onClick={() => setEtape(2)}>Continuer</button>
        </div>
      </>)}

      {etape === 2 && (<>
        <h1>Créer mon compte</h1>
        <p className="lede">Dernière étape.</p>
        {dots}
        <form onSubmit={creerCompte}>
          <div className="field">
            <label htmlFor="pr">Votre prénom</label>
            <input className="inp" id="pr" required value={prenom}
              onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
          </div>
          <div className="field">
            <label htmlFor="em">Adresse e-mail</label>
            <input className="inp" id="em" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="mp">Mot de passe</label>
            <input className="inp" id="mp" type="password" required minLength={6} value={mdp}
              onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" />
            <p className="help">6 caractères minimum.</p>
          </div>
          <div className="field">
            <label>Vous venez surtout pour</label>
            <div className="seg" style={{ flexDirection: 'column' }}>
              {([['acheteur', 'Acheter près de chez moi'],
                 ['amateur', 'Vendre mon surplus de jardin'],
                 ['pro', 'Vendre ma production (professionnel)']] as [Role, string][]).map(([v, l]) => (
                <button key={v} type="button" className={role === v ? 'on' : ''}
                  style={{ textAlign: 'left' }} onClick={() => setRole(v)}>{l}</button>
              ))}
            </div>
          </div>
          {erreur && <p className="errmsg" style={{ marginBottom: 12 }}>{erreur}</p>}
          <button className="btn btn-p" disabled={envoi}>{envoi ? 'Création…' : 'Créer mon compte'}</button>
          <button type="button" className="btn btn-s" style={{ marginTop: 10 }} onClick={() => setEtape(1)}>Retour</button>
        </form>
      </>)}
    </div></div>
  );
}
