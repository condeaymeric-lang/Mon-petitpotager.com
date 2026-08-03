'use client';
import { useRouter } from 'next/navigation';
import { creerClient } from '@/lib/supabase-client';
import { useToast } from '@/components/Toast';

/** Marque d'un coup les notifications du secteur comme vues. */
export default function Marquer() {
  const router = useRouter();
  const toast = useToast();

  async function tout() {
    await Promise.all([
      creerClient().rpc('marquer_notifications_lues'),
      creerClient().rpc('marquer_remis'),
    ]);
    toast('Tout est marqué comme vu');
    router.refresh();
  }

  return (
    <button className="btn btn-s" onClick={tout} style={{ marginBottom: 16 }}>
      Tout marquer comme vu
    </button>
  );
}
