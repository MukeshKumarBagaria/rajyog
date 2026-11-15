import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/session';
import { AdminNav } from '@/components/admin/admin-nav';
import { PageHeader } from '@/components/ui/feedback';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin · Rajyog' } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow="Owner only" title="Content administration" description="Shared content visible to every aspirant. Personal data is never visible here." />
      <AdminNav />
      {children}
    </>
  );
}
