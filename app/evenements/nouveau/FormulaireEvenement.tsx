'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { LIBELLE_TYPE } from '@/components/CarteEvenement';
import type { Secteur, TypeEvenement } from '@/lib/types';

const TYPES: TypeEvenement[] = ['marche', 'fete', 'brocante', 'porte_ouverte', 'autre'];

export default function FormulaireEvenement({
  profilId, secteur,
}: { profilId: string; secteur: Secteur }) {
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<TypeEvenement>('fete');
  const [debut, setDebut] = useState('');
  const [lieu, setLieu] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) { setErreur("Donnez un nom à l'événement."); return; }
    if (!debut) { setErreur('Indiquez la date et l\'heure de début.'); return; }
    if (new Date(debut).getTime() < Date.now()) {
      setErreur('La date doit être dans le futur.');
      return;
    }
    setErreur(''); setEnvoi(true);

    const { error } = await creerClient().from('evenements').insert({
      auteur_id: profilId,
      secteur: secteur.code_insee,
      titre: titre.trim(),
      type,
      debut: new Date(debut).toISOString(),
      lieu: lieu.trim() || null,
      description: description.trim() || null,
      commune: secteur.nom,
      lat: secteur.lat,
      lon: secteur.lon,
    });

    setEnvoi(false);
    if (error) {
      setErreur("L'événement n'a pas pu être publié. Vérifiez votre connexion et réessayez.");
      return;
    }
    toast('Événement publié');
    router.push('/evenements');
    router.refresh();
  }

  return (
    <div className="page page-form">
      <button className="back" onClick={() => router.back()}>← Retour</button>
      <div className="page-head">
        <h1>Proposer un événement</h1>
        <p>Il sera visible par les habitants du secteur, dans leur rayon.</p>
      </div>

      <form onSubmit={publier}>
        <div className="field">
          <label htmlFor="ti">Nom de l&apos;événement</label>
          <input className="inp" id="ti" required maxLength={120}
            value={titre} onChange={(ev) => setTitre(ev.target.value)}
            placeholder="Marché de producteurs" />
        </div>

        <div className="field">
          <label id="type-label">Type</label>
          <div className="seg" role="group" aria-labelledby="type-label">
            {TYPES.map((t) => (
              <button key={t} type="button" className={type === t ? 'on' : ''}
                onClick={() => setType(t)}>{LIBELLE_TYPE[t]}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="db">Date et heure</label>
          <input className="inp" id="db" type="datetime-local" required
            value={debut} onChange={(ev) => setDebut(ev.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="li">Lieu</label>
          <input className="inp" id="li" maxLength={160}
            value={lieu} onChange={(ev) => setLieu(ev.target.value)}
            placeholder="Place du village" />
          <p className="help">La commune {secteur.nom} est ajoutée automatiquement.</p>
        </div>

        <div className="field">
          <label htmlFor="de">Description</label>
          <textarea className="inp" id="de" maxLength={400}
            value={description} onChange={(ev) => setDescription(ev.target.value)} />
        </div>

        {erreur && <p className="errmsg" style={{ marginBottom: 12 }} role="alert">{erreur}</p>}
        <button className="btn btn-p" disabled={envoi}>
          {envoi ? 'Publication…' : 'Publier l’événement'}
        </button>
      </form>
    </div>
  );
}
