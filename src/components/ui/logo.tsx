import { cn } from '@/lib/utils/cn';

/** Rajyog mark: a jharokha (Rajasthani arched window) framing a rising sun. */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--primary-strong)" />
      <path
        d="M14 38V22c0-6 4.5-11 10-13 5.5 2 10 7 10 13v16"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 38h26" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="28" r="4.2" fill="var(--secondary)" />
      <path d="M24 19.5v2M17.5 25.5l1.6 1M30.5 25.5l-1.6 1" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact ? (
        <span className="leading-none">
          <span className="block text-[17px] font-bold tracking-tight text-ink">Rajyog</span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">RAS preparation</span>
        </span>
      ) : null}
    </span>
  );
}
