'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePanier } from '@/components/PanierContext';
import { creerClient } from '@/lib/supabase-client';
import { Marque } from './Marque';

const ONGLETS = {
  acheter: [
    { href: '/', cle: 'accueil', label: 'Accueil', d: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z' },
    { href: '/commandes', cle: 'commandes', label: 'Commandes', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
    { href: '/messages', cle: 'messages', label: 'Messages', d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.1-4.1A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z' },
    { href: '/panier', cle: 'panier', label: 'Panier', d: 'M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6' },
    { href: '/profil', cle: 'profil', label: 'Profil', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8' },
  ],
  vendre: [
    { href: '/vendre', cle: 'vendre', label: 'Tableau', d: 'M3 3v18h18M7 15l4-5 3 3 5-7' },
    { href: '/vendre/commandes', cle: 'cmd-vendeur', label: 'Commandes', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
    { href: '/messages', cle: 'messages', label: 'Messages', d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.1-4.1A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z' },
    { href: '/vendre/annonces', cle: 'annonces', label: 'Annonces', d: 'M4 4h16v16H4zM4 9h16M9 9v11' },
    { href: '/vendre/ventes', cle: 'ventes', label: 'Ventes', d: 'M18.5 6.5a7 7 0 1 0 0 11M4 10.5h11M4 14h9.5' },
    { href: '/vendre/gestion', cle: 'gestion', label: 'Gestion', d: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 3v4h6V3M8 12h8M8 16h5' },
    { href: '/profil', cle: 'profil', label: 'Profil', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8' },
  ],
};

// La barre du bas porte cinq entrées plus le bouton central : c'est la
// densité d'origine, et elle laisse encore 44 px de cible par onglet.
// Les entrées absentes d'ici restent atteignables depuis le profil et
// le tableau de bord.
const MOBILE = {
  acheter: ['accueil', 'commandes', 'messages', 'panier', 'profil'],
  vendre: ['vendre', 'cmd-vendeur', 'gestion', 'messages', 'profil'],
};

const PRODUCTEURS = {
  href: '/producteurs', cle: 'producteurs', label: 'Producteurs',
  d: 'M3 21h18M5 21V9l7-4 7 4v12M10 21v-5h4v5',
};

/** Nombre de messages non lus, relu à chaque changement de page. */
function useNonLus() {
  const [n, setN] = useState(0);
  const path = usePathname();

  useEffect(() => {
    let vivant = true;
    const sb = creerClient();
    Promise.all([
      sb.rpc('messages_non_lus'),
      sb.rpc('notifications_non_lues'),
    ]).then(([m, n2]) => {
      if (!vivant) return;
      const a = typeof m.data === 'number' ? m.data : 0;
      const b = typeof n2.data === 'number' ? n2.data : 0;
      setN(a + b);
    });
    return () => { vivant = false; };
  }, [path]);

  return n;
}

function Icone({ d, taille = 21 }: { d: string; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  );
}

export function BarreHaut({ commune, rayonKm }: { commune: string; rayonKm: number }) {
  const path = usePathname();
  const router = useRouter();
  const { nbArticles } = usePanier();
  const nonLus = useNonLus();
  const modeVendre = path.startsWith('/vendre');
  const onglets = modeVendre ? ONGLETS.vendre : ONGLETS.acheter;
  const publier = modeVendre ? '/vendre/publier' : '/vendre';

  return (
    <div className="topbar">
      <div className="topbar-in">
        <div className="tb-row">
          <Link href="/" className="brand"><Marque hauteur={46} /></Link>

          <nav className="dsk-nav" aria-label="Navigation principale">
            {[...onglets.filter((o) => o.cle !== 'profil'),
              ...(modeVendre ? [] : [PRODUCTEURS])].map((o) => {
              const actif = o.href === '/' ? path === '/' : path.startsWith(o.href);
              return (
                <Link key={o.cle} href={o.href} className={actif ? 'on' : ''}>
                  <Icone d={o.d} taille={17} />
                  {o.label}
                  {o.cle === 'panier' && nbArticles > 0 && <span className="dsk-badge">{nbArticles}</span>}
                  {o.cle === 'messages' && nonLus > 0 && <span className="dsk-badge">{nonLus}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="tb-right">
            <Link href={publier} className="dsk-publier">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              {modeVendre ? 'Publier' : 'Vendre'}
            </Link>
            <Link href="/profil" className="loc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6FA83A" strokeWidth="2.2">
                <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <b>{commune} · {rayonKm} km</b>
            </Link>
          </div>
        </div>
        <div className="mode-sw">
          <button className={!modeVendre ? 'on' : ''} onClick={() => router.push('/')}>J'achète</button>
          <button className={modeVendre ? 'on sell' : ''} onClick={() => router.push('/vendre')}>Je vends</button>
        </div>
      </div>
    </div>
  );
}

export function BarreBas() {
  const path = usePathname();
  const { nbArticles } = usePanier();
  const nonLus = useNonLus();
  const modeVendre = path.startsWith('/vendre');
  const cles = modeVendre ? MOBILE.vendre : MOBILE.acheter;
  const onglets = (modeVendre ? ONGLETS.vendre : ONGLETS.acheter)
    .filter((o) => cles.includes(o.cle));
  const fab = modeVendre ? '/vendre/publier' : '/pourquoi';
  const moitie = Math.ceil(onglets.length / 2);

  const lien = (o: (typeof onglets)[number]) => {
    const actif = o.href === '/' ? path === '/' : path.startsWith(o.href);
    return (
      <Link key={o.cle} href={o.href} className={actif ? 'on' : ''}>
        <svg width="21" height="21" viewBox="0 0 24 24">
          <path d={o.d} />
          {o.cle === 'panier' && (<><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /></>)}
        </svg>
        {o.label}
        {o.cle === 'panier' && nbArticles > 0 && <span className="dotbadge">{nbArticles}</span>}
        {o.cle === 'messages' && nonLus > 0 && <span className="dotbadge">{nonLus}</span>}
      </Link>
    );
  };

  return (
    <nav className="tabbar" aria-label="Navigation principale (mobile)">
      {onglets.slice(0, moitie).map(lien)}
      <Link href={fab} className="fab" aria-label={modeVendre ? 'Publier une annonce' : "Pourquoi l'application"}>
        <i><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></i>
      </Link>
      {onglets.slice(moitie).map(lien)}
    </nav>
  );
}
