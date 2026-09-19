import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; tone: 'ok' | 'err' };

const ToastContext = createContext<{
  push: (message: string, tone?: 'ok' | 'err') => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const api = useMemo(
    () => ({
      push(message: string, tone: 'ok' | 'err' = 'ok') {
        const id = Date.now() + Math.random();
        setItems((prev) => [...prev, { id, message, tone }]);
        window.setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-80 flex-col gap-2 print:hidden">
        {items.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow-modal backdrop-blur ${
              t.tone === 'err'
                ? 'border-danger/40 bg-[#351719]/95 text-danger'
                : 'border-primary/30 bg-surface-high/95 text-content'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}
