'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { creerClient } from '@/lib/supabase-client';
import { eur, PALIER_POINTS, PALIER_EUROS } from '@/lib/utils';

interface Bon {
  id: string;
  code: string;
  montant: number;
  utilise: boolean;
  expire_le: string;
}

/** Conversion des points en bons d'achat et liste des bons du membre. */
export default function BonsAchat({ points, bons }: { points: number; bons: Bon[] }) {
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const paliers = Math.floor(points / PALIER_POINTS);
  const manquants = PALIER_POINTS - (points % PALIER_POINTS);
  const maintenant = Date.now();

  async function convertir() {
    setEnvoi(true);
    const sb = creerClient();
    const { data, error } = await sb.rpc('convertir_points', { p_multiples: 1 });
    setEnvoi(false);
    if (error) {
      toast("La conversion n'a pas abouti. Réessayez.");
      return;
    }
    const bon = Array.isArray(data) ? data[0] : data;
    toast(`Bon ${bon?.code ?? ''} créé — ${eur(PALIER_EUROS)}`);
    router.refresh();
  }

  return (
    <div className="card">
      <h3>Mes bons d'achat</h3>
      <p className="tiny" style={{ marginTop: 5 }}>
        {PALIER_POINTS} points se convertissent en un bon d'achat de {eur(PALIER_EUROS)},
        utilisable sur une commande. Le bon est nominatif, valable un an, et ne peut pas
        être échangé contre de l'argent.
      </p>

      <p className="tiny" style={{ marginTop: 10 }} aria-live="polite">
        {paliers > 0
          ? `${points} points : vous pouvez créer ${paliers} bon${paliers > 1 ? 's' : ''}.`
          : `${points} points. Encore ${manquants} points avant votre premier bon.`}
      </p>

      {paliers > 0 && (
        <button className="btn btn-p" style={{ marginTop: 12 }} onClick={convertir} disabled={envoi}>
          {envoi ? 'Conversion…' : `Convertir ${PALIER_POINTS} points en bon de ${eur(PALIER_EUROS)}`}
        </button>
      )}

      {bons.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {bons.map((b) => {
            const expire = new Date(b.expire_le);
            const perime = expire.getTime() < maintenant;
            return (
              <div className="pts-log" key={b.id}>
                <span>
                  {b.code}<br />
                  <span className="tiny">
                    {b.utilise
                      ? 'Utilisé'
                      : perime
                        ? 'Expiré'
                        : `Valable jusqu'au ${expire.toLocaleDateString('fr-FR')}`}
                  </span>
                </span>
                <b className={b.utilise || perime ? 'neg' : ''}>{eur(b.montant)}</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
