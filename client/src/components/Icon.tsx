import type { SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'sessions'
  | 'transactions'
  | 'reports'
  | 'screens'
  | 'products'
  | 'pricing'
  | 'settings'
  | 'search'
  | 'bell'
  | 'user'
  | 'gamepad'
  | 'timer'
  | 'plus'
  | 'minus'
  | 'pause'
  | 'play'
  | 'checkout'
  | 'close'
  | 'calendar'
  | 'wallet'
  | 'food'
  | 'water'
  | 'coffee'
  | 'bolt'
  | 'edit'
  | 'trash'
  | 'download'
  | 'upload'
  | 'chevronDown';

const paths: Record<IconName, string[]> = {
  dashboard: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  sessions: ['M8 5v14l11-7z'],
  transactions: ['M6 2h12v20l-3-2-3 2-3-2-3 2z', 'M9 7h6', 'M9 11h6', 'M9 15h4'],
  reports: ['M4 19V9', 'M10 19V5', 'M16 19v-7', 'M22 19H2'],
  screens: ['M3 4h18v13H3z', 'M8 21h8', 'M12 17v4'],
  products: ['M4 7h16l-1 14H5z', 'M8 7a4 4 0 0 1 8 0'],
  pricing: ['M20 13 13 20 4 11V4h7z', 'M8.5 8.5h.01'],
  settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 3.46-.08-.03a1.7 1.7 0 0 0-1.8.24l-.64.37a1.7 1.7 0 0 0-.82 1.7V22h-4v-.08a1.7 1.7 0 0 0-.82-1.7L9 19.85a1.7 1.7 0 0 0-1.8-.24l-.08.03-2-3.46.06-.06A1.7 1.7 0 0 0 5.52 15v-.74a1.7 1.7 0 0 0-1-1.55L4.44 12l2-3.46.08.03a1.7 1.7 0 0 0 1.8-.24L9 7.96a1.7 1.7 0 0 0 .82-1.7V6h4v.26a1.7 1.7 0 0 0 .82 1.7l.64.37a1.7 1.7 0 0 0 1.8.24l.08-.03 2 3.46-.06.06a1.7 1.7 0 0 0-.34 1.88z'],
  search: ['m21 21-4.35-4.35', 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  user: ['M20 21a8 8 0 0 0-16 0', 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  gamepad: ['M6 8h12a4 4 0 0 1 3.8 5.2l-1.4 4.2a2 2 0 0 1-3.2.9L15 16H9l-2.2 2.3a2 2 0 0 1-3.2-.9l-1.4-4.2A4 4 0 0 1 6 8z', 'M7 12v4', 'M5 14h4', 'M16.5 13h.01', 'M18.5 15h.01'],
  timer: ['M10 2h4', 'M12 14v-4', 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  pause: ['M8 5v14', 'M16 5v14'],
  play: ['M8 5v14l11-7z'],
  checkout: ['M3 3h2l2.4 11h9.8l2-8H6', 'M9 20h.01', 'M17 20h.01'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  calendar: ['M3 5h18v16H3z', 'M8 3v4', 'M16 3v4', 'M3 10h18'],
  wallet: ['M3 6h18v14H3z', 'M3 6l3-3h12v3', 'M16 12h5'],
  food: ['M7 3v8', 'M4 3v5a3 3 0 0 0 6 0V3', 'M7 11v10', 'M17 3v18', 'M17 3a4 7 0 0 1 0 12'],
  water: ['M12 2S6 9 6 14a6 6 0 0 0 12 0c0-5-6-12-6-12z'],
  coffee: ['M4 8h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z', 'M17 10h2a3 3 0 0 1 0 6h-2', 'M7 3v2', 'M11 3v2'],
  bolt: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 15H6L5 6', 'M10 11v6', 'M14 11v6'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
  upload: ['M12 21V9', 'm7 14 5-5 5 5', 'M5 3h14'],
  chevronDown: ['m6 9 6 6 6-6'],
};

export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name].map((path, index) => (
        <path
          key={index}
          d={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );
}
