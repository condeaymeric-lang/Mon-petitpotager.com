import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase-server';
import { eur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

import { clientService, envoyerCourriel, AVERTISSEMENT } from '@/lib/courriel';

export async function POST(requete: Request) {
  const { commandeId } = await requete.json().catch(() => ({ commandeId: null }));
  if (!commandeId) {
    return NextResponse.json({ erreur: 'Commande manquante.' }, { status: 400 });
  }

  // L'acheteur, et lui seul, déclenche cet envoi pour sa propre commande.
  const sb = creerClientServeur();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erreur: 'Connexion requise.' }, { status: 401 });

  const service = clientService();
  const { data: commande } = await service
    .from('commandes')
    .select('id, reference, acheteur_id, statut, total, sous_total, mode_retrait, adresse_retrait, retire_le')
    .eq('id', commandeId)
    .maybeSingle();

  if (!commande || commande.acheteur_id !== user.id) {
    return NextResponse.json({ erreur: 'Commande introuvable.' }, { status: 404 });
  }
  if (commande.statut !== 'retiree') {
    return NextResponse.json({ erreur: 'Le retrait n\'est pas confirmé.' }, { status: 409 });
  }

  // Un seul envoi par commande, même si la page est rechargée.
  const { count } = await service
    .from('courriels')
    .select('id', { count: 'exact', head: true })
    .eq('commande_id', commandeId)
    .eq('motif', 'retrait_confirme');
  if ((count ?? 0) > 0) {
    return NextResponse.json({ deja: true, envoyes: 0 });
  }

  const { data: gens } = await service.rpc('destinataires_commande', { p_commande: commandeId });
  const destinataires = (gens ?? []) as { email: string; prenom: string; role: string }[];

  const retrait = commande.mode_retrait === 'main_propre'
    ? 'en main propre' : `au point de retrait : ${commande.adresse_retrait}`;
  const date = new Date(commande.retire_le ?? Date.now())
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  let envoyes = 0;
  for (const d of destinataires) {
    const acheteur = d.role === 'acheteur';
    const sujet = acheteur
      ? `Retrait confirmé — commande ${commande.reference}`
      : `Un acheteur a confirmé le retrait — commande ${commande.reference}`;

    const corps = [
      `Bonjour ${d.prenom},`,
      '',
      acheteur
        ? `Vous avez confirmé le retrait de votre commande ${commande.reference}, effectué ${retrait} le ${date}.`
        : `L'acheteur a confirmé le retrait de la commande ${commande.reference}, effectué ${retrait} le ${date}.`,
      '',
      `Montant de la commande : ${eur(+commande.total)}.`,
      acheteur
        ? 'Les points correspondants ont été ajoutés à votre compte.'
        : 'Le versement de votre part est déclenché par cette confirmation.',
      '',
      'Vous pouvez retrouver le détail dans votre espace :',
      'https://mon-petitpotager.com/commandes',
      AVERTISSEMENT,
    ].join('\n');

    if (await envoyerCourriel({
      destinataire: d.email, sujet, corps,
      motif: 'retrait_confirme', commandeId,
    })) envoyes += 1;
  }

  return NextResponse.json({ destinataires: destinataires.length, envoyes });
}
