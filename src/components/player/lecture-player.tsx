'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CircleCheckBig, Info, RotateCcw, Rewind, FastForward, TriangleAlert, Timer } from 'lucide-react';
import { useLectureTracking } from '@/hooks/use-lecture-tracking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { formatClock } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Segment } from '@/lib/tracking/segments';
import type { LectureStatus } from '@/types/database';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export type LecturePlayerProps = {
  lectureId: string;
  videoId: string;
  title: string;
  durationSeconds: number | null;
  threshold: number;
  initialSegments: Segment[];
  initialPosition: number;
  initialStatus: LectureStatus;
  initialPercent: number;
  next: { id: string; title: string; chapterTitle: string | null } | null;
};

export function LecturePlayer(props: LecturePlayerProps) {
  const {
    containerRef,
    ready,
    error,
    isPlaying,
    ended,
    rate,
    rates,
    currentTime,
    duration,
    segments,
    percent,
    status,
    saving,
    timerRunning,
    setRate,
    seekBy,
    seekTo,
  } = useLectureTracking({
    lectureId: props.lectureId,
    videoId: props.videoId,
    durationSeconds: props.durationSeconds,
    threshold: props.threshold,
    initialSegments: props.initialSegments,
    initialPosition: props.initialPosition,
    initialStatus: props.initialStatus,
    initialPercent: props.initialPercent,
  });
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const showResume = !resumeDismissed && props.initialPosition > 5 && ready && !isPlaying && currentTime > 5;
  const thresholdPct = Math.round(props.threshold * 100);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[#1b1418] shadow-[var(--shadow-lift)]">
        <div className="relative aspect-video w-full">
          <div ref={containerRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
          {!ready && !error ? (
            <div className="absolute inset-0 flex items-center justify-center" aria-live="polite">
              <div className="flex flex-col items-center gap-3 text-sm text-white/70">
                <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white/80" aria-hidden="true" />
                Loading lecture…
              </div>
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <TriangleAlert className="h-8 w-8 text-warning" aria-hidden="true" />
              <p className="max-w-sm text-sm">{error}</p>
            </div>
          ) : null}
        </div>
      </div>

      {showResume ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-light px-4 py-2.5 text-[13px] text-primary-strong">
          <span className="inline-flex items-center gap-2 font-medium">
            <Info className="h-4 w-4" aria-hidden="true" /> Resuming from {formatClock(props.initialPosition)}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
            onClick={() => {
              seekTo(0);
              setResumeDismissed(true);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start over
          </button>
        </div>
      ) : null}

      {timerRunning ? (
        <div className="flex items-start gap-2 rounded-xl bg-warning-light px-4 py-2.5 text-[13px] text-warning-ink" role="status">
          <Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Your focus timer is running, so it is already counting this time. Lecture coverage is still tracked; video study time is paused to avoid double counting.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => seekBy(-10)} disabled={!ready} aria-label="Back 10 seconds">
            <Rewind className="h-4 w-4" /> 10s
          </Button>
          <Button size="sm" variant="outline" onClick={() => seekBy(10)} disabled={!ready} aria-label="Forward 10 seconds">
            10s <FastForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.filter((s) => rates.length <= 1 || rates.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              disabled={!ready}
              onClick={() => setRate(s)}
              aria-pressed={rate === s}
              className={cn(
                'tabular rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
                rate === s ? 'bg-primary-strong text-primary-foreground' : 'text-ink-secondary hover:bg-primary-light hover:text-primary-strong',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <CoverageCard
        segments={segments}
        duration={duration}
        percent={percent}
        status={status}
        thresholdPct={thresholdPct}
        currentTime={currentTime}
        saving={saving}
      />

      {ended || status === 'COMPLETED' ? (
        props.next ? (
          <Link
            href={`/lecture/${props.next.id}`}
            className="group flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
                Up next{props.next.chapterTitle ? ` · ${props.next.chapterTitle}` : ''}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">{props.next.title}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-primary-strong transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ) : ended ? (
          <p className="rounded-xl bg-success-light px-4 py-3 text-[13px] font-medium text-success-ink">
            You reached the end of this subject’s lectures. Well done — time for revision!
          </p>
        ) : null
      ) : null}
    </div>
  );
}

function CoverageCard({
  segments,
  duration,
  percent,
  status,
  thresholdPct,
  currentTime,
  saving,
}: {
  segments: Segment[];
  duration: number;
  percent: number;
  status: LectureStatus;
  thresholdPct: number;
  currentTime: number;
  saving: 'idle' | 'saving' | 'saved' | 'offline';
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink">Your coverage</p>
          {status === 'COMPLETED' ? (
            <Badge tone="success">
              <CircleCheckBig className="h-3 w-3" aria-hidden="true" /> Completed
            </Badge>
          ) : status === 'IN_PROGRESS' ? (
            <Badge tone="primary">In progress</Badge>
          ) : (
            <Badge>Not started</Badge>
          )}
        </div>
        <span className="tabular text-sm font-bold text-ink">{Math.round(percent)}%</span>
      </div>

      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-primary-light/70"
        role="img"
        aria-label={`Watched ${Math.round(percent)}% of the lecture`}
      >
        {duration > 0
          ? segments.map(([s, e], i) => (
              <span
                key={i}
                className={cn('absolute inset-y-0 rounded-full', status === 'COMPLETED' ? 'bg-success' : 'bg-primary')}
                style={{ left: `${(s / duration) * 100}%`, width: `${Math.max(0.4, ((e - s) / duration) * 100)}%` }}
              />
            ))
          : null}
        {duration > 0 ? (
          <span
            className="absolute inset-y-0 w-0.5 bg-ink/60"
            style={{ left: `${Math.min(100, (currentTime / duration) * 100)}%` }}
            aria-hidden="true"
          />
        ) : null}
        <span className="absolute inset-y-0 w-px border-l border-dashed border-ink/40" style={{ left: `${thresholdPct}%` }} aria-hidden="true" />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
        <span>
          {duration > 0 ? `${formatClock(currentTime)} / ${formatClock(duration)}` : '—'} · completes at {thresholdPct}% unique coverage
        </span>
        <span aria-live="polite">
          {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Progress saved' : saving === 'offline' ? 'Offline — will sync later' : 'Auto-saves every 15 s'}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">Only content you actually watch counts. Skipping ahead, buffering and time in other tabs are not counted.</p>
    </div>
  );
}
