import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Rafraîchit la session à chaque requête et protège les pages privées. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Le site se consulte sans compte : on ne protège que ce qui engage
  // vraiment la personne (panier, commandes, profil, espace vendeur).
  const publiques = [
    '/connexion', '/inscription', '/pourquoi', '/auth',
    '/cgu', '/confidentialite', '/mentions-legales', '/contact',
    '/annonce', '/producteurs', '/evenements', '/membre',
    // Les informations des mairies et les sondages se consultent sans
    // compte : c'est de l'information publique. Voter, en revanche,
    // demande un compte, et la page le dit.
    '/informations', '/sondages',
  ];
  const estAccueil = path === '/';
  const estPublique = publiques.some((p) => path.startsWith(p));

  if (!user && !estPublique && !estAccueil) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('retour', path);
    return NextResponse.redirect(url);
  }

  if (user && (path === '/connexion' || path === '/inscription')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
