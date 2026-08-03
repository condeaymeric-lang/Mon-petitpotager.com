import Link from 'next/link';
import { contexteVisite } from '@/lib/contexte';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import BarreVisiteur from '@/components/BarreVisiteur';
import ChoixCommune from '@/components/ChoixCommune';
import CarteSujet, { THEMES, type SujetProche } from '@/components/CarteSujet';
import { Illustration } from '@/components/Illustrations';

export const dynamic = 'force-dynamic';

export default async function Bistrot({
  searchParams,
}: { searchParams: { theme?: string } }) {
  const { connecte, profil, secteur, rayonKm, sb } = await contexteVisite();
  if (!secteur) return <ChoixCommune />;

  const theme = searchParams.theme ?? null;
  const { data } = await sb.rpc('sujets_autour', {
    p_lat: secteur.lat, p_lon: secteur.lon, p_rayon_km: rayonKm,
    p_theme: theme, p_limite: 40,
  });
  const sujets = (data ?? []) as SujetProche[];

  return (
    <>
      {connecte
        ? <BarreHaut commune={secteur.nom} rayonKm={rayonKm} />
        : <BarreVisiteur commune={secteur.nom} rayonKm={rayonKm} />}

      <div className={connecte ? 'app has-tabbar' : 'app'}><div className="page">
        <div className="page-head">
          <h1>Le bistrot du coin</h1>
          <p>
            On y parle jardin, entraide et vie du village, entre voisins des
            {' '}{rayonKm} km autour de {secteur.nom}. Pas de comptoir, mais on
            refait le monde quand même.
          </p>
        </div>

        <div className="filtres-zone">
          <div className="filters">
            <Link href="/bistrot" className={`fchip${!theme ? ' on' : ''}`}>Tout</Link>
            {THEMES.map(([c, l]) => (
              <Link key={c} href={`/bistrot?theme=${c}`}
                className={`fchip${theme === c ? ' on' : ''}`}>{l}</Link>
            ))}
          </div>
        </div>

        {connecte && profil && (
          <Link className="btn btn-p" href="/bistrot/nouveau" style={{ marginBottom: 16 }}>
            Ouvrir une discussion
          </Link>
        )}

        {sujets.length > 0 ? (
          <div className="sujets">
            {sujets.map((s) => <CarteSujet key={s.id} sujet={s} />)}
          </div>
        ) : (
          <div className="empty">
            <Illustration nom="herbe" className="e-ico" />
            <h3>Le bistrot est vide</h3>
            <p>
              {theme
                ? "Rien sur ce thème pour l'instant. Ouvrez la discussion."
                : "Personne n'a encore poussé la porte. Une question sur vos semis, un outil à emprunter, une recette de conserve : tout est bon à partager."}
            </p>
            {connecte && profil
              ? <Link className="btn btn-p" href="/bistrot/nouveau">Ouvrir une discussion</Link>
              : <Link className="btn btn-p" href="/inscription">Créer un compte</Link>}
          </div>
        )}
      </div></div>
      {connecte && <BarreBas />}
    </>
  );
}
