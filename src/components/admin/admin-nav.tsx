'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/chapters', label: 'Chapters' },
  { href: '/admin/lectures', label: 'Lectures' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/cutoffs', label: 'Cutoffs' },
  { href: '/admin/users', label: 'Users' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="scrollbar-none -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors',
              active ? 'border-primary-strong text-primary-strong' : 'border-transparent text-ink-secondary hover:text-ink',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
