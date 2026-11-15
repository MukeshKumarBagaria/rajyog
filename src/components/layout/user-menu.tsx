'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Library, LogOut, Settings, Shield } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { signOutAction } from '@/actions/auth';

export function UserMenu({
  name,
  email,
  avatarSrc,
  isAdmin,
}: {
  name: string;
  email: string | null;
  avatarSrc: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-primary-light';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full transition-shadow hover:shadow-[var(--shadow-soft)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <Avatar name={name} src={avatarSrc} size={38} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-60 animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            {email ? <p className="truncate text-xs text-ink-secondary">{email}</p> : null}
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/settings" className={item} onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4 text-ink-secondary" /> Settings
          </Link>
          <Link role="menuitem" href="/library" className={item} onClick={() => setOpen(false)}>
            <Library className="h-4 w-4 text-ink-secondary" /> Bookmarks & notes
          </Link>
          {isAdmin ? (
            <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}>
              <Shield className="h-4 w-4 text-ink-secondary" /> Content admin
            </Link>
          ) : null}
          <div className="my-1 h-px bg-line" />
          <form action={signOutAction}>
            <button role="menuitem" type="submit" className={`${item} text-danger-ink`}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
