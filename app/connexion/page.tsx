'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { Logo } from '@/components/Illustrations';
import { PanneauMarque } from '@/components/PanneauMarque';

function Formulaire() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [charge, setCharge] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    setCharge(true);
    const { error } = await creerClient().auth.signInWithPassword({ email, password: mdp });
    setCharge(false);
    if (error) {
      setErreur(
        error.message.includes('Invalid login')
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : error.message.includes('Email not confirmed')
          ? "Confirmez d'abord votre adresse via le lien reçu par e-mail."
          : 'Connexion impossible. Réessayez dans un instant.'
      );
      return;
    }
    router.push(params.get('retour') || '/');
    router.refresh();
  }

  return (
    <form onSubmit={soumettre}>
      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <input className="inp" id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="mdp">Mot de passe</label>
        <input className="inp" id="mdp" type="password" autoComplete="current-password" required
          value={mdp} onChange={(e) => setMdp(e.target.value)} />
      </div>
      {erreur && <p className="errmsg" style={{ marginBottom: 12 }}>{erreur}</p>}
      <button className="btn btn-p" disabled={charge}>{charge ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  );
}

export default function Connexion() {
  return (
    <div className="onb">
      <PanneauMarque />
      <div className="onb-in">
        <div className="brand" style={{ fontSize: '1.7rem' }}>
          <Logo size={29} />mon<i>petit</i>potager
        </div>
        <h1>Content de vous revoir.</h1>
        <p className="lede">Connectez-vous pour retrouver votre secteur.</p>
        <Suspense fallback={<div className="load"><div className="spin" /></div>}>
          <Formulaire />
        </Suspense>
        <p className="tiny center" style={{ marginTop: 18 }}>
          Pas encore de compte ?{' '}
          <Link href="/inscription" style={{ color: 'var(--forest-2)', fontWeight: 600 }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
