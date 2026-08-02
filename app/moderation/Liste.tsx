'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';
import { Illustration } from '@/components/Illustrations';
import { eur } from '@/lib/utils';

export interface AnnonceMod {
  id: string; titre: string; description: string | null; statut: string;
  mode: string; prix: number; unite: string; quantite: number; commune: string;
  photos: string[] | null; est_lot: boolean; vendeur_id: string;
  vendeur_prenom: string; vendeur_role: string; illustration: string | null;
  created_at: string;
}

export interface EntreeJournal {
  id: string; titre: string | null; action: string; motif: string; created_at: string;
}

const ACTIONS: Record<string, string> = {
  masquee: 'Retirée de la vitrine',
  supprimee: 'Supprimée',
  retablie: 'Remise en ligne',
};

const jour = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Écran de modération : retirer, remettre en ligne, supprimer ou
 * corriger une annonce. Chaque geste demande un motif, parce qu'une
 * décision qu'on ne sait pas justifier ne devrait pas être prise.
 */
export default function Liste({
  annonces, journal, recherche: rechercheInitiale,
}: { annonces: AnnonceMod[]; journal: EntreeJournal[]; recherche: string }) {
  const [recherche, setRecherche] = useState(rechercheInitiale);
  const [cible, setCible] = useState<{ a: AnnonceMod; action: string } | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const router = useRouter();
  const toast = useToast();

  function chercher(e: React.FormEvent) {
    e.preventDefault();
    router.push(recherche.trim() ? `/moderation?q=${encodeURIComponent(recherche.trim())}` : '/moderation');
  }

  async function appliquer() {
    if (!cible) return;
    if (motif.trim().length < 3) { setErreur('Indiquez un motif.'); return; }
    setErreur(''); setEnvoi(true);
    const { error } = await creerClient().rpc('moderer_annonce', {
      p_annonce: cible.a.id, p_action: cible.action, p_motif: motif.trim(),
    });
    setEnvoi(false);
    if (error) { setErreur('Action impossible. Réessayez.'); return; }
    toast(ACTIONS[cible.action]);
    setCible(null); setMotif('');
    router.refresh();
  }

  return (
    <>
      <form className="field" onSubmit={chercher}>
        <label htmlFor="rech-mod">Rechercher une annonce</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" id="rech-mod" type="search" value={recherche}
            placeholder="Titre, commune ou vendeur"
            onChange={(e) => setRecherche(e.target.value)} />
          <button className="btn btn-s" type="submit" style={{ width: 'auto', flexShrink: 0 }}>
            Chercher
          </button>
        </div>
      </form>

      {cible && (
        <div className="card" role="dialog" aria-label="Confirmer l'action de modération">
          <h3>
            {cible.action === 'supprimee' ? 'Supprimer' :
             cible.action === 'masquee' ? 'Retirer de la vitrine' : 'Remettre en ligne'}
            {' : '}{cible.a.titre}
          </h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            Annonce de {cible.a.vendeur_prenom}, à {cible.a.commune}.
            {cible.action === 'supprimee'
              ? " La suppression est définitive : l'annonce ne peut pas être rétablie."
              : cible.action === 'masquee'
                ? ' Elle disparaît des recherches, mais reste rétablissable.'
                : ' Elle réapparaîtra dans les recherches du secteur.'}
          </p>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="motif">Motif</label>
            <input className="inp" id="motif" value={motif} maxLength={200} autoFocus
              placeholder="Produit interdit à la vente entre particuliers"
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
          {annonces.length} annonce{annonces.length > 1 ? 's' : ''}
          {rechercheInitiale && ` pour « ${rechercheInitiale} »`}
        </h2>
      </div>

      {annonces.length > 0 ? annonces.map((a) => (
        <div className="card mod-item" key={a.id}>
          <div className="line" style={{ border: 0, padding: 0 }}>
            <div className="th">
              {a.photos?.[0]
                ? <img src={a.photos[0]} alt="" loading="lazy" />
                : <Illustration nom={a.illustration} />}
            </div>
            <div className="line-b">
              <h4>
                <Link href={`/annonce/${a.id}`}>{a.titre}</Link>
                {a.statut !== 'en_ligne' && (
                  <span className="badge b-am" style={{ marginLeft: 7 }}>
                    {a.statut === 'retire' ? 'Retirée' : a.statut === 'epuise' ? 'Épuisée' : a.statut}
                  </span>
                )}
                {a.est_lot && <span className="badge b-pro" style={{ marginLeft: 7 }}>Panier</span>}
              </h4>
              <p>
                <Link href={`/membre/${a.vendeur_id}`} className="lien-membre">{a.vendeur_prenom}</Link>
                {a.vendeur_role === 'pro' ? ' (pro)' : ''} · {a.commune} · {jour(a.created_at)}
                {' · '}{a.mode === 'vente' ? `${eur(a.prix)} / ${a.unite}`
                  : a.mode === 'troc' ? 'Troc' : 'Don'}
              </p>
              {a.description && <p className="tiny mod-desc">{a.description}</p>}
            </div>
          </div>

          <div className="mod-actions">
            <Link className="btn btn-s btn-sm" href={`/vendre/annonces/${a.id}/modifier`}>
              Corriger
            </Link>
            {a.statut === 'en_ligne' ? (
              <button className="btn btn-s btn-sm" onClick={() => setCible({ a, action: 'masquee' })}>
                Retirer de la vitrine
              </button>
            ) : (
              <button className="btn btn-s btn-sm" onClick={() => setCible({ a, action: 'retablie' })}>
                Remettre en ligne
              </button>
            )}
            <button className="btn btn-d btn-sm" onClick={() => setCible({ a, action: 'supprimee' })}>
              Supprimer
            </button>
          </div>
        </div>
      )) : (
        <div className="card">
          <p className="muted">
            {rechercheInitiale
              ? 'Aucune annonce ne correspond à cette recherche.'
              : 'Aucune annonce publiée pour le moment.'}
          </p>
        </div>
      )}

      {journal.length > 0 && (
        <div className="card">
          <h3>Journal des interventions</h3>
          {journal.map((e) => (
            <div className="pts-log" key={e.id}>
              <span>
                {e.titre ?? 'Annonce supprimée'}<br />
                <span className="tiny">{e.motif} · {jour(e.created_at)}</span>
              </span>
              <b className={e.action === 'supprimee' ? 'neg' : ''}>{ACTIONS[e.action] ?? e.action}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
