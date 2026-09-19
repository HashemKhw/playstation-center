import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { api } from '../lib/api';

const items = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/sessions', label: 'Sessions', icon: 'sessions' },
  { to: '/transactions', label: 'Transactions', icon: 'transactions' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/screens', label: 'Screens', icon: 'screens' },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/pricing', label: 'Pricing', icon: 'pricing' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
] satisfies { to: string; label: string; icon: IconName }[];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/sessions': 'Sessions',
  '/transactions': 'Transactions',
  '/reports': 'Reports',
  '/screens': 'Screens',
  '/products': 'Products',
  '/pricing': 'Pricing',
  '/settings': 'Settings',
};

export function AppLayout() {
  const location = useLocation();
  const [businessName, setBusinessName] = useState('PlayStation Center');
  const basePath = `/${location.pathname.split('/')[1] ?? ''}`;
  const title = location.pathname.startsWith('/checkout')
    ? 'Checkout'
    : pageTitles[basePath] ?? 'Nexus Terminal';

  useEffect(() => {
    void api<{ settings: Record<string, string> }>('/api/settings')
      .then((result) => setBusinessName(result.settings.businessName || 'PlayStation Center'))
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex h-full bg-ink-950">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-outline-variant bg-surface md:flex print:hidden">
        <div className="flex items-center gap-3 border-b border-outline-variant px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-white">
            <Icon name="gamepad" size={22} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-tight text-primary">{businessName}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-outline">
              Local staff portal
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-secondary-container text-secondary-onContainer'
                    : 'text-content-muted hover:bg-surface-high hover:text-content'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-outline-variant p-4">
          <div className="flex items-center gap-3 rounded-lg bg-surface-high p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-highest text-primary">
              <Icon name="user" size={19} />
            </div>
            <div>
              <div className="text-sm font-semibold text-content">Local operator</div>
              <div className="text-xs text-outline">Administrator</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface/95 px-4 backdrop-blur md:px-8 print:hidden">
          <div>
            <h1 className="text-xl font-semibold text-content">{title}</h1>
            <p className="hidden text-xs text-outline sm:block">
              {new Intl.DateTimeFormat('en-JO', { dateStyle: 'full' }).format(new Date())}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label="Notifications"
              className="rounded-full p-2.5 text-content-muted transition hover:bg-surface-high hover:text-content"
            >
              <Icon name="bell" />
            </button>
            <button
              aria-label="Account"
              className="rounded-full p-2.5 text-content-muted transition hover:bg-surface-high hover:text-content"
            >
              <Icon name="user" />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-outline-variant bg-surface/95 px-1 py-1 backdrop-blur md:hidden print:hidden">
        {items.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold ${
                isActive ? 'bg-secondary-container text-secondary-onContainer' : 'text-content-muted'
              }`
            }
            end={item.to === '/'}
            to={item.to}
          >
            <Icon name={item.icon} size={19} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
