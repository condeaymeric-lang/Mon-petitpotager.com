import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import { eur, distanceKm } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FicheProducteur({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();

  const { data: p } = await sb
    .from('profils')
    .select('id, prenom, raison_sociale, bio, avatar_url, pro_verifie, est_relais, role, secteur, relais_adresse, relais_horaires')
    .eq('id', params.id)
    .eq('role', 'pro')
    .maybeSingle();

  if (!p) notFound();

  const { data: sonSecteur } = await sb
    .from('secteurs').select('nom, lat, lon').eq('code_insee', p.secteur).maybeSingle();

  // Règle du rayon : une ferme hors secteur n'est pas consultable, même par lien direct.
  const km = secteur && sonSecteur
    ? +distanceKm(secteur.lat, secteur.lon, sonSecteur.lat, sonSecteur.lon).toFixed(1)
    : null;
  if (km == null || km > profil.rayon_km) notFound();

  const { data: annonces } = await sb
    .from('annonces')
    .select('*, produit:produits(illustration), variete:varietes(nom, illustration)')
    .eq('vendeur_id', p.id)
    .eq('statut', 'en_ligne')
    .gt('quantite', 0)
    .order('created_at', { ascending: false });

  const produits = annonces ?? [];

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <Link href="/producteurs" className="back">← Tous les producteurs</Link>

        <header className="ferme">
          {p.avatar_url
            ? <img src={p.avatar_url} alt="" className="ferme-photo" loading="lazy" />
            : <span className="ferme-photo ferme-photo-vide">{p.prenom?.[0]?.toUpperCase()}</span>}
          <div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="badge b-pro">Producteur professionnel</span>
              {p.pro_verifie && <span className="badge b-ok">Vérifié</span>}
              {p.est_relais && <span className="badge b-am">Point relais</span>}
            </div>
            <h1>{p.raison_sociale || p.prenom}</h1>
            <p className="muted" style={{ marginTop: 5 }}>
              {p.raison_sociale ? `${p.prenom} · ` : ''}
              {sonSecteur?.nom}{km != null && ` · à ${km} km`}
            </p>
          </div>
        </header>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>La ferme</h3>
          <p className="muted" style={{ marginTop: 7, whiteSpace: 'pre-line' }}>
            {p.bio
              || "Ce producteur n'a pas encore rédigé sa présentation."}
          </p>
        </div>

        {p.est_relais && p.relais_adresse && (
          <div className="card">
            <h3>Point relais</h3>
            <p className="muted" style={{ marginTop: 7 }}>
              {p.relais_adresse}
              {p.relais_horaires ? ` — ${p.relais_horaires}` : ''}
            </p>
          </div>
        )}

        <section className="bloc" aria-labelledby="titre-produits">
          <div className="bloc-head">
            <h2 id="titre-produits">
              Ses produits{produits.length > 0 && ` (${produits.length})`}
            </h2>
          </div>

          {produits.length > 0 ? (
            <div className="prod-liste">
              {produits.map((a: any) => (
                <Link key={a.id} href={`/annonce/${a.id}`} className="card prod-item">
                  <div className="line" style={{ border: 0, padding: 0 }}>
                    <div className="th">
                      {a.photos?.[0]
                        ? <img src={a.photos[0]} alt="" loading="lazy" />
                        : <Illustration nom={a.variete?.illustration ?? a.produit?.illustration} />}
                    </div>
                    <div className="line-b">
                      <h4>{a.titre}{(a.variete?.nom ?? a.variete_libre) ? ` — ${a.variete?.nom ?? a.variete_libre}` : ''}</h4>
                      <p>
                        {a.mode === 'vente' ? `${eur(a.prix)} / ${a.unite}`
                          : a.mode === 'troc' ? 'Troc' : 'Don'}
                        {' · '}{a.quantite} disponible{a.quantite > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card">
              <p className="muted">
                Aucun produit en ligne pour le moment. Repassez plus tard :
                les récoltes changent au fil des saisons.
              </p>
            </div>
          )}
        </section>
      </div></div>
      <BarreBas />
    </>
  );
}
