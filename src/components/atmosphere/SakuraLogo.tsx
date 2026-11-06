import { cn } from '@/lib/utils';

interface FoxMarkProps {
  className?: string;
  glow?: boolean;
}

/** Hand-drawn kitsune mask emblem — original SVG, no external asset. */
export function FoxMark({ className, glow = true }: FoxMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-8', glow && 'drop-shadow-[0_0_14px_rgba(var(--accent-rgb),0.65)]', className)}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id="fox-stroke" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--petal-a)" />
          <stop offset="0.55" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <g stroke="url(#fox-stroke)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 20.5 L12 6 C12 6 22.5 8.6 27.4 14.2" />
        <path d="M49 20.5 L52 6 C52 6 41.5 8.6 36.6 14.2" />
        <path d="M15 20 C11.5 26 10.5 34 12.5 40.5 C15 48.5 22 55 32 57.5 C42 55 49 48.5 51.5 40.5 C53.5 34 52.5 26 49 20" />
        <path d="M32 20 C36.5 20 41 22 43 25.2 C45.4 29 44.6 34.6 41.4 38.6 C38.6 42.2 35.2 44.6 32 46" />
        <path d="M32 20 C27.5 20 23 22 21 25.2 C18.6 29 19.4 34.6 22.6 38.6 C25.4 42.2 28.8 44.6 32 46" />
        <path d="M22.6 30.6 C24.8 29 28 29.3 29.6 31.4 C27.6 33.2 24.4 33.1 22.6 30.6 Z" fill="url(#fox-stroke)" strokeWidth="1.2" />
        <path d="M41.4 30.6 C39.2 29 36 29.3 34.4 31.4 C36.4 33.2 39.6 33.1 41.4 30.6 Z" fill="url(#fox-stroke)" strokeWidth="1.2" />
        <path d="M32 39.4 C33.9 39.4 35.4 40.6 35.4 42.1 C35.4 43.9 33.8 45.4 32 46.6 C30.2 45.4 28.6 43.9 28.6 42.1 C28.6 40.6 30.1 39.4 32 39.4 Z" fill="url(#fox-stroke)" strokeWidth="1" />
        <path d="M17 44 C19.4 45.4 21.4 45.8 23.6 45.4" strokeWidth="1.2" opacity="0.75" />
        <path d="M47 44 C44.6 45.4 42.6 45.8 40.4 45.4" strokeWidth="1.2" opacity="0.75" />
        <path d="M29.4 19.8 C30.6 18.4 33.4 18.4 34.6 19.8" strokeWidth="1.2" opacity="0.8" />
      </g>
    </svg>
  );
}

interface SakuraLogoProps {
  className?: string;
  compact?: boolean;
  jp?: string;
}

export function SakuraLogo({ className, compact = false, jp = 'ヒロ・セガワ' }: SakuraLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--hairline)] bg-[image:linear-gradient(150deg,rgba(var(--accent-rgb),0.22),rgba(10,4,18,0.7))]">
        <span
          className="absolute inset-0 rounded-2xl opacity-70 blur-md"
          style={{ background: 'radial-gradient(circle at 30% 20%, var(--accent-soft), transparent 70%)' }}
          aria-hidden
        />
        <FoxMark className="relative size-7" />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="logo-wordmark block truncate text-[15px] leading-none">HIRO SEGAWA</span>
          <span className="jp mt-1 block truncate text-[9px] tracking-[0.34em] text-mist/70">{jp}</span>
        </span>
      )}
    </div>
  );
}
