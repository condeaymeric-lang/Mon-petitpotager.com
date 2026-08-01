/** Illustrations vectorielles de repli, quand le vendeur n'a pas mis de photo. */
const P: Record<string, JSX.Element> = {
  tomate: (<><rect width="100" height="100" fill="#FBEDE9"/><ellipse cx="50" cy="58" rx="27" ry="25" fill="#C93B26"/><ellipse cx="40" cy="50" rx="9" ry="7" fill="#E06B54" opacity=".55"/><path d="M50 33v-8" stroke="#3F7A38" strokeWidth="4" strokeLinecap="round"/><path d="M50 34c-3-8-11-11-18-9 2 7 9 11 18 9Z" fill="#4B8C3F"/><path d="M50 34c3-8 11-11 18-9-2 7-9 11-18 9Z" fill="#3F7A38"/></>),
  tomatevert: (<><rect width="100" height="100" fill="#EDF3E4"/><ellipse cx="50" cy="58" rx="27" ry="25" fill="#7FA83E"/><path d="M25 52q13 5 25 0t25 0" stroke="#5E8A2C" strokeWidth="3.5" fill="none"/><path d="M24 63q13 5 26 0t26 0" stroke="#5E8A2C" strokeWidth="3.5" fill="none"/><path d="M50 33v-8" stroke="#3F7A38" strokeWidth="4" strokeLinecap="round"/><path d="M50 34c-3-8-11-11-18-9 2 7 9 11 18 9Z" fill="#4B8C3F"/></>),
  courgette: (<><rect width="100" height="100" fill="#EAF3E6"/><path d="M28 72c-6-14 2-34 18-42s30-2 32 8-8 20-20 28-24 14-30 6Z" fill="#3F7A38"/><path d="M36 66c-4-10 2-24 14-30" stroke="#5FA04C" strokeWidth="4" strokeLinecap="round" fill="none"/><path d="M76 32l6-8" stroke="#8FBF6A" strokeWidth="5" strokeLinecap="round"/></>),
  carotte: (<><rect width="100" height="100" fill="#FBF1E4"/><path d="M50 84 34 44c-2-6 4-11 16-11s18 5 16 11L50 84Z" fill="#DE7B27"/><path d="M42 52h16M39 63h13" stroke="#F0A25C" strokeWidth="3" strokeLinecap="round"/><path d="M50 33V20M50 26c-6-6-13-6-18-3 4 6 11 8 18 3ZM50 26c6-6 13-6 18-3-4 6-11 8-18 3Z" stroke="#3F7A38" strokeWidth="3.6" fill="#4B8C3F" strokeLinejoin="round"/></>),
  salade: (<><rect width="100" height="100" fill="#EAF3E6"/><circle cx="50" cy="56" r="27" fill="#5FA04C"/><path d="M50 29c-9 8-14 18-14 27s5 17 14 27" stroke="#7FBF5E" strokeWidth="4" fill="none"/><path d="M50 29c9 8 14 18 14 27s-5 17-14 27" stroke="#3F7A38" strokeWidth="4" fill="none"/><ellipse cx="50" cy="56" rx="27" ry="9" fill="#7FBF5E" opacity=".35"/></>),
  fraise: (<><rect width="100" height="100" fill="#FBE9EE"/><path d="M50 86c-14-6-24-18-24-30 0-9 11-14 24-14s24 5 24 14c0 12-10 24-24 30Z" fill="#C9284A"/><circle cx="42" cy="55" r="2.2" fill="#FBE9EE"/><circle cx="58" cy="55" r="2.2" fill="#FBE9EE"/><circle cx="50" cy="66" r="2.2" fill="#FBE9EE"/><circle cx="50" cy="48" r="2.2" fill="#FBE9EE"/><path d="M50 42V30M50 36c-7-6-15-5-20-1 5 6 13 7 20 1ZM50 36c7-6 15-5 20-1-5 6-13 7-20 1Z" stroke="#3F7A38" strokeWidth="3.4" fill="#4B8C3F" strokeLinejoin="round"/></>),
  pomme: (<><rect width="100" height="100" fill="#FAEBE8"/><path d="M50 34c-16-8-28 4-28 20s12 32 28 32 28-16 28-32-12-28-28-20Z" fill="#C0402B"/><ellipse cx="38" cy="50" rx="7" ry="9" fill="#DB6A50" opacity=".5"/><path d="M50 34V22" stroke="#7A5230" strokeWidth="4" strokeLinecap="round"/><path d="M52 26c5-7 13-8 18-5-3 7-11 10-18 5Z" fill="#4B8C3F"/></>),
  oeuf: (<><rect width="100" height="100" fill="#FBF7EA"/><ellipse cx="36" cy="58" rx="17" ry="22" fill="#F0E2C4"/><ellipse cx="64" cy="62" rx="17" ry="22" fill="#E6D3AE"/><ellipse cx="31" cy="50" rx="5" ry="7" fill="#FBF7EA" opacity=".7"/></>),
  fromage: (<><rect width="100" height="100" fill="#FBF4E2"/><ellipse cx="50" cy="62" rx="28" ry="14" fill="#D9B863"/><rect x="22" y="46" width="56" height="16" fill="#EBD08A"/><ellipse cx="50" cy="46" rx="28" ry="14" fill="#F5E3AE"/><circle cx="42" cy="45" r="3.4" fill="#DCC183"/><circle cx="58" cy="49" r="2.6" fill="#DCC183"/></>),
  miel: (<><rect width="100" height="100" fill="#FBF2DF"/><path d="M30 44h40v30a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6V44Z" fill="#E0A227"/><rect x="26" y="36" width="48" height="10" rx="3" fill="#B87C19"/><path d="M38 56h24M38 66h18" stroke="#F3C86A" strokeWidth="3.4" strokeLinecap="round"/></>),
  plant: (<><rect width="100" height="100" fill="#EDF3E4"/><path d="M34 62h32l-4 20a4 4 0 0 1-4 3H42a4 4 0 0 1-4-3l-4-20Z" fill="#B0603A"/><path d="M50 62V36" stroke="#3F7A38" strokeWidth="4" strokeLinecap="round"/><path d="M50 44c-4-10-14-13-22-11 3 9 12 14 22 11ZM50 50c4-9 13-11 20-9-3 8-11 12-20 9Z" fill="#4B8C3F"/></>),
  herbe: (<><rect width="100" height="100" fill="#EAF3E6"/><path d="M50 84V40" stroke="#3F7A38" strokeWidth="4" strokeLinecap="round"/><path d="M50 46c-6-9-16-10-23-7 4 9 14 12 23 7ZM50 58c-5-8-14-9-20-6 3 8 12 11 20 6ZM50 46c6-9 16-10 23-7-4 9-14 12-23 7ZM50 58c5-8 14-9 20-6-3 8-12 11-20 6Z" fill="#5FA04C"/></>),
  courge: (<><rect width="100" height="100" fill="#FBF1E4"/><ellipse cx="50" cy="60" rx="30" ry="24" fill="#D97B20"/><path d="M50 36v48M34 40c-4 8-4 32 0 40M66 40c4 8 4 32 0 40" stroke="#B85F14" strokeWidth="3" fill="none"/><path d="M50 36v-9" stroke="#4B7A2E" strokeWidth="5" strokeLinecap="round"/></>),
  patate: (<><rect width="100" height="100" fill="#F5F0E4"/><ellipse cx="50" cy="58" rx="30" ry="22" fill="#C9A46A" transform="rotate(-8 50 58)"/><circle cx="38" cy="52" r="2.6" fill="#A8834B"/><circle cx="58" cy="62" r="2.2" fill="#A8834B"/><circle cx="62" cy="48" r="1.8" fill="#A8834B"/></>),
  poivron: (<><rect width="100" height="100" fill="#EDF4E6"/><path d="M32 54c0-10 8-14 18-14s18 4 18 14c0 16-6 30-18 30S32 70 32 54Z" fill="#4C9138"/><path d="M50 40V28" stroke="#3F6E2A" strokeWidth="4" strokeLinecap="round"/><path d="M42 30h16" stroke="#3F6E2A" strokeWidth="5" strokeLinecap="round"/><path d="M42 52c0 12 2 20 6 24" stroke="#6EB84C" strokeWidth="3.4" fill="none"/></>),
  confiture: (<><rect width="100" height="100" fill="#FBE9EE"/><path d="M32 46h36v30a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V46Z" fill="#B93356"/><rect x="28" y="34" width="44" height="12" rx="4" fill="#EFE3CB"/><path d="M32 58h36" stroke="#EFE3CB" strokeWidth="7"/></>),
};

export function Illustration({ nom, className }: { nom?: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {P[nom ?? ''] ?? P.plant}
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#EFF6E8" />
      <circle cx="27" cy="13" r="4.2" fill="#F2B33D" />
      <path d="M20 30V19.5" stroke="#2E5233" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 22c0-5.2 4.4-8.6 10-8.6.4 5.6-4.4 9.4-10 8.6Z" fill="#6FBF4E" />
      <path d="M20 25.4c0-4.4-3.6-7.6-8.2-7.6-.3 4.6 3.6 8 8.2 7.6Z" fill="#3E8C43" />
    </svg>
  );
}
