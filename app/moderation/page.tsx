import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import Liste, { type AnnonceMod, type EntreeJournal } from './Liste';
import FileAttente, { type Attente } from './FileAttente';

export const dynamic = 'force-dynamic';

export default async function Moderation({
  searchParams,
}: { searchParams: { q?: string } }) {
  const { profil, secteur, sb } = await profilCourant();

  if (!profil.moderateur) {
    return (
      <>
        <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
        <div className="app has-tabbar"><div className="page">
          <div className="page-head">
            <h1>Modération</h1>
            <p>Cet espace est réservé à la modération du site.</p>
          </div>
          <div className="card">
            <p className="muted">
              Si vous constatez une annonce qui n&apos;a pas sa place ici,
              signalez-la par le formulaire de contact : elle sera examinée.
            </p>
            <Link className="btn btn-p" href="/contact" style={{ marginTop: 14 }}>
              Signaler une annonce
            </Link>
          </div>
        </div></div>
        <BarreBas />
      </>
    );
  }

  const recherche = searchParams.q ?? '';
  const [annonces, journal, file] = await Promise.all([
    sb.rpc('annonces_a_moderer', { p_recherche: recherche || null, p_limite: 80 }),
    sb.from('journal_moderation').select('id, titre, action, motif, created_at')
      .order('created_at', { ascending: false }).limit(20),
    sb.rpc('file_moderation'),
  ]);

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Modération</h1>
          <p>
            Toutes les annonces du site, sans filtre de rayon, y compris celles
            déjà retirées. Chaque intervention demande un motif et reste au journal.
          </p>
        </div>

        <FileAttente file={(file.data ?? []) as Attente[]} />

        <Liste
          annonces={(annonces.data ?? []) as AnnonceMod[]}
          journal={(journal.data ?? []) as EntreeJournal[]}
          recherche={recherche}
        />
      </div></div>
      <BarreBas />
    </>
  );
}
