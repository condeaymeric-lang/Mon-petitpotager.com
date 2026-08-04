'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

export default function Participation({
  evenementId, profilId, reponseInitiale, nbOui, nbNon, prenoms, estOrganisateur,
}: {
  evenementId: string;
  profilId: string;
  reponseInitiale: boolean | null;
  nbOui: number;
  nbNon: number;
  prenoms: string[];
  estOrganisateur: boolean;
}) {
  const [reponse, setReponse] = useState<boolean | null>(reponseInitiale);
  const [oui, setOui] = useState(nbOui);
  const [non, setNon] = useState(nbNon);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function repondre(vient: boolean) {
    if (envoi || reponse === vient) return;
    const avant = reponse;
    setEnvoi(true); setErreur('');

    // Mise à jour immédiate des compteurs, corrigée si l'envoi échoue.
    setReponse(vient);
    setOui((n) => n + (vient ? 1 : 0) - (avant === true ? 1 : 0));
    setNon((n) => n + (vient ? 0 : 1) - (avant === false ? 1 : 0));

    const { error } = await creerClient().from('participations').upsert(
      { evenement_id: evenementId, profil_id: profilId, vient },
      { onConflict: 'evenement_id,profil_id' }
    );

    setEnvoi(false);
    if (error) {
      setReponse(avant);
      setOui(nbOui); setNon(nbNon);
      setErreur("Votre réponse n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    toast(vient ? 'Vous y allez' : 'Réponse enregistrée');
    router.refresh();
  }

  const total = oui + non;
  const listeVisible = prenoms.slice(0, 6);
  const reste = Math.max(0, oui - listeVisible.length);

  return (
    <div className="card rsvp">
      <h3>Comptez-vous y faire un tour ?</h3>
      <p className="tiny" style={{ marginTop: 5 }}>
        {estOrganisateur
          ? 'Les réponses vous indiquent combien de voisins votre annonce touche.'
          : 'Votre réponse aide l’organisateur à préparer, et vos voisins à savoir qui vient.'}
      </p>

      <div className="rsvp-btns" role="group" aria-label="Votre réponse">
        <button type="button" disabled={envoi}
          className={`btn ${reponse === true ? 'btn-p' : 'btn-s'}`}
          aria-pressed={reponse === true}
          onClick={() => repondre(true)}>
          Oui, j&apos;y vais
        </button>
        <button type="button" disabled={envoi}
          className={`btn ${reponse === false ? 'btn-p' : 'btn-s'}`}
          aria-pressed={reponse === false}
          onClick={() => repondre(false)}>
          Non, pas cette fois
        </button>
      </div>

      {erreur && <p className="errmsg" style={{ marginTop: 10 }} role="alert">{erreur}</p>}

      <div className="rsvp-total" aria-live="polite">
        {total === 0 ? (
          <p className="tiny">Personne n&apos;a encore répondu. Soyez le premier.</p>
        ) : (
          <>
            <div className="rsvp-jauge">
              <i style={{ width: `${Math.round((oui / total) * 100)}%` }} />
            </div>
            <p className="tiny">
              <b>{oui}</b> {oui > 1 ? 'y vont' : 'y va'}
              {non > 0 && <> · {non} ne {non > 1 ? 'viennent' : 'vient'} pas</>}
              {' '}sur {total} réponse{total > 1 ? 's' : ''}.
            </p>
            {listeVisible.length > 0 && (
              <p className="tiny" style={{ marginTop: 4 }}>
                {listeVisible.join(', ')}
                {reste > 0 && ` et ${reste} autre${reste > 1 ? 's' : ''}`}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
