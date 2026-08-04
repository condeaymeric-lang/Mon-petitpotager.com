'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePanier } from '@/components/PanierContext';
import { useToast } from '@/components/Toast';
import type { LignePanier } from '@/lib/types';

export default function BoutonPanier({ annonce }: { annonce: LignePanier }) {
  const { lignes, ajouter } = usePanier();
  const dejaLa = lignes.find((l) => l.annonce_id === annonce.annonce_id);
  const [q, setQ] = useState(dejaLa?.quantite ?? 1);
  const router = useRouter();
  const toast = useToast();

  return (
    <>
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div><h4>Quantité</h4><p className="tiny">Maximum {annonce.stock}</p></div>
          <div className="qty">
            <button onClick={() => setQ((v) => Math.max(1, v - 1))} aria-label="Diminuer">−</button>
            <span>{q}</span>
            <button aria-label="Augmenter"
              onClick={() => {
                if (q >= annonce.stock) { toast(`Stock maximum : ${annonce.stock}`); return; }
                setQ((v) => v + 1);
              }}>+</button>
          </div>
        </div>
      </div>

      <button className="btn btn-p" style={{ marginTop: 14 }}
        onClick={() => { ajouter({ ...annonce, quantite: q }); toast('Ajouté au panier'); router.push('/panier'); }}>
        {dejaLa ? 'Mettre à jour le panier' : 'Ajouter au panier'}
      </button>

      <Link href="/pourquoi" className="btn btn-s" style={{ marginTop: 10 }}>
        Pourquoi ne pas contacter le vendeur en direct ?
      </Link>
    </>
  );
}
