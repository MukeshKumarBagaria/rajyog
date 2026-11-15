import type { Metadata } from 'next';
import { UserPlus } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { getViewer } from '@/lib/auth/session';
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { Alert, Badge } from '@/components/ui/feedback';
import { Avatar } from '@/components/ui/avatar';
import { Field, Input, Select } from '@/components/ui/form-controls';
import { FormDialog } from '@/components/admin/form-dialog';
import { UserActiveButton } from '@/components/admin/row-actions';
import { createUserAction } from '@/actions/admin';
import { EXAM_CATEGORIES, categoryLabel } from '@/constants/app';
import { formatInTimezone } from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Users' };

export default async function AdminUsersPage() {
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, exam_category, target_exam_year, is_active, created_at').order('created_at');

  const emails = new Map<string, string>();
  const admins = new Set<string>([viewer.id]);
  const serviceRole = hasServiceRole();
  if (serviceRole) {
    const admin = createAdminClient();
    const [{ data: list }, { data: adminRows }] = await Promise.all([admin.auth.admin.listUsers({ perPage: 1000 }), admin.from('app_admins').select('user_id')]);
    list?.users.forEach((u) => u.email && emails.set(u.id, u.email));
    adminRows?.forEach((a) => admins.add(a.user_id));
  }

  return (
    <div className="space-y-4">
      {!serviceRole ? (
        <Alert tone="warning">
          Set <strong>SUPABASE_SERVICE_ROLE_KEY</strong> on the server to create or deactivate accounts. Until then you can bootstrap users with <code>npm run create-user</code>.
        </Alert>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-secondary">No public sign-up. Each aspirant gets their own private progress, mocks and goals.</p>
        {serviceRole ? (
          <FormDialog
            title="Create aspirant account"
            description="Invite by email (they set their own password) or set a temporary password to share privately."
            action={createUserAction}
            triggerLabel={<><UserPlus className="h-4 w-4" /> New account</>}
            submitLabel="Create account"
            successMessage="Account created"
          >
            <Field label="Full name" htmlFor="u-name">
              <Input id="u-name" name="full_name" required />
            </Field>
            <Field label="Email" htmlFor="u-email">
              <Input id="u-email" name="email" type="email" required autoComplete="off" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method" htmlFor="u-mode">
                <Select id="u-mode" name="mode" defaultValue="invite">
                  <option value="invite">Email invitation</option>
                  <option value="password">Temporary password</option>
                </Select>
              </Field>
              <Field label="Category" htmlFor="u-cat">
                <Select id="u-cat" name="exam_category" defaultValue="GEN">
                  {EXAM_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Temporary password" htmlFor="u-pass" hint="Only for the temporary-password method. At least 8 characters.">
              <Input id="u-pass" name="password" type="text" autoComplete="new-password" minLength={8} />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="make_admin" className="h-4 w-4 accent-[var(--primary-strong)]" /> Also make this person a content administrator
            </label>
          </FormDialog>
        ) : null}
      </div>
      <Card className="divide-y divide-line">
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar name={p.full_name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {p.full_name || 'Unnamed'} {admins.has(p.id) ? <Badge tone="primary">Admin</Badge> : null}{' '}
                {!p.is_active ? <Badge tone="danger">Inactive</Badge> : null}
              </p>
              <p className="truncate text-xs text-ink-secondary">
                {emails.get(p.id) ?? 'email hidden'} · {categoryLabel(p.exam_category)}
                {p.target_exam_year ? ` · target ${p.target_exam_year}` : ''} · joined {formatInTimezone(p.created_at, 'd MMM yyyy', viewer.timezone)}
              </p>
            </div>
            {serviceRole ? <UserActiveButton userId={p.id} active={p.is_active} isSelf={p.id === viewer.id} /> : null}
          </div>
        ))}
      </Card>
    </div>
  );
}
