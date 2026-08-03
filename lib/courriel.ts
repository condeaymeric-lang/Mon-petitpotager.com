import { createClient } from '@supabase/supabase-js';

/** Client de service : seul habilité à lire les adresses et écrire le journal. */
export function clientService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
}

const EXPEDITEUR = process.env.EXPEDITEUR_COURRIEL
  ?? 'monpetitpotager.com <onboarding@resend.dev>';

export const AVERTISSEMENT = [
  '',
  '— — —',
  "Ce message provient d'une version d'essai de monpetitpotager.com.",
  'Le site est en construction : aucune somme n\'est facturée, aucun',
  "paiement n'est encaissé, et aucune transaction n'a de valeur",
  'commerciale.',
].join('\n');

/**
 * Envoi d'un courriel, consigné dans tous les cas.
 *
 * Sans clé d'envoi configurée, le message reste en attente plutôt que
 * de disparaître : on sait exactement ce qui n'est pas parti, et il
 * suffira d'ajouter la clé pour rattraper.
 */
export async function envoyerCourriel({
  destinataire, sujet, corps, motif, commandeId,
}: {
  destinataire: string; sujet: string; corps: string;
  motif: string; commandeId?: string | null;
}) {
  const cle = process.env.RESEND_API_KEY;
  let envoye = false;
  let erreur: string | null = null;

  if (!cle) {
    erreur = "Aucun service d'envoi configuré";
  } else {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: EXPEDITEUR, to: [destinataire], subject: sujet, text: corps,
        }),
      });
      if (r.ok) envoye = true;
      else erreur = `${r.status} ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      erreur = (e as Error).message.slice(0, 200);
    }
  }

  await clientService().from('courriels').insert({
    destinataire, sujet, corps, motif,
    commande_id: commandeId ?? null,
    statut: envoye ? 'envoye' : 'en_attente',
    erreur,
    envoye_le: envoye ? new Date().toISOString() : null,
  });

  return envoye;
}

/** Adresse de connexion d'un membre. Réservé au serveur. */
export async function adresseDe(profilId: string) {
  const { data } = await clientService().auth.admin.getUserById(profilId);
  return data.user?.email ?? null;
}

/** Adresses des modérateurs, pour les alerter d'une demande. */
export async function adressesModeration() {
  const service = clientService();
  const { data: mods } = await service
    .from('profils').select('id').eq('moderateur', true);

  const adresses: string[] = [];
  for (const m of mods ?? []) {
    const e = await adresseDe(m.id);
    if (e) adresses.push(e);
  }
  return adresses;
}
