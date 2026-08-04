'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { creerClient } from '@/lib/supabase-client';

const SUJETS = [
  'Question générale',
  'Problème avec une commande',
  'Signaler une annonce',
  'Mon secteur',
  'Autre',
];

export default function FormulaireContact() {
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState(SUJETS[0]);
  const [message, setMessage] = useState('');
  const [profilId, setProfilId] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(false);

  // Pré-remplit l'adresse si la personne est déjà connectée.
  useEffect(() => {
    creerClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setProfilId(data.user.id);
        if (data.user.email) setEmail(data.user.email);
      }
    });
  }, []);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      setErreur('Décrivez votre demande en quelques mots (10 caractères minimum).');
      return;
    }
    setErreur(''); setEnvoi(true);

    const { error } = await creerClient().from('messages_contact').insert({
      profil_id: profilId,
      email: email.trim(),
      sujet,
      message: message.trim(),
    });

    setEnvoi(false);
    if (error) {
      setErreur("Le message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez.");
      return;
    }
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <div className="card" role="status">
        <h3>Message envoyé</h3>
        <p className="muted" style={{ marginTop: 7 }}>
          Nous vous répondrons à {email}. Le délai habituel est de quelques jours ouvrés.
        </p>
        <Link className="btn btn-s" href="/" style={{ marginTop: 14 }}>Retour à l&apos;accueil</Link>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer}>
      <div className="field">
        <label htmlFor="em">Votre adresse e-mail</label>
        <input className="inp" id="em" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="help">Nécessaire pour vous répondre. Elle ne sert qu&apos;à cela.</p>
      </div>

      <div className="field">
        <label htmlFor="su">Sujet</label>
        <select className="inp" id="su" value={sujet} onChange={(e) => setSujet(e.target.value)}>
          {SUJETS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ms">Votre message</label>
        <textarea className="inp" id="ms" required maxLength={2000} style={{ minHeight: 150 }}
          value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {erreur && <p className="errmsg" style={{ marginBottom: 12 }} role="alert">{erreur}</p>}
      <button className="btn btn-p" disabled={envoi}>
        {envoi ? 'Envoi…' : 'Envoyer le message'}
      </button>
    </form>
  );
}
