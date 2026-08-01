'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { LignePanier } from '@/lib/types';

interface Ctx {
  lignes: LignePanier[];
  nbArticles: number;
  sousTotal: number;
  totalReference: number;
  ajouter: (l: LignePanier) => void;
  modifier: (annonceId: string, quantite: number) => void;
  retirer: (annonceId: string) => void;
  vider: () => void;
}

const PanierCtx = createContext<Ctx | null>(null);
const CLE = 'mpp:panier';

export function PanierProvider({ children }: { children: React.ReactNode }) {
  const [lignes, setLignes] = useState<LignePanier[]>([]);
  const [charge, setCharge] = useState(false);

  // Le panier vit dans le navigateur tant que la commande n'est pas validée.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) setLignes(JSON.parse(brut));
    } catch { /* stockage indisponible : on repart d'un panier vide */ }
    setCharge(true);
  }, []);

  useEffect(() => {
    if (!charge) return;
    try { localStorage.setItem(CLE, JSON.stringify(lignes)); } catch { /* quota dépassé */ }
  }, [lignes, charge]);

  const api = useMemo<Ctx>(() => ({
    lignes,
    nbArticles: lignes.reduce((a, l) => a + l.quantite, 0),
    sousTotal: lignes.reduce((a, l) => a + l.prix * l.quantite, 0),
    totalReference: lignes.reduce((a, l) => a + (l.prix_ref ?? l.prix) * l.quantite, 0),
    ajouter: (l) => setLignes((prev) => {
      const i = prev.findIndex((x) => x.annonce_id === l.annonce_id);
      if (i === -1) return [...prev, l];
      const copie = [...prev];
      copie[i] = { ...copie[i], quantite: Math.min(l.quantite, l.stock) };
      return copie;
    }),
    modifier: (id, q) => setLignes((prev) =>
      q <= 0 ? prev.filter((x) => x.annonce_id !== id)
             : prev.map((x) => x.annonce_id === id ? { ...x, quantite: Math.min(q, x.stock) } : x)
    ),
    retirer: (id) => setLignes((prev) => prev.filter((x) => x.annonce_id !== id)),
    vider: () => setLignes([]),
  }), [lignes]);

  return <PanierCtx.Provider value={api}>{children}</PanierCtx.Provider>;
}

export function usePanier() {
  const c = useContext(PanierCtx);
  if (!c) throw new Error('usePanier doit être utilisé dans un PanierProvider');
  return c;
}
