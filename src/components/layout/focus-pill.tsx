'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Timer } from 'lucide-react';
import { elapsedSeconds, useFocusTimer } from '@/stores/focus-timer-store';
import { formatClock } from '@/lib/utils/format';

const subscribe = () => () => {};

/** Floating reminder of a running focus timer while on other pages. */
export function FocusPill() {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const timer = useFocusTimer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer.status]);

  if (!hydrated || pathname.startsWith('/focus') || (timer.status !== 'running' && timer.status !== 'paused')) return null;

  const elapsed = elapsedSeconds(timer, now);
  const display = timer.mode === 'countdown' ? timer.targetSeconds - elapsed : elapsed;

  return (
    <Link
      href="/focus"
      className="fixed bottom-24 right-4 z-40 inline-flex animate-rise items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-[var(--shadow-lift)] md:bottom-6 md:right-6"
      aria-label="Return to focus timer"
    >
      <span className="relative flex h-2.5 w-2.5">
        {timer.status === 'running' ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /> : null}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-strong" />
      </span>
      <Timer className="h-4 w-4 text-primary-strong" aria-hidden="true" />
      <span className="tabular">{formatClock(display)}</span>
      {timer.status === 'paused' ? <span className="text-xs text-ink-secondary">paused</span> : null}
    </Link>
  );
}
