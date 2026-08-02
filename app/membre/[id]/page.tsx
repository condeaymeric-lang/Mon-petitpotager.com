import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import { Illustration } from '@/components/Illustrations';
import { FicheDetails } from '@/components/FicheDetails';
import { eur, distanceKm } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Fiche publique d'un membre. Elle ne montre que ce qu'un voisin a
 * besoin de savoir pour décider de lui acheter : prénom, commune,
 * présentation, annonces en ligne. Ni nom de famille, ni téléphone :
 * la base elle-même refuse ces colonnes à un autre membre.
 */
export default async function FicheMembre({ params }: { params: { id: string } }) {
  const { profil, secteur, rayonKm, sb } = await contexteVisite();

  const { data: m } = await sb
    .from('profils')
    .select('id, prenom, bio, avatar_url, role, pro_verifie, raison_sociale, est_relais, relais_adresse, relais_horaires, secteur, created_at, site_web, reseau_social, disponibilites, moyens_paiement, methode_culture, label_qualite, annee_installation, surface_ha, specialites')
    .eq('id', params.id)
    .maybeSingle();

  if (!m) notFound();

  const { data: sonSecteur } = await sb
    .from('secteurs').select('nom, lat, lon').eq('code_insee', m.secteur).maybeSingle();

  // Règle du rayon : un membre hors secteur n'est pas consultable, même
  // par lien direct. Seule exception, sa propre fiche.
  const soiMeme = profil?.id === m.id;
  const km = secteur && sonSecteur
    ? +distanceKm(secteur.lat, secteur.lon, sonSecteur.lat, sonSecteur.lon).toFixed(1)
    : null;
  if (!soiMeme && (km == null || km > rayonKm)) notFound();

  const { data: annonces } = await sb
    .from('annonces')
    .select('*, produit:produits(illustration), variete:varietes(nom, illustration)')
    .eq('vendeur_id', m.id)
    .eq('statut', 'en_ligne')
    .gt('quantite', 0)
    .order('created_at', { ascending: false })
    .limit(30);

  const produits = annonces ?? [];
  const estPro = m.role === 'pro';
  const depuis = new Date(m.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <>
      {profil
        ? <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur?.nom ?? '—'} rayonKm={rayonKm} />}

      <div className="app has-tabbar"><div className="page">
        <Link href="/" className="back">← Retour</Link>

        <header className="ferme">
          {m.avatar_url
            ? <img src={m.avatar_url} alt="" className="ferme-photo" loading="lazy" />
            : <span className="ferme-photo ferme-photo-vide">{m.prenom?.[0]?.toUpperCase()}</span>}
          <div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className={`badge ${estPro ? 'b-pro' : 'b-am'}`}>
                {estPro ? 'Producteur professionnel' : 'Particulier'}
              </span>
              {m.pro_verifie && <span className="badge b-ok">Vérifié</span>}
              {m.est_relais && <span className="badge b-am">Point relais</span>}
            </div>
            <h1>{estPro && m.raison_sociale ? m.raison_sociale : m.prenom}</h1>
            <p className="muted" style={{ marginTop: 5 }}>
              {estPro && m.raison_sociale ? `${m.prenom} · ` : ''}
              {sonSecteur?.nom}
              {km != null && km > 0 && ` · à ${km} km`}
              {' · membre depuis '}{depuis}
            </p>
          </div>
        </header>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Présentation</h3>
          <p className="muted" style={{ marginTop: 7, whiteSpace: 'pre-line' }}>
            {m.bio || (soiMeme
              ? "Vous n'avez pas encore rédigé votre présentation. Vos voisins la verront ici."
              : "Ce membre n'a pas encore rédigé sa présentation.")}
          </p>
        </div>

        <FicheDetails p={m} />

        {m.est_relais && m.relais_adresse && (
          <div className="card">
            <h3>Point relais</h3>
            <p className="muted" style={{ marginTop: 7 }}>
              {m.relais_adresse}
              {m.relais_horaires ? ` — ${m.relais_horaires}` : ''}
            </p>
          </div>
        )}

        {estPro && (
          <Link className="btn btn-s" href={`/producteurs/${m.id}`} style={{ marginBottom: 4 }}>
            Voir la fiche de la ferme
          </Link>
        )}

        <section className="bloc" aria-labelledby="titre-annonces">
          <div className="bloc-head">
            <h2 id="titre-annonces">
              Ses annonces{produits.length > 0 && ` (${produits.length})`}
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
              <p className="muted">Aucune annonce en ligne pour le moment.</p>
            </div>
          )}
        </section>
      </div></div>
      {profil && <BarreBas />}
    </>
  );
}
