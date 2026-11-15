'use client';

import { useEffect } from 'react';
import type { ThemePreference } from '@/types/database';

export function applyTheme(theme: ThemePreference) {
  try {
    localStorage.setItem('rj-theme', theme);
  } catch {
    /* storage unavailable */
  }
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** Keeps <html data-theme> in sync with the user's saved preference. */
export function ThemeSync({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
  return null;
}
