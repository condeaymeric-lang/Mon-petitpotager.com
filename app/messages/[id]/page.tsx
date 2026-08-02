import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profilCourant } from '@/lib/donnees';
import { BarreHaut, BarreBas } from '@/components/Navigation';
import { eur } from '@/lib/utils';
import Fil, { type MessagePrive } from './Fil';

export const dynamic = 'force-dynamic';

export default async function PageFil({ params }: { params: { id: string } }) {
  const { profil, secteur, sb } = await profilCourant();

  // La politique d'accès filtre déjà : une conversation qui n'est pas la
  // sienne ne remonte tout simplement pas.
  const { data: conv } = await sb
    .from('conversations')
    .select('id, annonce_id, sujet, membre_min, membre_max')
    .eq('id', params.id)
    .maybeSingle();

  if (!conv) notFound();

  const autreId = conv.membre_min === profil.id ? conv.membre_max : conv.membre_min;

  const [{ data: autre }, { data: messages }, { data: annonce }] = await Promise.all([
    sb.from('profils').select('id, prenom, raison_sociale, avatar_url, role').eq('id', autreId).maybeSingle(),
    sb.from('messages_prives')
      .select('id, auteur_id, texte, prix_propose, created_at')
      .eq('conversation_id', conv.id).order('created_at'),
    conv.annonce_id
      ? sb.from('annonces').select('id, titre, prix, unite, mode, statut').eq('id', conv.annonce_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  await sb.rpc('marquer_lus', { p_conversation: conv.id });

  const nom = autre?.raison_sociale || autre?.prenom || 'Ce membre';

  return (
    <>
      <BarreHaut commune={secteur?.nom ?? '—'} rayonKm={profil.rayon_km} />
      <div className="app has-tabbar"><div className="page page-form">
        <Link href="/messages" className="back">← Tous les messages</Link>

        <div className="page-head">
          <h1>{nom}</h1>
          <p>
            <Link href={`/membre/${autreId}`} className="lien-membre">Voir sa fiche</Link>
          </p>
        </div>

        {annonce && (
          <Link href={`/annonce/${annonce.id}`} className="card fil-annonce">
            <span>
              <b>{annonce.titre}</b>
              <span className="tiny">
                {annonce.mode === 'vente' ? `${eur(annonce.prix)} / ${annonce.unite}`
                  : annonce.mode === 'troc' ? 'Troc' : 'Don'}
                {annonce.statut !== 'en_ligne' && ' · annonce retirée'}
              </span>
            </span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        )}

        <Fil
          conversationId={conv.id}
          messages={(messages ?? []) as MessagePrive[]}
          moiId={profil.id}
          autrePrenom={nom}
          prixAnnonce={annonce?.mode === 'vente' ? annonce.prix : null}
        />

        <p className="tiny center" style={{ marginTop: 12 }}>
          Ces échanges se font entre membres. Rien n&apos;engage le site, et un
          prix convenu ici ne modifie pas celui de l&apos;annonce.
        </p>
      </div></div>
      <BarreBas />
    </>
  );
}
