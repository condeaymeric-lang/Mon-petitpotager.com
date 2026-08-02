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

export default async function Messages() {
  const { profil, secteur, sb } = await profilCourant();
  const { data } = await sb.rpc('mes_conversations');
  const fils = (data ?? []) as Fil[];

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
