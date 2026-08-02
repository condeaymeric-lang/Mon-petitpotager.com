import { cookies } from 'next/headers';
import { creerClientServeur } from '@/lib/supabase-server';
import { RAYON_DEFAUT } from '@/lib/utils';
import type { Profil, Secteur } from '@/lib/types';

export const COOKIE_SECTEUR = 'mpp-secteur';

export interface Contexte {
  connecte: boolean;
  profil: Profil | null;
  secteur: Secteur | null;
  rayonKm: number;
  sb: ReturnType<typeof creerClientServeur>;
}

/**
 * Contexte de consultation, que la personne ait un compte ou non.
 *
 * Un visiteur choisit une commune, mémorisée dans un cookie : sans elle,
 * la règle du rayon n'aurait aucun sens à appliquer. Il voit exactement
 * ce que verrait un habitant de cette commune, ni plus ni moins.
 */
export async function contexteVisite(): Promise<Contexte> {
  const sb = creerClientServeur();
  const { data: { user } } = await sb.auth.getUser();

  if (user) {
    const { data: profil } = await sb
      .from('profils').select('*').eq('id', user.id).maybeSingle<Profil>();

    let secteur: Secteur | null = null;
    if (profil?.secteur) {
      const { data } = await sb.from('secteurs').select('*')
        .eq('code_insee', profil.secteur).maybeSingle<Secteur>();
      secteur = data;
    }
    return {
      connecte: true, profil: profil ?? null, secteur,
      rayonKm: profil?.rayon_km ?? RAYON_DEFAUT, sb,
    };
  }

  const code = cookies().get(COOKIE_SECTEUR)?.value;
  let secteur: Secteur | null = null;
  if (code) {
    const { data } = await sb.from('secteurs').select('*')
      .eq('code_insee', code).maybeSingle<Secteur>();
    secteur = data;
  }

  return { connecte: false, profil: null, secteur, rayonKm: RAYON_DEFAUT, sb };
}
