import { BookOpen, ChartLine, House, Timer, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { href: '/courses', label: 'Courses', icon: BookOpen, match: (p) => p.startsWith('/courses') || p.startsWith('/lecture') },
  { href: '/focus', label: 'Focus', icon: Timer, match: (p) => p.startsWith('/focus') },
  { href: '/analysis', label: 'Analysis', icon: ChartLine, match: (p) => p.startsWith('/analysis') },
];
