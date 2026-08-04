'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { GENRES, type Genre } from '@/lib/moderation';

export interface Contenu {
  genre: Genre; id: string; titre: string | null; extrait: string | null;
  etat: string; auteur_id: string; auteur_nom: string | null;
  commune: string | null; photos: string[] | null; lien: string;
  created_at: string;
}

export interface EntreeJournal {
  id: string; titre: string | null; action: string;
  motif: string; genre: string | null; created_at: string;
}

const ACTIONS: Record<string, string> = {
  masquee: 'Contenu retiré',
  supprimee: 'Contenu supprimé',
  retablie: 'Contenu rétabli',
};

const jour = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * La liste d'un genre de contenu, et les trois gestes possibles.
 *
 * Tous les genres ne se masquent pas : une réponse du bistrot ou un
 * message de mur n'ont pas d'état caché dans la base. Plutôt que de
 * proposer un bouton qui échouerait, on ne l'affiche pas.
 */
export default function Contenus({
  genre, contenus, journal, recherche: rechercheInitiale,
}: {
  genre: Genre; contenus: Contenu[];
  journal: EntreeJournal[]; recherche: string;
}) {
  const [recherche, setRecherche] = useState(rechercheInitiale);
  const [cible, setCible] = useState<{ c: Contenu; action: string } | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  const def = GENRES.find((g) => g.cle === genre)!;

  function chercher(e: React.FormEvent) {
    e.preventDefault();
    const q = recherche.trim();
    router.push(`/moderation?genre=${genre}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  }

  async function appliquer() {
    if (!cible) return;
    if (motif.trim().length < 3) { setErreur('Indiquez un motif.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().rpc('moderer_contenu', {
      p_genre: cible.c.genre, p_id: cible.c.id,
      p_action: cible.action, p_motif: motif.trim(),
    });
    setEnvoi(false);
    if (error) {
      setErreur(error.message?.includes('ouvert')
        ? "Ce domaine ne vous est pas ouvert."
        : "Action impossible. Réessayez.");
      return;
    }
    toast(ACTIONS[cible.action]);
    setCible(null); setMotif('');
    router.refresh();
  }

  return (
    <>
      <form className="field" onSubmit={chercher}>
        <label htmlFor="rech-mod">Rechercher</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" id="rech-mod" type="search" value={recherche}
            placeholder="Texte, commune ou auteur"
            onChange={(e) => setRecherche(e.target.value)} />
          <button className="btn btn-s" type="submit" style={{ width: 'auto', flexShrink: 0 }}>
            Chercher
          </button>
        </div>
      </form>

      {cible && (
        <div className="card" role="dialog" aria-label="Confirmer l'action de modération">
          <h3>
            {cible.action === 'supprimee' ? 'Supprimer'
              : cible.action === 'masquee' ? def.motMasquer : def.motRetablir}
            {' : '}{cible.c.titre}
          </h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            Publié par {cible.c.auteur_nom}
            {cible.c.commune ? `, à ${cible.c.commune}` : ''}.
            {cible.action === 'supprimee'
              ? ' La suppression est définitive : le contenu ne peut pas être rétabli.'
              : cible.action === 'masquee'
                ? ' Le contenu reste rétablissable.'
                : ' Le contenu redevient visible.'}
          </p>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="motif">Motif</label>
            <input className="inp" id="motif" value={motif} maxLength={200} autoFocus
              placeholder="Propos injurieux envers un autre membre"
              onChange={(e) => setMotif(e.target.value)} />
            <p className="help">Consigné au journal, avec votre nom et la date.</p>
          </div>
          {erreur && <p className="errmsg" style={{ marginBottom: 10 }}>{erreur}</p>}
          <div className="row-btn">
            <button className="btn btn-s" style={{ flex: 1 }} disabled={envoi}
              onClick={() => { setCible(null); setMotif(''); setErreur(''); }}>
              Annuler
            </button>
            <button className={`btn ${cible.action === 'supprimee' ? 'btn-d' : 'btn-p'}`}
              style={{ flex: 1 }} onClick={appliquer} disabled={envoi}>
              {envoi ? 'Application…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      <div className="bloc-head">
        <h2>
          {contenus.length} {def.nom.toLowerCase()}
          {rechercheInitiale && ` pour « ${rechercheInitiale} »`}
        </h2>
      </div>

      {contenus.length > 0 ? contenus.map((c) => (
        <div className="card mod-item" key={c.id}>
          <div className="line" style={{ border: 0, padding: 0 }}>
            {c.photos?.[0] && (
              <div className="th"><img src={c.photos[0]} alt="" loading="lazy" /></div>
            )}
            <div className="line-b">
              <h4>
                <Link href={c.lien}>{c.titre}</Link>
                {c.etat !== 'en_ligne' && (
                  <span className="badge b-am" style={{ marginLeft: 7 }}>
                    {c.etat === 'masque' ? 'Retiré'
                      : c.etat === 'retire' ? 'Retiré'
                      : c.etat === 'epuise' ? 'Épuisé' : c.etat}
                  </span>
                )}
              </h4>
              <p>
                <Link href={`/moderation/membre/${c.auteur_id}`} className="lien-membre">
                  {c.auteur_nom}
                </Link>
                {c.commune ? ` · ${c.commune}` : ''} · {jour(c.created_at)}
              </p>
              {c.extrait && <p className="tiny mod-desc">{c.extrait}</p>}
            </div>
          </div>

          <div className="mod-actions">
            {genre === 'annonce' && (
              <Link className="btn btn-s btn-sm" href={`/vendre/annonces/${c.id}/modifier`}>
                Corriger
              </Link>
            )}
            {def.masquable && (c.etat === 'en_ligne' ? (
              <button className="btn btn-s btn-sm"
                onClick={() => setCible({ c, action: 'masquee' })}>
                {def.motMasquer}
              </button>
            ) : (
              <button className="btn btn-s btn-sm"
                onClick={() => setCible({ c, action: 'retablie' })}>
                {def.motRetablir}
              </button>
            ))}
            <button className="btn btn-d btn-sm" onClick={() => setCible({ c, action: 'supprimee' })}>
              Supprimer
            </button>
          </div>
        </div>
      )) : (
        <div className="card">
          <p className="muted">
            {rechercheInitiale ? 'Rien ne correspond à cette recherche.' : def.vide}
          </p>
        </div>
      )}

      {journal.length > 0 && (
        <div className="card">
          <h3>Journal des interventions</h3>
          <p className="tiny" style={{ marginBottom: 10 }}>
            Toutes les interventions du site, quel que soit le modérateur.
          </p>
          {journal.map((e) => (
            <div className="pts-log" key={e.id}>
              <span>
                {e.titre ?? 'Contenu supprimé'}<br />
                <span className="tiny">{e.motif} · {jour(e.created_at)}</span>
              </span>
              <b className={e.action === 'supprimee' ? 'neg' : ''}>
                {ACTIONS[e.action] ?? e.action}
              </b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
