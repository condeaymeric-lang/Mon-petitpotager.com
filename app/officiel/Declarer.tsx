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

/** Déclaration d'un compte d'organisation, soumise à vérification. */
export default function Declarer() {
  const [type, setType] = useState('');
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function declarer() {
    if (!type) { setErreur('Choisissez le type de votre structure.'); return; }
    if (nom.trim().length < 2) { setErreur('Indiquez le nom de votre structure.'); return; }
    setErreur(''); setEnvoi(true);

    const sb = creerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setEnvoi(false); return; }

    const { error } = await sb.from('profils')
      .update({ organisation: type, organisation_nom: nom.trim() })
      .eq('id', user.id);

    setEnvoi(false);
    if (error) { setErreur('La déclaration a échoué. Réessayez.'); return; }
    toast('Compte déclaré');
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Déclarer ma structure</h3>
        <p className="tiny" style={{ marginTop: 5 }}>
          Une fois déclarée, vous pourrez publier des informations et lancer
          des sondages auprès des habitants de votre secteur.
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
          <label htmlFor="org-nom">Nom de la structure</label>
          <input className="inp" id="org-nom" maxLength={120} value={nom}
            placeholder="Mairie de Porcieu-Amblagnieu"
            onChange={(e) => setNom(e.target.value)} />
        </div>

        {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
        <button className="btn btn-p" onClick={declarer} disabled={envoi}>
          {envoi ? 'Déclaration…' : 'Déclarer ma structure'}
        </button>
      </div>

      <div className="avert">
        <b>La déclaration ne vaut pas vérification.</b>
        <p>
          Vos publications porteront la mention « non vérifié » jusqu&apos;à ce
          que la modération confirme que vous représentez bien cette structure.
          Se faire passer pour une mairie engage votre responsabilité.
        </p>
      </div>
    </>
  );
}
