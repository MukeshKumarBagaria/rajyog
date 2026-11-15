import type { Metadata } from 'next';
import { Download, LogOut } from 'lucide-react';
import { getViewer } from '@/lib/auth/session';
import { getLockSecret } from '@/lib/auth/lock';
import { AvatarUploader, PasswordForm, PinSettings, PreferencesForm, ProfileForm } from '@/components/settings/settings-forms';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';
import { formatInTimezone } from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Settings' };

function timezoneList(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = ['Asia/Kolkata', 'UTC'];
  }
  if (!zones.includes(current)) zones = [current, ...zones];
  if (!zones.includes('Asia/Kolkata')) zones = ['Asia/Kolkata', ...zones];
  return zones;
}

export default async function SettingsPage() {
  const viewer = await getViewer();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Settings" title="Your preferences" description={`Signed in as ${viewer.email ?? viewer.displayName} · member since ${formatInTimezone(viewer.profile.created_at, 'MMMM yyyy', viewer.timezone)}`} />

      <Card className="p-5">
        <AvatarUploader userId={viewer.id} name={viewer.displayName} src={viewer.avatarSrc} />
      </Card>

      <ProfileForm profile={viewer.profile} timezones={timezoneList(viewer.timezone)} />
      <PreferencesForm settings={viewer.settings} />
      <PinSettings enabled={viewer.settings.pin_lock_enabled} available={Boolean(getLockSecret())} />
      <PasswordForm />

      <Card>
        <CardHeader icon={<Download className="h-4 w-4" />} title="Your data" description="Download everything you have recorded in Rajyog as JSON." />
        <CardContent className="flex flex-wrap gap-2">
          <a
            href="/api/export"
            className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-button)] border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary-strong"
          >
            <Download className="h-4 w-4" /> Export my data
          </a>
          <form action={signOutAction}>
            <Button type="submit" size="sm" variant="ghost">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
