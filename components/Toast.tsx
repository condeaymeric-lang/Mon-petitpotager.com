'use client';
import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2700);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={`toast${msg ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>
    </Ctx.Provider>
  );
}
