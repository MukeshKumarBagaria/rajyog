'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, Settings, Shield } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './nav-items';

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const secondary = [
    { href: '/library', label: 'Bookmarks & notes', icon: Library },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ href: '/admin', label: 'Content admin', icon: Shield }] : []),
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line bg-surface/80 px-4 py-6 backdrop-blur md:flex">
      <Link href="/" className="mb-8 px-2" aria-label="Rajyog home">
        <Logo />
      </Link>
      <nav aria-label="Primary" className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150',
                active ? 'bg-primary-light text-primary-strong' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-1 border-t border-line pt-4">
        {secondary.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                active ? 'bg-primary-light text-primary-strong' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
