'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, KeyRound, LockKeyhole, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Switch } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/feedback';
import { Avatar } from '@/components/ui/avatar';
import { SubmitButton } from '@/components/ui/submit-button';
import { applyTheme } from '@/components/layout/theme-sync';
import { disablePinAction, setPinAction, updateAvatarAction, updatePreferencesAction, updateProfileAction } from '@/actions/settings';
import { updatePasswordAction } from '@/actions/auth';
import { initialFormState } from '@/actions/types';
import { createClient } from '@/lib/supabase/client';
import { EXAM_CATEGORIES } from '@/constants/app';
import { toast } from '@/stores/toast-store';
import type { ProfileRow, ThemePreference, UserSettingsRow } from '@/types/database';

export function ProfileForm({ profile, timezones }: { profile: ProfileRow; timezones: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();

  return (
    <Card>
      <CardHeader title="Profile" description="Used for cutoff comparison, goals and day boundaries." />
      <CardContent>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await updateProfileAction({
                full_name: String(fd.get('full_name') ?? ''),
                exam_category: String(fd.get('exam_category') ?? 'GEN'),
                target_exam_year: (fd.get('target_exam_year') as string) || '',
                timezone: String(fd.get('timezone') ?? 'Asia/Kolkata'),
                daily_target_minutes: Number(fd.get('daily_hours') ?? 0) * 60 + Number(fd.get('daily_minutes') ?? 0),
                language: (fd.get('language') as 'en' | 'hi') ?? 'en',
              });
              if (!res.ok) return void setError(res.error);
              setError(null);
              toast.success('Profile saved');
              router.refresh();
            });
          }}
        >
          <Field label="Display name" htmlFor="full_name" className="sm:col-span-2">
            <Input id="full_name" name="full_name" required maxLength={120} defaultValue={profile.full_name ?? ''} autoComplete="name" />
          </Field>
          <Field label="Exam category" htmlFor="exam_category" hint="Mocks are compared only with cutoffs of this category.">
            <Select id="exam_category" name="exam_category" defaultValue={profile.exam_category}>
              {EXAM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target RAS exam year" htmlFor="target_exam_year">
            <Select id="target_exam_year" name="target_exam_year" defaultValue={profile.target_exam_year ?? ''}>
              <option value="">Not decided</option>
              {Array.from({ length: 6 }, (_, i) => year + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">Default daily study target</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="daily_hours">
                Hours
              </label>
              <div className="relative">
                <Input id="daily_hours" name="daily_hours" type="number" min={0} max={24} defaultValue={Math.floor(profile.daily_target_minutes / 60)} className="pr-8" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">h</span>
              </div>
              <label className="sr-only" htmlFor="daily_minutes">
                Minutes
              </label>
              <div className="relative">
                <Input id="daily_minutes" name="daily_minutes" type="number" min={0} max={59} step={5} defaultValue={profile.daily_target_minutes % 60} className="pr-8" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">m</span>
              </div>
            </div>
          </div>
          <Field label="Timezone" htmlFor="timezone" hint="Decides which day a late-night session belongs to.">
            <Select id="timezone" name="timezone" defaultValue={profile.timezone}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Interface language" htmlFor="language">
            <Select id="language" name="language" defaultValue={profile.language}>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </Select>
          </Field>
          {error ? (
            <Alert tone="danger" className="sm:col-span-2">
              {error}
            </Alert>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={pending}>
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PreferencesForm({ settings }: { settings: UserSettingsRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<ThemePreference>(settings.theme);
  const [notify, setNotify] = useState(settings.notification_enabled);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="Preferences" />
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const num = (k: string) => {
              const v = fd.get(k);
              return v === '' || v === null ? null : Number(v);
            };
            start(async () => {
              const res = await updatePreferencesAction({
                theme,
                preferred_language: fd.get('preferred_language') as 'en' | 'hi' | 'both',
                notification_enabled: notify,
                auto_lock_minutes: Number(fd.get('auto_lock_minutes')),
                streak_min_minutes: Number(fd.get('streak_min_minutes')),
                prelims_target_percent: num('prelims_target_percent'),
                mains_target_percent: num('mains_target_percent'),
              });
              if (!res.ok) return void setError(res.error);
              setError(null);
              toast.success('Preferences saved');
              router.refresh();
            });
          }}
        >
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ink">Theme</legend>
            <div className="inline-flex rounded-full bg-surface-muted p-1">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => {
                    setTheme(t);
                    applyTheme(t);
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${theme === t ? 'bg-surface text-ink shadow-[var(--shadow-soft)]' : 'text-ink-secondary'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Daily motivation language" htmlFor="preferred_language">
              <Select id="preferred_language" name="preferred_language" defaultValue={settings.preferred_language}>
                <option value="both">Hindi, Rajasthani & English</option>
                <option value="hi">Hindi & Rajasthani</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label="Streak minimum (minutes/day)" htmlFor="streak_min_minutes" hint="Verified study needed for a day to count.">
              <Input id="streak_min_minutes" name="streak_min_minutes" type="number" min={5} max={600} defaultValue={settings.streak_min_minutes} />
            </Field>
            <Field label="Personal Prelims target (%)" htmlFor="prelims_target_percent" hint="Used only when no official cutoff exists for your category.">
              <Input id="prelims_target_percent" name="prelims_target_percent" type="number" min={1} max={100} step="0.1" defaultValue={settings.prelims_target_percent ?? ''} />
            </Field>
            <Field label="Personal Mains target (%)" htmlFor="mains_target_percent">
              <Input id="mains_target_percent" name="mains_target_percent" type="number" min={1} max={100} step="0.1" defaultValue={settings.mains_target_percent ?? ''} />
            </Field>
            <Field label="Auto-lock after (minutes idle)" htmlFor="auto_lock_minutes" hint="Applies when the PIN lock is on.">
              <Input id="auto_lock_minutes" name="auto_lock_minutes" type="number" min={1} max={240} defaultValue={settings.auto_lock_minutes} />
            </Field>
          </div>

          <Switch
            checked={notify}
            label="Focus-timer notifications"
            description="A gentle browser notification when a focus session completes."
            onChange={async (v) => {
              if (v && 'Notification' in window && Notification.permission !== 'granted') {
                const p = await Notification.requestPermission();
                if (p !== 'granted') return void toast.error('Notifications are blocked in this browser.');
              }
              setNotify(v);
            }}
          />

          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Save preferences
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AvatarUploader({ userId, name, src }: { userId: string; name: string; src: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return void toast.error('Use a PNG, JPEG or WebP image.');
      if (file.size > 2 * 1024 * 1024) return void toast.error('Image must be under 2 MB.');
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await createClient().storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type });
      if (error) return void toast.error('Upload failed', error.message);
      const res = await updateAvatarAction(path);
      if (!res.ok) return void toast.error(res.error);
      toast.success('Profile picture updated');
      router.refresh();
    });

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={src} size={64} />
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Upload profile picture"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = '';
          }}
        />
        <Button size="sm" variant="outline" loading={pending} onClick={() => input.current?.click()}>
          <Camera className="h-4 w-4" /> {src ? 'Change photo' : 'Add photo'}
        </Button>
        {src ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await updateAvatarAction(null);
                if (!res.ok) return void toast.error(res.error);
                router.refresh();
              })
            }
          >
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function PinSettings({ enabled, available }: { enabled: boolean; available: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  return (
    <Card>
      <CardHeader icon={<LockKeyhole className="h-4 w-4" />} title="App PIN lock" description="An extra 6-digit lock on top of your password — handy on a shared device." />
      <CardContent className="space-y-4">
        {!available ? <Alert tone="warning">PIN lock is unavailable until APP_LOCK_SECRET is configured on the server.</Alert> : null}
        <p className="text-[13px] text-ink-secondary">
          Status: <span className="font-semibold text-ink">{enabled ? 'On' : 'Off'}</span>. Forgot your PIN? Sign out and sign in with your password.
        </p>
        {editing ? (
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await setPinAction(pin, confirm);
                if (!res.ok) return void setError(res.error);
                setError(null);
                setEditing(false);
                setPin('');
                setConfirm('');
                toast.success('PIN saved', 'The app locks after the idle time you chose.');
                router.refresh();
              });
            }}
          >
            <Field label="New PIN" htmlFor="pin-new">
              <Input id="pin-new" type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(e) => setPin(digits(e.target.value))} className="tracking-[0.4em]" />
            </Field>
            <Field label="Confirm PIN" htmlFor="pin-confirm">
              <Input id="pin-confirm" type="password" inputMode="numeric" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} className="tracking-[0.4em]" />
            </Field>
            {error ? (
              <Alert tone="danger" className="sm:col-span-2">
                {error}
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={pin.length !== 6 || confirm.length !== 6}>
                Save PIN
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={enabled ? 'outline' : 'primary'} disabled={!available} onClick={() => setEditing(true)}>
              <KeyRound className="h-4 w-4" /> {enabled ? 'Change PIN' : 'Set up PIN'}
            </Button>
            {enabled ? (
              <Button
                size="sm"
                variant="danger"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await disablePinAction();
                    if (!res.ok) return void toast.error(res.error);
                    toast.success('PIN lock turned off');
                    router.refresh();
                  })
                }
              >
                Turn off
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialFormState);
  return (
    <Card>
      <CardHeader icon={<KeyRound className="h-4 w-4" />} title="Password" description="Use at least 8 characters." />
      <CardContent>
        <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="New password" htmlFor="pw-new" error={state.fieldErrors?.password?.[0]}>
            <Input id="pw-new" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Confirm password" htmlFor="pw-confirm" error={state.fieldErrors?.confirm?.[0]}>
            <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          {state.error && !state.fieldErrors ? (
            <Alert tone="danger" className="sm:col-span-2">
              {state.error}
            </Alert>
          ) : null}
          {state.ok ? (
            <Alert tone="success" className="sm:col-span-2">
              {state.message}
            </Alert>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton pendingText="Updating…">Update password</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
