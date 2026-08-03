'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePanier } from '@/components/PanierContext';
import { creerClient } from '@/lib/supabase-client';
import { Marque } from './Marque';
import Tiroir from './Tiroir';
import MenuPublier from './MenuPublier';

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

const PLACE = {
  href: '/place', cle: 'place', label: 'La place',
  d: 'M3 21h18M6 21V11M18 21V11M4 11h16l-8-6-8 6ZM10 21v-5h4v5',
};

/** Ce que le vendeur consulte moins souvent, sous un même titre. */
const BOUTIQUE = [
  { href: '/vendre/annonces', label: 'Mes annonces', d: 'M4 4h16v16H4zM4 9h16M9 9v11',
    aide: 'Modifier, retirer, réapprovisionner' },
  { href: '/vendre/ventes', label: 'Mes ventes', d: 'M18.5 6.5a7 7 0 1 0 0 11M4 10.5h11M4 14h9.5',
    aide: 'Chiffre d\u2019affaires et versements' },
  { href: '/vendre/publier', label: 'Publier une annonce', d: 'M12 5v14M5 12h14',
    aide: 'Un produit ou un panier composé' },
];

/** Tout ce qui fait la vie du secteur, sous un même titre : la barre ne
 *  peut pas aligner huit rubriques sans devenir illisible. */
const VILLAGE = [
  { href: '/place', label: 'La place du village', d: 'M3 21h18M6 21V11M18 21V11M4 11h16l-8-6-8 6ZM10 21v-5h4v5',
    aide: 'Tout ce qui se passe autour de vous' },
  { href: '/bistrot', label: 'Le bistrot du coin', d: 'M6 2h12l-1 9a5 5 0 0 1-10 0ZM8 21h8M12 16v5',
    aide: 'Conseils, entraide et discussions' },
  { href: '/evenements', label: 'Les événements', d: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
    aide: 'Marchés, fêtes, brocantes' },
  { href: '/informations', label: 'Les informations', d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-5M12 8h.01',
    aide: 'Mairies, associations et sondages' },
  { href: '/producteurs', label: 'Les producteurs', d: 'M3 21h18M5 21V9l7-4 7 4v12M10 21v-5h4v5',
    aide: 'Les fermes de votre secteur' },
];

/** Non-lus et identité, relus à chaque changement de page. */
function useMoi() {
  const [n, setN] = useState(0);
  const [moi, setMoi] = useState<{ prenom: string; avatar: string | null } | null>(null);
  const path = usePathname();

  useEffect(() => {
    let vivant = true;
    const sb = creerClient();
    Promise.all([
      sb.rpc('messages_non_lus'),
      sb.rpc('notifications_non_lues'),
      sb.rpc('mon_profil'),
    ]).then(([m, n2, p]) => {
      if (!vivant) return;
      const a = typeof m.data === 'number' ? m.data : 0;
      const b = typeof n2.data === 'number' ? n2.data : 0;
      setN(a + b);
      const fiche = Array.isArray(p.data) ? p.data[0] : null;
      if (fiche) setMoi({ prenom: fiche.prenom, avatar: fiche.avatar_url ?? null });
    });
    return () => { vivant = false; };
  }, [path]);

  return { nonLus: n, moi };
}

/** Un titre de rubrique et son dérouleur. */
function Menu({ titre, icone, entrees }: {
  titre: string; icone: string;
  entrees: { href: string; label: string; d: string; aide: string }[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const path = usePathname();
  const zone = useRef<HTMLDivElement>(null);
  const actif = entrees.some((v) => path.startsWith(v.href));

  useEffect(() => { setOuvert(false); }, [path]);

  useEffect(() => {
    if (!ouvert) return;
    function dehors(e: MouseEvent) {
      if (!zone.current?.contains(e.target as Node)) setOuvert(false);
    }
    function echap(e: KeyboardEvent) {
      if (e.key === 'Escape') setOuvert(false);
    }
    document.addEventListener('mousedown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  return (
    <div className="menu-v" ref={zone}>
      <button type="button" className={`menu-v-b${actif ? ' on' : ''}`}
        aria-expanded={ouvert} aria-haspopup="true"
        onClick={() => setOuvert((v) => !v)}>
        <Icone d={icone} taille={17} />
        {titre}
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"
          className={ouvert ? 'chev ouvert' : 'chev'}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {ouvert && (
        <div className="menu-v-p" role="menu">
          {entrees.map((v) => (
            <Link key={v.href} href={v.href} role="menuitem"
              className={path.startsWith(v.href) ? 'on' : ''}>
              <Icone d={v.d} taille={19} />
              <span>
                <b>{v.label}</b>
                <span>{v.aide}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
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
  const { nonLus, moi } = useMoi();
  const modeVendre = path.startsWith('/vendre');
  const onglets = modeVendre ? ONGLETS.vendre : ONGLETS.acheter;
  const publier = modeVendre ? '/vendre/publier' : '/vendre';
  const surProfil = path.startsWith('/profil');

  // Tout ce que la barre du bas ne porte pas se retrouve dans le tiroir.
  const groupes = [
    {
      titre: 'Autour de moi',
      entrees: [
        { href: '/', label: 'Accueil', d: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z' },
        ...VILLAGE.map((v) => ({ href: v.href, label: v.label, d: v.d })),
      ],
    },
    {
      titre: 'Mes échanges',
      entrees: [
        { href: '/notifications', label: 'Notifications', badge: nonLus,
          d: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0' },
        { href: '/messages', label: 'Messages',
          d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.1-4.1A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z' },
        { href: '/commandes', label: 'Mes achats',
          d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
        { href: '/panier', label: 'Mon panier', badge: nbArticles,
          d: 'M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6' },
      ],
    },
    {
      titre: 'Je vends',
      entrees: [
        { href: '/vendre', label: 'Mon tableau de bord', d: 'M3 3v18h18M7 15l4-5 3 3 5-7' },
        ...BOUTIQUE.map((b) => ({ href: b.href, label: b.label, d: b.d })),
        { href: '/vendre/commandes', label: 'Mes commandes reçues',
          d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
        { href: '/vendre/gestion', label: 'Gestion de l\u2019exploitation',
          d: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 3v4h6V3M8 12h8M8 16h5' },
      ],
    },
    {
      titre: 'Mon compte',
      entrees: [
        { href: '/profil', label: 'Mon profil',
          d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8' },
        { href: '/officiel', label: 'Ma structure',
          d: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6' },
        { href: '/contact', label: 'Nous écrire',
          d: 'M4 4h16v16H4zM4 7l8 6 8-6' },
      ],
    },
  ];

  return (
    <div className="topbar">
      <div className="topbar-in">
        <div className="tb-row">
          <Tiroir groupes={groupes} prenom={moi?.prenom} avatar={moi?.avatar} />

          <Link href="/" className="brand"><Marque hauteur={46} /></Link>

          <nav className="dsk-nav" aria-label="Navigation principale">
            {onglets.filter((o) => o.cle !== 'profil').map((o) => {
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
            {modeVendre
              ? <Menu titre="Ma boutique" entrees={BOUTIQUE}
                  icone="M3 9h18l-1.5 11a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8ZM8 9V6a4 4 0 0 1 8 0v3" />
              : <Menu titre="Le village" entrees={VILLAGE}
                  icone="M3 21h18M6 21V11M18 21V11M4 11h16l-8-6-8 6ZM10 21v-5h4v5" />}
          </nav>

          <div className="tb-right">
            <Link href={publier} className="dsk-publier">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              {modeVendre ? 'Publier' : 'Vendre'}
            </Link>

            {/* Le secteur mène au réglage du secteur, pas au profil entier :
                cliquer sur « 20 km » pour trouver son profil n'avait rien
                d'évident. */}
            <Link href="/profil#secteur" className="loc" title="Régler ma commune et mon rayon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6FA83A" strokeWidth="2.2">
                <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <b>{commune}</b>
              <span className="loc-km">{rayonKm} km</span>
            </Link>

            <Link href="/notifications" className="tb-cloche"
              aria-label={nonLus > 0 ? `Notifications, ${nonLus} non lues` : 'Notifications'}>
              <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {nonLus > 0 && <span className="tb-pastille">{nonLus > 9 ? '9+' : nonLus}</span>}
            </Link>

            <Link href="/profil" className={`tb-profil${surProfil ? ' on' : ''}`}>
              {moi?.avatar
                ? <img src={moi.avatar} alt="" className="tb-avatar" />
                : <span className="tb-avatar tb-avatar-vide">
                    {moi?.prenom?.[0]?.toUpperCase() ?? '·'}
                  </span>}
              <span className="tb-profil-t">{moi?.prenom ?? 'Profil'}</span>
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
  const { nonLus } = useMoi();
  const modeVendre = path.startsWith('/vendre');
  const cles = modeVendre ? MOBILE.vendre : MOBILE.acheter;
  const onglets = (modeVendre ? ONGLETS.vendre : ONGLETS.acheter)
    .filter((o) => cles.includes(o.cle));
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
      <MenuPublier />
      {onglets.slice(moitie).map(lien)}
    </nav>
  );
}
