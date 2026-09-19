import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary:
    'border border-primary-container bg-primary-container text-white hover:border-primary hover:bg-primary-container/85 disabled:border-outline-variant disabled:bg-surface-highest disabled:text-outline',
  secondary:
    'border border-outline-variant bg-surface-high text-content hover:border-outline hover:bg-surface-highest disabled:text-outline',
  danger:
    'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20',
  ghost:
    'border border-transparent bg-transparent text-content-muted hover:bg-surface-high hover:text-content',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
