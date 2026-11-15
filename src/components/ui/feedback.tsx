import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const badgeTones: Record<Tone, string> = {
  primary: 'bg-primary-light text-primary-strong',
  success: 'bg-success-light text-success-ink',
  warning: 'bg-warning-light text-warning-ink',
  danger: 'bg-danger-light text-danger-ink',
  neutral: 'bg-surface-muted text-ink-secondary',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', badgeTones[tone], className)}>
      {children}
    </span>
  );
}

const barTones: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-ink-faint',
};

export function ProgressBar({
  value,
  tone = 'primary',
  className,
  label,
  size = 'md',
}: {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const v = Math.min(100, Math.max(0, value || 0));
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-primary-light/70', size === 'sm' ? 'h-1.5' : 'h-2', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', barTones[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

const ringTones: Record<Tone, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  neutral: 'var(--ink-faint)',
};

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  tone = 'primary',
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  children?: ReactNode;
  label?: string;
}) {
  const v = Math.min(100, Math.max(0, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary-light)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringTones[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p className={cn('tabular mt-1 font-bold tracking-tight text-ink', emphasis ? 'text-3xl' : 'text-xl')}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-secondary">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary-strong">{icon}</div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-primary-light/60', className)} />;
}

export function Alert({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-xl px-4 py-3 text-[13px] leading-5', badgeTones[tone], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-strong">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
