// 线性图标：24×24 视框，1.6 描边，统一风格。仅装饰时对读屏隐藏。
const PATHS: Record<string, string> = {
  home: 'M3.5 10.5 12 3.8l8.5 6.7M5.5 9v10.2h4.8v-5.6h3.4v5.6h4.8V9',
  wallet: 'M4 7.5h14.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5.5A1.5 1.5 0 0 1 4 18.5v-12A2 2 0 0 1 6 4.5h11M15.5 13.75h2',
  bond: 'M4 19.5h16M6 16l3.5-4.5 3 2.5L18 7M18 7h-3.5M18 7v3.5',
  news: 'M5 5h11v14H6.5A1.5 1.5 0 0 1 5 17.5zM16 9h3v8.5a1.5 1.5 0 0 1-3 0M8 8.5h5M8 11.5h5M8 14.5h3',
  users: 'M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11zM3.5 19.5c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5M15.5 4.8a3.25 3.25 0 0 1 0 6M17.5 14.7c1.7.6 2.8 2.2 3 4.8',
  spark: 'M12 3.5 13.7 9l5.3 1.7-5.3 1.8L12 18l-1.7-5.5L5 10.7 10.3 9zM19 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  arrow: 'M5 12h14M13.5 6.5 19 12l-5.5 5.5',
  shield: 'M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6zM9 12l2 2 4-4.5',
  calc: 'M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5v3M8.5 17.5h.01M12 17.5h.01',
  source: 'M7 4.5h7.5L18 8v11.5H7zM14 4.5V8h4M9.5 12h6M9.5 15h6',
  people: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 20c.6-3.6 3.1-5.5 6.5-5.5s5.9 1.9 6.5 5.5',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2',
  lock: 'M6.5 10.5h11v9h-11zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5M12 8h.01',
  exchange: 'M4.5 8.5h13l-3.5-3.5M19.5 15.5h-13l3.5 3.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** 品牌标记：一杆衡器，金色支点 */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#1d4d42" />
      <path d="M7 11.5h18M16 11.5V24M11 24h10" stroke="#f3efe4" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M7 11.5l-2.5 5.5h5zM25 11.5l-2.5 5.5h5z" fill="none" stroke="#f3efe4" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="16" cy="8" r="2" fill="#d9b86a" />
    </svg>
  );
}
