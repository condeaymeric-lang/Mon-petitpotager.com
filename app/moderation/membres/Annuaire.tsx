'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { DOMAINES, type Domaine } from '@/lib/moderation';

export interface MembreMod {
  id: string; prenom: string; email: string; role: string;
  secteur_nom: string | null; avatar_url: string | null;
  compte_valide: boolean; refus_motif: string | null;
  pro_verifie: boolean; organisation: string | null;
  organisation_nom: string | null; organisation_verifiee: boolean;
  droits: string[] | null; annonces: number;
  derniere_activite: string; created_at: string;
}

export const FILTRES: { cle: string; nom: string }[] = [
  { cle: 'tous', nom: 'Tous' },
  { cle: 'en_attente', nom: 'En attente' },
  { cle: 'moderateurs', nom: 'Modérateurs' },
  { cle: 'organisations', nom: 'Structures' },
  { cle: 'pros', nom: 'Professionnels' },
  { cle: 'refuses', nom: 'Refusés' },
];

const jour = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * L'annuaire des membres.
 *
 * L'adresse d'inscription y est visible : c'est ce qui permet de
 * reconnaître un doublon ou une adresse jetable. Rien d'autre de
 * personnel n'y figure.
 */
export default function Annuaire({
  membres, recherche: rechercheInitiale, filtre, peutDonnerDroits, moiId,
}: {
  membres: MembreMod[]; recherche: string; filtre: string;
  peutDonnerDroits: boolean; moiId: string;
}) {
  const [recherche, setRecherche] = useState(rechercheInitiale);
  const [cible, setCible] = useState<MembreMod | null>(null);
  const [choix, setChoix] = useState<Domaine[]>([]);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  function chercher(e: React.FormEvent) {
    e.preventDefault();
    const q = recherche.trim();
    router.push(`/moderation/membres?filtre=${filtre}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  }

  function ouvrir(m: MembreMod) {
    setCible(m);
    setChoix((m.droits ?? []) as Domaine[]);
    setMotif(''); setErreur('');
  }

  function basculer(d: Domaine) {
    setChoix((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]));
  }

  async function enregistrer() {
    if (!cible) return;
    if (motif.trim().length < 3) { setErreur('Indiquez un motif.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().rpc('accorder_droits', {
      p_profil: cible.id, p_droits: choix, p_motif: motif.trim(),
    });
    setEnvoi(false);
    if (error) {
      setErreur(error.message?.includes('retirer la gestion des droits')
        ? 'Vous ne pouvez pas vous retirer la gestion des droits.'
        : "Modification impossible. Réessayez.");
      return;
    }
    toast(choix.length === 0 ? 'Droits retirés' : 'Droits mis à jour');
    setCible(null);
    router.refresh();
  }

  return (
    <>
      <form className="field" onSubmit={chercher}>
        <label htmlFor="rech-membres">Rechercher un membre</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" id="rech-membres" type="search" value={recherche}
            placeholder="Prénom, adresse e-mail, structure ou commune"
            onChange={(e) => setRecherche(e.target.value)} />
          <button className="btn btn-s" type="submit" style={{ width: 'auto', flexShrink: 0 }}>
            Chercher
          </button>
        </div>
      </form>

      <nav className="mod-onglets" aria-label="Filtrer les membres">
        {FILTRES.map((f) => (
          <Link key={f.cle} className={`mod-onglet${f.cle === filtre ? ' on' : ''}`}
            aria-current={f.cle === filtre ? 'page' : undefined}
            href={`/moderation/membres?filtre=${f.cle}${rechercheInitiale ? `&q=${encodeURIComponent(rechercheInitiale)}` : ''}`}>
            {f.nom}
          </Link>
        ))}
      </nav>

      {cible && (
        <div className="card" role="dialog" aria-label="Droits de modération">
          <h3>Droits de {cible.prenom}</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            Chaque domaine s&apos;accorde séparément. Un domaine coché donne le
            pouvoir de supprimer définitivement du contenu.
          </p>

          <div className="mod-droits-choix" style={{ marginTop: 12 }}>
            {DOMAINES.map((d) => (
              <button key={d.cle} type="button"
                className={`mod-droit${choix.includes(d.cle) ? ' on' : ''}`}
                aria-pressed={choix.includes(d.cle)}
                onClick={() => basculer(d.cle)}>
                <b>{d.nom}</b>
                <span>{d.aide}</span>
              </button>
            ))}
          </div>

          <div className="row-btn" style={{ marginTop: 10 }}>
            <button className="btn btn-s btn-sm" type="button"
              onClick={() => setChoix(DOMAINES.map((d) => d.cle))}>
              Tout accorder
            </button>
            <button className="btn btn-s btn-sm" type="button" onClick={() => setChoix([])}>
              Tout retirer
            </button>
          </div>

          {cible.id === moiId && (
            <p className="tiny" style={{ marginTop: 10 }}>
              Il s&apos;agit de votre propre compte. Vous ne pouvez pas vous
              retirer la gestion des droits : sans cette garde, plus personne ne
              pourrait en redonner.
            </p>
          )}

          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="motif-droits">Motif</label>
            <input className="inp" id="motif-droits" value={motif} maxLength={200}
              placeholder="Rejoint l’équipe de modération du secteur"
              onChange={(e) => setMotif(e.target.value)} />
            <p className="help">Consigné au journal. Le membre en est averti.</p>
          </div>

          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <div className="row-btn">
            <button className="btn btn-s" style={{ flex: 1 }} disabled={envoi}
              onClick={() => setCible(null)}>
              Annuler
            </button>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={enregistrer} disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      <div className="bloc-head">
        <h2>
          {membres.length} membre{membres.length > 1 ? 's' : ''}
          {rechercheInitiale && ` pour « ${rechercheInitiale} »`}
        </h2>
      </div>

      {membres.length > 0 ? membres.map((m) => (
        <div className="card mod-item" key={m.id}>
          <div className="line" style={{ border: 0, padding: 0 }}>
            <div className="th th-rond">
              {m.avatar_url
                ? <img src={m.avatar_url} alt="" loading="lazy" />
                : <span className="ferme-photo-vide">{m.prenom?.[0]?.toUpperCase()}</span>}
            </div>
            <div className="line-b">
              <h4>
                <Link href={`/moderation/membre/${m.id}`}>{m.prenom}</Link>
                {!m.compte_valide && (
                  <span className="badge b-am" style={{ marginLeft: 7 }}>
                    {m.refus_motif ? 'Refusé' : 'En attente'}
                  </span>
                )}
                {m.pro_verifie && <span className="badge b-ok" style={{ marginLeft: 7 }}>Vérifié</span>}
                {(m.droits?.length ?? 0) > 0 && (
                  <span className="badge b-pro" style={{ marginLeft: 7 }}>
                    {m.droits!.length === DOMAINES.length
                      ? 'Modération complète'
                      : `Modération · ${m.droits!.length}`}
                  </span>
                )}
              </h4>
              <p>
                {m.email} · {m.role === 'pro' ? 'Professionnel'
                  : m.role === 'amateur' ? 'Amateur' : 'Acheteur'}
                {m.secteur_nom ? ` · ${m.secteur_nom}` : ''}
                {' · inscrit le '}{jour(m.created_at)}
              </p>
              <p className="tiny mod-desc">
                {m.annonces} annonce{m.annonces > 1 ? 's' : ''} publiée{m.annonces > 1 ? 's' : ''}
                {m.organisation_nom
                  ? ` · ${m.organisation_nom}${m.organisation_verifiee ? ' (vérifiée)' : ' (non vérifiée)'}`
                  : ''}
                {(m.droits?.length ?? 0) > 0 && ` · ${m.droits!.join(', ')}`}
              </p>
            </div>
          </div>

          <div className="mod-actions">
            <Link className="btn btn-s btn-sm" href={`/moderation/membre/${m.id}`}>
              Ouvrir la fiche
            </Link>
            <Link className="btn btn-s btn-sm" href={`/membre/${m.id}`}>
              Profil public
            </Link>
            {peutDonnerDroits && (
              <button className="btn btn-s btn-sm" onClick={() => ouvrir(m)}>
                Droits de modération
              </button>
            )}
          </div>
        </div>
      )) : (
        <div className="card">
          <p className="muted">Aucun membre ne correspond à cette recherche.</p>
        </div>
      )}
    </>
  );
}
