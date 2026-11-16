import Link from 'next/link';
import { BookOpen, Layers, ListVideo, Quote, Scale, Users } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { hasServiceRole } from '@/lib/supabase/admin';

export default async function AdminOverviewPage() {
  const supabase = await getSupabase();
  const count = async (table: 'subjects' | 'chapters' | 'lectures' | 'motivational_quotes' | 'historical_cutoffs' | 'profiles') =>
    (await supabase.from(table).select('*', { count: 'exact', head: true })).count ?? 0;
  const [subjects, chapters, lectures, quotes, cutoffs, users] = await Promise.all([
    count('subjects'),
    count('chapters'),
    count('lectures'),
    count('motivational_quotes'),
    count('historical_cutoffs'),
    count('profiles'),
  ]);

  const tiles = [
    { href: '/admin/subjects', label: 'Subjects', value: subjects, icon: BookOpen },
    { href: '/admin/chapters', label: 'Chapters', value: chapters, icon: Layers },
    { href: '/admin/lectures', label: 'Lectures', value: lectures, icon: ListVideo },
    { href: '/admin/quotes', label: 'Motivation', value: quotes, icon: Quote },
    { href: '/admin/cutoffs', label: 'Cutoffs', value: cutoffs, icon: Scale },
    { href: '/admin/users', label: 'Aspirants', value: users, icon: Users },
  ];

  return (
    <div className="space-y-5">
      {!hasServiceRole() ? (
        <Alert tone="warning">
          <strong>SUPABASE_SECRET_KEY</strong> is not set on the server, so creating or deactivating accounts is unavailable. Content management works normally.
        </Alert>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>
              <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary-strong">
                  <t.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="tabular block text-xl font-bold text-ink">{t.value}</span>
                  <span className="text-xs text-ink-secondary">{t.label}</span>
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Card className="p-5 text-[13px] leading-6 text-ink-secondary">
        <p className="mb-2 font-semibold text-ink">Workflow</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Adjust subjects and chapters to the current RPSC syllabus.</li>
          <li>Add lectures one by one, or paste a whole playlist with bulk import on the Lectures tab.</li>
          <li>Record official cutoffs with their source link — readiness compares against them.</li>
          <li>Create accounts for aspirants from the Users tab. Their progress stays private.</li>
        </ol>
      </Card>
    </div>
  );
}
