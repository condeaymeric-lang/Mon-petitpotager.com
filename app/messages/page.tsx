import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';

export const dynamic = 'force-dynamic';

interface Fil {
  id: string; annonce_id: string | null; sujet: string | null; dernier_le: string;
  autre_id: string; autre_prenom: string; autre_avatar: string | null;
  dernier_texte: string | null; dernier_auteur: string | null; non_lus: number;
}

function quand(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface Notif {
  id: string; categorie: string; titre: string; apercu: string | null;
  lien: string; auteur_nom: string | null; lu_le: string | null; created_at: string;
}

export default async function Messages() {
  const { profil, secteur, sb } = await profilCourant();

  const [{ data }, { data: notifs }] = await Promise.all([
    sb.rpc('mes_conversations'),
    sb.from('notifications')
      .select('id, categorie, titre, apercu, lien, auteur_nom, lu_le, created_at')
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const fils = (data ?? []) as Fil[];
  const avis = (notifs ?? []) as Notif[];

  // Vues à l'ouverture de la page : la pastille ne doit pas survivre à
  // la lecture.
  if (avis.some((n) => !n.lu_le)) await sb.rpc('marquer_notifications_lues');

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Messages</h1>
          <p>
            Vos échanges avec les voisins : disponibilité d&apos;un produit, heure
            de retrait, prix.
          </p>
        </div>

        {avis.length > 0 && (
          <section className="bloc" aria-labelledby="t-avis">
            <div className="bloc-head">
              <h2 id="t-avis">Informations du secteur</h2>
              <Link href="/informations" className="tiny">Toutes</Link>
            </div>
            <div className="fils">
              {avis.map((n) => (
                <Link key={n.id} href={n.lien}
                  className={`fil${!n.lu_le ? ' fil-neuf' : ''}`}>
                  <span className="fil-photo fil-photo-vide" aria-hidden="true">
                    {n.categorie === 'sondage' ? '?' : 'i'}
                  </span>
                  <span className="fil-b">
                    <span className="fil-tete">
                      <b>{n.titre}</b>
                      <span className="tiny">{quand(n.created_at)}</span>
                    </span>
                    <span className="fil-sujet">
                      {n.categorie === 'sondage' ? 'Sondage' : 'Information'}
                      {n.auteur_nom ? ` · ${n.auteur_nom}` : ''}
                    </span>
                    {n.apercu && <span className="fil-apercu">{n.apercu}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {avis.length > 0 && (
          <div className="bloc-head" style={{ marginTop: 22 }}>
            <h2>Conversations</h2>
          </div>
        )}

        {fils.length > 0 ? (
          <div className="fils">
            {fils.map((f) => (
              <Link key={f.id} href={`/messages/${f.id}`}
                className={`fil${f.non_lus > 0 ? ' fil-neuf' : ''}`}>
                {f.autre_avatar
                  ? <img src={f.autre_avatar} alt="" loading="lazy" className="fil-photo" />
                  : <span className="fil-photo fil-photo-vide">{f.autre_prenom?.[0]?.toUpperCase()}</span>}
                <span className="fil-b">
                  <span className="fil-tete">
                    <b>{f.autre_prenom}</b>
                    <span className="tiny">{quand(f.dernier_le)}</span>
                  </span>
                  {f.sujet && <span className="fil-sujet">À propos de {f.sujet}</span>}
                  <span className="fil-apercu">
                    {f.dernier_texte
                      ? `${f.dernier_auteur === profil.id ? 'Vous : ' : ''}${f.dernier_texte}`
                      : 'Conversation ouverte, aucun message.'}
                  </span>
                </span>
                {f.non_lus > 0 && <span className="fil-pastille">{f.non_lus}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Aucune conversation</h3>
            <p>
              Depuis une annonce, le bouton « Écrire au vendeur » ouvre une
              discussion : c&apos;est le plus simple pour demander si un produit
              est encore disponible.
            </p>
            <Link className="btn btn-p" href="/">Voir les annonces</Link>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
