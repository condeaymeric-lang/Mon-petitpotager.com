import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { eur, SEUIL_OUVERTURE } from '@/lib/utils';
import PanneauProfil from './PanneauProfil';
import ModifierProfil from './ModifierProfil';

export const dynamic = 'force-dynamic';

export default async function Profil() {
  const { profil, secteur, sb } = await profilCourant();

  const [{ count: nbAnnonces }, { count: nbCommandes }, { data: mouvements }] = await Promise.all([
    sb.from('annonces').select('*', { count: 'exact', head: true })
      .eq('vendeur_id', profil.id).neq('statut', 'retire'),
    sb.from('commandes').select('*', { count: 'exact', head: true }).eq('acheteur_id', profil.id),
    sb.from('mouvements_points').select('*').eq('profil_id', profil.id)
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const total = (secteur?.membres ?? 0) + (secteur?.attente ?? 0);

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {profil.avatar_url ? (
            <img src={profil.avatar_url} alt="" loading="lazy" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
              background: 'var(--leaf-soft)', color: 'var(--forest-2)', fontWeight: 700, fontSize: '1.3rem',
            }}>{profil.prenom?.[0]?.toUpperCase()}</div>
          )}
          <div>
            <h1>{profil.prenom}</h1>
            <p>
              {profil.role === 'pro' ? 'Producteur pro' : profil.role === 'amateur' ? 'Jardinier amateur' : 'Acheteur'}
              {secteur && ` · ${secteur.nom}`}
            </p>
          </div>
        </div>

        <div className="dash-top">
          <div className="pts-card">
            <small>MES POINTS</small>
            <b>{profil.points}</b>
            <small>soit {eur(profil.points / 100)} de réduction</small>
          </div>

          <div className="card">
            <div className="stats">
              <div><b>{nbAnnonces ?? 0}</b><span className="tiny">annonces</span></div>
              <div><b>{nbCommandes ?? 0}</b><span className="tiny">commandes</span></div>
              <div><b>{total}</b><span className="tiny">voisins</span></div>
            </div>
          </div>
        </div>

        <ModifierProfil profil={profil} />
        <PanneauProfil profil={profil} secteur={secteur} />

        <div className="card">
          <h3>Historique des points</h3>
          {mouvements?.length ? mouvements.map((m: any) => (
            <div className="pts-log" key={m.id}>
              <span>
                {m.motif}<br />
                <span className="tiny">
                  {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </span>
              <b className={m.montant < 0 ? 'neg' : ''}>{m.montant > 0 ? '+' : ''}{m.montant}</b>
            </div>
          )) : <p className="muted" style={{ marginTop: 8 }}>Aucun mouvement pour l'instant.</p>}
        </div>

        <Link className="btn btn-s" href="/pourquoi" style={{ marginTop: 14 }}>
          Pourquoi passer par l'application ?
        </Link>
      </div></div>
      <BarreBas />
    </>
  );
}
