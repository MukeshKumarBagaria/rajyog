'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form-controls';
import { ProgressRing } from '@/components/ui/feedback';
import { STOPWATCH_MAX_SECONDS, elapsedSeconds, useFocusTimer, type TimerMode } from '@/stores/focus-timer-store';
import { saveFocusSessionAction } from '@/actions/study';
import { toast } from '@/stores/toast-store';
import { STUDY_TYPES, TIMER_PRESETS } from '@/constants/app';
import { formatClock, formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { SubjectOption } from '@/services/subject.service';

const subscribe = () => () => {};

function chime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.65);
    });
  } catch {
    /* audio unavailable */
  }
}

export function FocusTimer({ subjects, notificationsEnabled }: { subjects: SubjectOption[]; notificationsEnabled: boolean }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const timer = useFocusTimer();
  const [now, setNow] = useState(() => Date.now());
  const [custom, setCustom] = useState('60');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const elapsed = hydrated ? elapsedSeconds(timer, now) : 0;
  const isCountdown = timer.mode === 'countdown';
  const remaining = Math.max(0, timer.targetSeconds - elapsed);
  const display = isCountdown ? remaining : elapsed;
  const ringValue = isCountdown ? (elapsed / timer.targetSeconds) * 100 : ((elapsed % 3600) / 3600) * 100;
  const active = timer.status === 'running' || timer.status === 'paused';

  useEffect(() => {
    if (timer.status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer.status]);

  useEffect(() => {
    if (!hydrated || timer.status !== 'running') return;
    document.title = `${formatClock(display)} · Focus`;
    return () => {
      document.title = 'Focus · Rajyog';
    };
  }, [display, hydrated, timer.status]);

  /** Persists the session (idempotent by client id) and resets the timer. */
  const save = useCallback(
    async (completed: boolean) => {
      if (savingRef.current) return;
      const s = useFocusTimer.getState();
      if (!s.sessionStartedAt || !s.sessionId) return s.reset();

      const nowMs = Date.now();
      const seconds = Math.floor(elapsedSeconds(s, nowMs));
      // A countdown that finished while the tab was away ended when it hit zero.
      const endMs =
        s.mode === 'countdown' && s.runStartedAt && seconds >= s.targetSeconds
          ? Math.min(nowMs, s.runStartedAt + (s.targetSeconds * 1000 - s.accumulatedMs))
          : nowMs;

      if (seconds < 60) {
        s.reset();
        toast.info('Session discarded', 'Sessions shorter than a minute are not saved.');
        return;
      }

      savingRef.current = true;
      setSaving(true);
      s.finish();
      const res = await saveFocusSessionAction({
        id: s.sessionId,
        session_type: s.mode === 'countdown' ? 'POMODORO' : 'MANUAL',
        subject_id: s.subjectId,
        study_type: s.studyType,
        start: s.sessionStartedAt,
        end: new Date(endMs).toISOString(),
        duration_seconds: seconds,
      });
      savingRef.current = false;
      setSaving(false);

      if (res.ok) {
        useFocusTimer.getState().reset();
        toast.success(completed ? 'Session complete — well done!' : 'Session saved', `${formatDuration(seconds)} added to today.`);
        if (completed) {
          chime();
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Focus session complete', { body: `${formatDuration(seconds)} of focused study recorded.`, icon: '/icons/icon-192.png' });
          }
        }
        router.refresh();
      } else {
        toast.error('Could not save session', res.error);
      }
    },
    [notificationsEnabled, router],
  );

  // Auto-complete countdowns (also after returning to a backgrounded tab).
  useEffect(() => {
    if (!hydrated) return;
    let completed: boolean | null = null;
    if (timer.status === 'running' && isCountdown && elapsed >= timer.targetSeconds) completed = true;
    else if (timer.status === 'running' && !isCountdown && elapsed >= STOPWATCH_MAX_SECONDS) completed = false;
    else if (timer.status === 'finished' && !savingRef.current) completed = isCountdown;
    if (completed === null) return;
    const id = window.setTimeout(() => void save(completed), 0);
    return () => window.clearTimeout(id);
  }, [elapsed, hydrated, isCountdown, save, timer.status, timer.targetSeconds]);

  const choose = (mode: TimerMode, minutes: number) => timer.configure(mode, Math.round(minutes * 60));

  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Timer mode">
        {TIMER_PRESETS.map((m) => (
          <ModeChip key={m} active={isCountdown && timer.targetSeconds === m * 60} disabled={active} onClick={() => choose('countdown', m)}>
            {m} min
          </ModeChip>
        ))}
        <ModeChip
          active={isCountdown && !TIMER_PRESETS.some((m) => m * 60 === timer.targetSeconds)}
          disabled={active}
          onClick={() => choose('countdown', Math.min(240, Math.max(5, Number(custom) || 60)))}
        >
          Custom
        </ModeChip>
        <ModeChip active={!isCountdown} disabled={active} onClick={() => choose('stopwatch', 0)}>
          Stopwatch
        </ModeChip>
      </div>

      {isCountdown && !TIMER_PRESETS.some((m) => m * 60 === timer.targetSeconds) && !active ? (
        <div className="mx-auto mb-5 flex max-w-[220px] items-center gap-2">
          <label htmlFor="custom-minutes" className="text-xs font-semibold text-ink-secondary">
            Minutes
          </label>
          <Input
            id="custom-minutes"
            type="number"
            min={5}
            max={240}
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              const v = Number(e.target.value);
              if (v >= 5 && v <= 240) choose('countdown', v);
            }}
            className="h-9 text-center"
          />
        </div>
      ) : null}

      <div className="flex justify-center">
        <ProgressRing value={hydrated ? ringValue : 0} size={248} stroke={12} tone={timer.status === 'paused' ? 'warning' : 'primary'} label="Focus timer progress">
          <span className="tabular text-5xl font-bold tracking-tight text-ink" aria-live="off">
            {hydrated ? formatClock(display) : '--:--'}
          </span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {timer.status === 'running' ? 'Focusing' : timer.status === 'paused' ? 'Paused' : isCountdown ? 'Ready' : 'Stopwatch'}
          </span>
        </ProgressRing>
      </div>

      <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
        <Field label="Subject" htmlFor="focus-subject">
          <Select id="focus-subject" value={timer.subjectId ?? ''} onChange={(e) => timer.setSubject(e.target.value || null)} disabled={saving}>
            <option value="">General study</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Study type" htmlFor="focus-type">
          <Select id="focus-type" value={timer.studyType} onChange={(e) => timer.setStudyType(e.target.value)} disabled={saving}>
            {STUDY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {!hydrated ? null : timer.status === 'idle' ? (
          <Button size="lg" onClick={timer.start} className="min-w-40">
            <Play className="h-5 w-5" /> Start focus
          </Button>
        ) : (
          <>
            {timer.status === 'running' ? (
              <Button size="lg" variant="secondary" onClick={timer.pause} className="min-w-32">
                <Pause className="h-5 w-5" /> Pause
              </Button>
            ) : timer.status === 'paused' ? (
              <Button size="lg" onClick={timer.resume} className="min-w-32">
                <Play className="h-5 w-5" /> Resume
              </Button>
            ) : null}
            <Button size="lg" variant="outline" loading={saving} onClick={() => void save(false)}>
              <Square className="h-4 w-4" /> Stop & save
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Discard session"
              title="Discard session"
              disabled={saving}
              onClick={() => {
                timer.reset();
                toast.info('Session discarded');
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-ink-secondary">
        {timer.status === 'idle'
          ? 'For books, notes and offline practice. Lecture time is tracked automatically.'
          : 'The timer keeps running if you switch pages or refresh.'}
      </p>
    </Card>
  );
}

function ModeChip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed',
        active ? 'bg-primary-strong text-primary-foreground' : 'bg-surface-muted text-ink-secondary hover:text-ink disabled:opacity-50',
      )}
    >
      {children}
    </button>
  );
}
