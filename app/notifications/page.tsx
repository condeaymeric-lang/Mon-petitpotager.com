import Link from 'next/link';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { Illustration } from '@/components/Illustrations';
import Marquer from './Marquer';

export const dynamic = 'force-dynamic';

interface Nouveaute {
  genre: 'message' | 'info' | 'annonce';
  id: string; titre: string; apercu: string | null; lien: string; quand: string;
}

const SIGNE: Record<string, { label: string; d: string; classe: string }> = {
  message: {
    label: 'Message', classe: 'ntf-msg',
    d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.1-4.1A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z',
  },
  info: {
    label: 'Information du secteur', classe: 'ntf-info',
    d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-5M12 8h.01',
  },
  annonce: {
    label: 'Nouvelle annonce', classe: 'ntf-ann',
    d: 'M4 4h16v16H4zM4 9h16M9 9v11',
  },
};

function quand(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  const j = Math.round(min / 1440);
  if (j < 7) return `il y a ${j} jour${j > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default async function Notifications() {
  const { profil, secteur, sb } = await profilCourant();

  const depuis = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await sb.rpc('nouveautes', { p_depuis: depuis });
  const liste = (data ?? []) as Nouveaute[];

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page">
        <div className="page-head">
          <h1>Notifications</h1>
          <p>
            Ce qui a bougé autour de vous depuis un mois : messages reçus,
            informations du secteur, annonces susceptibles de vous intéresser.
          </p>
        </div>

        {liste.length > 0 ? (
          <>
            <Marquer />
            <div className="ntfs">
              {liste.map((n) => {
                const s = SIGNE[n.genre];
                return (
                  <Link key={n.genre + n.id} href={n.lien} className={`ntf ${s.classe}`}>
                    <span className="ntf-ico" aria-hidden="true">
                      <svg width="19" height="19" viewBox="0 0 24 24"><path d={s.d} /></svg>
                    </span>
                    <span className="ntf-b">
                      <span className="ntf-etq">{s.label}</span>
                      <b>{n.titre}</b>
                      {n.apercu && <span className="ntf-ap">{n.apercu}</span>}
                    </span>
                    <span className="ntf-h">{quand(n.quand)}</span>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty">
            <Illustration nom="plant" className="e-ico" />
            <h3>Rien de neuf</h3>
            <p>
              Vous êtes à jour. Les nouveaux messages, les informations de votre
              mairie et les annonces qui vous ressemblent apparaîtront ici.
            </p>
            <Link className="btn btn-p" href="/">Voir les annonces</Link>
          </div>
        )}
      </div></div>
      <BarreBas />
    </>
  );
}
