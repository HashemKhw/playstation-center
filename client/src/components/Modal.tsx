import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({
  title,
  children,
  onClose,
  size = 'md',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
}) {
  const width = size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-outline-variant bg-surface shadow-modal ${width}`}
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-low px-6 py-5">
          <h2 className="text-xl font-semibold text-content" id="dialog-title">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="rounded-full p-2 text-content-muted transition hover:bg-surface-high hover:text-content"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
