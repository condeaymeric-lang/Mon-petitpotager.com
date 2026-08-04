'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

const TYPES: [string, string, string][] = [
  ['mairie', 'Mairie', 'Commune, syndicat de communes, service public local'],
  ['association', 'Association', 'Association déclarée, comité des fêtes, AMAP'],
  ['collectif', 'Collectif', "Groupe d'habitants, jardin partagé, initiative locale"],
];

export interface DemandeEnCours {
  id: string; type: string; nom: string; statut: string;
  motif_reponse: string | null; created_at: string;
}

/**
 * Demande de statut d'organisation, soumise à la modération.
 *
 * Rien n'est accordé sur simple déclaration : il faut une adresse de
 * courriel officielle et l'accord d'un modérateur. Se faire passer
 * pour une mairie doit rester impossible.
 */
export default function Declarer({ demande }: { demande?: DemandeEnCours }) {
  const [type, setType] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [fonction, setFonction] = useState('');
  const [telephone, setTelephone] = useState('');
  const [site, setSite] = useState('');
  const [justification, setJustification] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  if (demande && demande.statut === 'en_attente') {
    return (
      <div className="card">
        <h3>Demande en cours d&apos;examen</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Votre demande pour <b>{demande.nom}</b> a été transmise le{' '}
          {new Date(demande.created_at).toLocaleDateString('fr-FR')}. La
          modération vérifie l&apos;adresse officielle que vous avez indiquée,
          puis vous répond. Vous recevrez la réponse par courriel et dans vos
          messages.
        </p>
      </div>
    );
  }

  async function envoyer() {
    if (!type) { setErreur('Choisissez le type de votre structure.'); return; }
    if (nom.trim().length < 2) { setErreur('Indiquez le nom de votre structure.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErreur('Indiquez une adresse de courriel valable.');
      return;
    }
    setErreur(''); setEnvoi(true);

    const sb = creerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setEnvoi(false); return; }

    const { error } = await sb.from('demandes_organisation').insert({
      profil_id: user.id, type, nom: nom.trim(),
      email_officiel: email.trim(), fonction: fonction.trim() || null,
      telephone: telephone.trim() || null, site_officiel: site.trim() || null,
      justification: justification.trim() || null,
    });

    if (error) {
      setEnvoi(false);
      setErreur("La demande n'a pas pu être envoyée. Réessayez.");
      return;
    }

    // Prévenir la modération. L'échec de l'envoi ne perd rien : la
    // demande figure déjà dans la file.
    try {
      await fetch('/api/demande-organisation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, nom: nom.trim(), email: email.trim() }),
      });
    } catch { /* consignée côté serveur */ }

    setEnvoi(false);
    toast('Demande transmise à la modération');
    router.refresh();
  }

  return (
    <>
      {demande?.statut === 'refusee' && (
        <div className="avert" role="status">
          <b>Votre demande précédente n&apos;a pas été retenue.</b>
          <p>{demande.motif_reponse ?? 'Aucun motif enregistré.'} Vous pouvez en déposer une nouvelle.</p>
        </div>
      )}

      <div className="card">
        <h3>Demander le statut d&apos;organisation</h3>
        <p className="tiny" style={{ marginTop: 5 }}>
          Une fois la demande acceptée, vous pourrez publier des informations
          et lancer des sondages auprès des habitants de votre secteur.
        </p>

        <div className="var-list" style={{ marginTop: 14 }} role="group"
          aria-label="Type de structure">
          {TYPES.map(([v, l, d]) => (
            <button key={v} type="button" className={`var-btn${type === v ? ' on' : ''}`}
              onClick={() => setType(v)}>
              <div><b>{l}</b><span>{d}</span></div>
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="org-nom">Nom officiel de la structure</label>
          <input className="inp" id="org-nom" maxLength={140} value={nom}
            placeholder="Mairie de Porcieu-Amblagnieu"
            onChange={(e) => setNom(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="org-mail">Adresse de courriel officielle</label>
          <input className="inp" id="org-mail" type="email" maxLength={140} value={email}
            placeholder="mairie@porcieu-amblagnieu.fr"
            onChange={(e) => setEmail(e.target.value)} />
          <p className="help">
            Une adresse au nom de la structure, pas une adresse personnelle.
            C&apos;est elle qui permet de vérifier la demande.
          </p>
        </div>

        <div className="grille-2">
          <div className="field">
            <label htmlFor="org-fonc">Votre fonction</label>
            <input className="inp" id="org-fonc" maxLength={80} value={fonction}
              placeholder="Secrétaire de mairie, président…"
              onChange={(e) => setFonction(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="org-tel">Téléphone de la structure</label>
            <input className="inp" id="org-tel" type="tel" maxLength={30} value={telephone}
              onChange={(e) => setTelephone(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="org-site">Site officiel</label>
          <input className="inp" id="org-site" type="url" maxLength={200} value={site}
            placeholder="https://" onChange={(e) => setSite(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="org-just">Ce que vous comptez publier</label>
          <textarea className="inp" id="org-just" rows={3} maxLength={600}
            value={justification} onChange={(e) => setJustification(e.target.value)} />
        </div>

        {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
        <button className="btn btn-p" onClick={envoyer} disabled={envoi}>
          {envoi ? 'Envoi…' : 'Envoyer ma demande'}
        </button>
      </div>

      <div className="avert">
        <b>Chaque demande est vérifiée par une personne.</b>
        <p>
          La modération contrôle l&apos;adresse officielle avant d&apos;accorder
          le statut, et peut vous appeler. Aucune structure n&apos;est publiée
          sur simple déclaration : se faire passer pour une mairie engage
          votre responsabilité.
        </p>
      </div>
    </>
  );
}
