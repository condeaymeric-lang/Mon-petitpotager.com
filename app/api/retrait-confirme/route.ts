import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { creerClientServeur } from '@/lib/supabase-server';
import { eur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Client de service : seul habilité à lire les adresses et à écrire les courriels. */
function clientService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
}

const EXPEDITEUR = process.env.EXPEDITEUR_COURRIEL
  ?? 'monpetitpotager.com <onboarding@resend.dev>';

const AVERTISSEMENT = [
  '',
  '— — —',
  'Ce message provient d\'une version d\'essai de monpetitpotager.com.',
  'Le site est en construction : aucune somme n\'est facturée, aucun',
  'paiement n\'est encaissé, et aucune transaction n\'a de valeur',
  'commerciale. Cette commande est un test.',
].join('\n');

/**
 * Envoi effectif par Resend, si une clé est configurée.
 * Sans clé, le message reste consigné en attente : rien n'est perdu,
 * et personne ne croit qu'un courriel est parti alors qu'il ne l'est pas.
 */
async function envoyer(destinataire: string, sujet: string, corps: string) {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) return { envoye: false, erreur: 'Aucun service d\'envoi configuré' };

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EXPEDITEUR, to: [destinataire], subject: sujet, text: corps }),
    });
    if (!r.ok) return { envoye: false, erreur: `${r.status} ${(await r.text()).slice(0, 200)}` };
    return { envoye: true, erreur: null };
  } catch (e) {
    return { envoye: false, erreur: (e as Error).message.slice(0, 200) };
  }
}

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

    const resultat = await envoyer(d.email, sujet, corps);
    if (resultat.envoye) envoyes += 1;

    await service.from('courriels').insert({
      destinataire: d.email,
      sujet,
      corps,
      motif: 'retrait_confirme',
      commande_id: commandeId,
      statut: resultat.envoye ? 'envoye' : 'en_attente',
      erreur: resultat.erreur,
      envoye_le: resultat.envoye ? new Date().toISOString() : null,
    });
  }

  return NextResponse.json({ destinataires: destinataires.length, envoyes });
}
