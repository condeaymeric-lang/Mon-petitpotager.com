import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase-server';
import { clientService, envoyerCourriel, adresseDe, AVERTISSEMENT } from '@/lib/courriel';

export const dynamic = 'force-dynamic';

/** Prévient un membre de la décision prise sur son compte ou sa structure. */
export async function POST(requete: Request) {
  const { profilId, genre, accepte, motif } = await requete.json().catch(() => ({}));
  if (!profilId || !genre) {
    return NextResponse.json({ erreur: 'Requête incomplète.' }, { status: 400 });
  }

  // Seul un modérateur déclenche cet envoi.
  const sb = creerClientServeur();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erreur: 'Connexion requise.' }, { status: 401 });

  const service = clientService();
  const { data: moi } = await service
    .from('profils').select('moderateur').eq('id', user.id).maybeSingle();
  if (!moi?.moderateur) {
    return NextResponse.json({ erreur: 'Action réservée à la modération.' }, { status: 403 });
  }

  const email = await adresseDe(profilId);
  if (!email) return NextResponse.json({ erreur: 'Adresse introuvable.' }, { status: 404 });

  const { data: p } = await service
    .from('profils').select('prenom, organisation_nom').eq('id', profilId).maybeSingle();

  const compte = genre === 'compte';
  const sujet = compte
    ? (accepte ? 'Votre compte mon-petitpotager.com est activé'
               : 'Votre inscription à mon-petitpotager.com')
    : (accepte ? 'Votre structure est vérifiée sur mon-petitpotager.com'
               : 'Votre demande de structure sur mon-petitpotager.com');

  const corps = [
    `Bonjour ${p?.prenom ?? ''},`.trim(),
    '',
    compte
      ? (accepte
          ? "Votre inscription a été validée. Vous pouvez désormais publier des annonces, acheter et vendre auprès de vos voisins."
          : "Votre inscription n'a pas été retenue pour le moment.")
      : (accepte
          ? `La structure ${p?.organisation_nom ?? ''} est vérifiée. Vous pouvez publier des informations et lancer des sondages auprès des habitants de votre secteur.`.trim()
          : "Votre demande de statut d'organisation n'a pas été retenue."),
    ...(motif ? ['', `Motif : ${motif}`] : []),
    '',
    accepte
      ? 'Retrouvez votre espace : https://mon-petitpotager.com/profil'
      : 'Vous pouvez répondre à ce message ou nous écrire : https://mon-petitpotager.com/contact',
    AVERTISSEMENT,
  ].join('\n');

  const envoye = await envoyerCourriel({
    destinataire: email, sujet, corps,
    motif: compte ? 'validation_compte' : 'demande_organisation',
  });

  return NextResponse.json({ envoye });
}
