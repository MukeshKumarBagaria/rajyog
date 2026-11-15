'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { lockAction } from '@/actions/auth';
import { useFocusTimer } from '@/stores/focus-timer-store';

export const ACTIVITY_EVENT = 'rajyog:activity';

/** Signals activity (e.g. while a lecture is playing) so auto-lock never interrupts studying. */
export function signalActivity() {
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

/**
 * Auto-locks the app (PIN required) after `minutes` of inactivity. Lecture
 * playback and a running focus timer count as activity.
 */
export function IdleLock({ minutes }: { minutes: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const last = useRef(0);
  const locking = useRef(false);

  useEffect(() => {
    const limit = minutes * 60_000;
    last.current = Date.now();
    const bump = () => (last.current = Date.now());
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel', ACTIVITY_EVENT];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const check = async () => {
      if (locking.current) return;
      if (useFocusTimer.getState().status === 'running') {
        bump();
        return;
      }
      if (Date.now() - last.current >= limit) {
        locking.current = true;
        await lockAction();
        router.replace(`/unlock?next=${encodeURIComponent(pathname)}`);
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(check, 15_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [minutes, pathname, router]);

  return null;
}
