import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase-server';
import { clientService, envoyerCourriel, adressesModeration, AVERTISSEMENT, SITE } from '@/lib/courriel';

export const dynamic = 'force-dynamic';

/** Alerte la modération qu'une structure demande à être vérifiée. */
export async function POST(requete: Request) {
  const { type, nom, email } = await requete.json().catch(() => ({}));
  if (!type || !nom || !email) {
    return NextResponse.json({ erreur: 'Requête incomplète.' }, { status: 400 });
  }

  const sb = creerClientServeur();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erreur: 'Connexion requise.' }, { status: 401 });

  const { data: p } = await clientService()
    .from('profils').select('prenom').eq('id', user.id).maybeSingle();

  const corps = [
    'Une structure demande à être vérifiée sur mon-petitpotager.com.',
    '',
    `Type : ${type}`,
    `Nom : ${nom}`,
    `Adresse officielle déclarée : ${email}`,
    `Demandeur : ${p?.prenom ?? user.id}`,
    '',
    "Vérifiez que l'adresse appartient bien à la structure avant d'accepter :",
    `${SITE}/moderation`,
    AVERTISSEMENT,
  ].join('\n');

  const adresses = await adressesModeration();
  let envoyes = 0;
  for (const a of adresses) {
    if (await envoyerCourriel({
      destinataire: a,
      sujet: `Demande de structure : ${nom}`,
      corps, motif: 'demande_organisation_moderation',
    })) envoyes += 1;
  }

  return NextResponse.json({ destinataires: adresses.length, envoyes });
}
