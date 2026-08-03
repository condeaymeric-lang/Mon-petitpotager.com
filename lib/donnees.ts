import { creerClientServeur } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import type { Profil, Secteur, AnnonceProche, EvenementProche, ProducteurProche } from '@/lib/types';

/** Profil + secteur de l'utilisateur connecté. Redirige si non connecté. */
export async function profilCourant() {
  const sb = creerClientServeur();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/connexion');

  // mon_profil() : le membre lit sa fiche complète. La table, elle, ne
  // laisse pas voir le téléphone ni le SIRET des autres.
  const { data: fiches } = await sb.rpc('mon_profil');
  const profil = (fiches?.[0] ?? null) as Profil | null;

  if (!profil) redirect('/inscription');

  let secteur: Secteur | null = null;
  if (profil.secteur) {
    const { data } = await sb
      .from('secteurs').select('*')
      .eq('code_insee', profil.secteur).maybeSingle<Secteur>();
    secteur = data;
  }

  return { user, profil, secteur, sb };
}

/** Annonces dans le rayon, via la fonction SQL PostGIS. */
export async function annoncesAutour(
  lat: number, lon: number, rayonKm: number, categorie?: string
) {
  const sb = creerClientServeur();
  const { data, error } = await sb.rpc('annonces_autour', {
    p_lat: lat, p_lon: lon, p_rayon_km: rayonKm,
    p_categorie: categorie ?? null, p_limite: 60,
  });
  if (error) {
    console.error('annonces_autour:', error.message);
    return [] as AnnonceProche[];
  }
  return (data ?? []) as AnnonceProche[];
}

/** Événements à venir dans le rayon. Même règle que les annonces :
 *  rien au-delà du secteur de l'utilisateur. */
export async function evenementsAutour(lat: number, lon: number, rayonKm: number, limite = 20) {
  const sb = creerClientServeur();
  const { data, error } = await sb.rpc('evenements_autour', {
    p_lat: lat, p_lon: lon, p_rayon_km: rayonKm, p_limite: limite,
  });
  if (error) {
    console.error('evenements_autour:', error.message);
    return [] as EvenementProche[];
  }
  return (data ?? []) as EvenementProche[];
}

/** Producteurs professionnels du rayon. */
export async function producteursAutour(lat: number, lon: number, rayonKm: number) {
  const sb = creerClientServeur();
  const { data, error } = await sb.rpc('producteurs_autour', {
    p_lat: lat, p_lon: lon, p_rayon_km: rayonKm, p_limite: 60,
  });
  if (error) {
    console.error('producteurs_autour:', error.message);
    return [] as ProducteurProche[];
  }
  return (data ?? []) as ProducteurProche[];
}

/** Produits des professionnels du secteur, mis en avant. */
export async function annoncesEnAvant(lat: number, lon: number, rayonKm: number, limite = 12) {
  const sb = creerClientServeur();
  const { data, error } = await sb.rpc('annonces_en_avant', {
    p_lat: lat, p_lon: lon, p_rayon_km: rayonKm, p_limite: limite,
  });
  if (error) {
    console.error('annonces_en_avant:', error.message);
    return [] as AnnonceProche[];
  }
  return (data ?? []) as AnnonceProche[];
}

export async function catalogue() {
  const sb = creerClientServeur();
  const [{ data: produits }, { data: varietes }] = await Promise.all([
    sb.from('produits').select('*').order('categorie'),
    sb.from('varietes').select('*').order('nom'),
  ]);
  return { produits: produits ?? [], varietes: varietes ?? [] };
}

/** Voisins les plus actifs du rayon, pour le classement. */
export async function classementVoisins(lat: number, lon: number, rayonKm: number, limite = 10) {
  const sb = creerClientServeur();
  const { data, error } = await sb.rpc('classement_voisins', {
    p_lat: lat, p_lon: lon, p_rayon_km: rayonKm, p_limite: limite,
  });
  if (error) {
    console.error('classement_voisins:', error.message);
    return [];
  }
  return data ?? [];
}

/** Informations publiées par les mairies et associations du rayon. */
export async function informationsAutour(lat: number, lon: number, rayonKm: number, limite = 4) {
  const sb = creerClientServeur();
  const { data, error } = await sb.rpc('publications_officielles_autour', {
    p_lat: lat, p_lon: lon, p_rayon_km: rayonKm, p_limite: limite,
  });
  if (error) {
    console.error('publications_officielles_autour:', error.message);
    return [];
  }
  return data ?? [];
}
