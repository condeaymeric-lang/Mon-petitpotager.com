import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase-server';

/** Point d'arrivée du lien de confirmation reçu par e-mail. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const suite = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = creerClientServeur();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${suite}`);
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
}
