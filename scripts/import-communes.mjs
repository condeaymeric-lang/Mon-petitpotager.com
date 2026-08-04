/**
 * Importe les ~34 800 communes de France dans la table `secteurs`.
 *
 *   1. npm install @supabase/supabase-js
 *   2. Récupérez la clé "service_role" : Supabase → Settings → API
 *      (elle contourne la sécurité RLS — ne la mettez JAMAIS dans le code du site
 *       ni sur GitHub, et ne l'utilisez que depuis votre machine)
 *   3. SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/import-communes.mjs
 *
 * Durée : 2 à 4 minutes.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Manque SUPABASE_URL ou SUPABASE_SERVICE_KEY dans l\'environnement.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const REGIONS = {};

async function main() {
  console.log('Récupération des régions…');
  const regions = await fetch('https://geo.api.gouv.fr/regions?fields=nom,code').then((r) => r.json());
  for (const r of regions) {
    const deps = await fetch(`https://geo.api.gouv.fr/regions/${r.code}/departements?fields=code`).then((x) => x.json());
    for (const d of deps) REGIONS[d.code] = r.nom;
  }

  console.log('Récupération des communes…');
  const communes = await fetch(
    'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population,departement&format=json'
  ).then((r) => r.json());

  const lignes = communes
    .filter((c) => c.centre?.coordinates)
    .map((c) => ({
      code_insee: c.code,
      nom: c.nom,
      code_postal: c.codesPostaux?.[0] ?? null,
      departement: c.departement?.code ?? c.code.slice(0, 2),
      region: REGIONS[c.departement?.code ?? c.code.slice(0, 2)] ?? null,
      population: c.population ?? 0,
      lat: c.centre.coordinates[1],
      lon: c.centre.coordinates[0],
      ouvert: false,
    }));

  console.log(`${lignes.length} communes à insérer.`);

  const LOT = 500;
  for (let i = 0; i < lignes.length; i += LOT) {
    const lot = lignes.slice(i, i + LOT);
    const { error } = await db.from('secteurs').upsert(lot, { onConflict: 'code_insee' });
    if (error) {
      console.error(`Erreur au lot ${i}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`\r  ${Math.min(i + LOT, lignes.length)} / ${lignes.length}`);
  }
  console.log('\nTerminé.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
