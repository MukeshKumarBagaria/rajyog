import { BookOpen, Timer, Video } from 'lucide-react';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { deleteSessionAction } from '@/actions/study';
import { formatDuration } from '@/lib/utils/format';
import { formatInTimezone } from '@/lib/utils/dates';
import type { getRecentSessions } from '@/services/study.service';

type Session = Awaited<ReturnType<typeof getRecentSessions>>[number];

export function RecentSessions({ sessions, timezone }: { sessions: Session[]; timezone: string }) {
  if (!sessions.length) {
    return <p className="py-6 text-center text-[13px] text-ink-secondary">No study sessions yet. Start a lecture or the timer above.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {sessions.map((s) => {
        const Icon = s.session_type === 'VIDEO' ? Video : s.session_type === 'POMODORO' ? Timer : BookOpen;
        const title = s.session_type === 'VIDEO' ? (s.lectures?.title ?? 'Lecture') : (s.study_type ?? 'Focus session');
        return (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-strong">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{title}</p>
              <p className="truncate text-xs text-ink-secondary">
                {s.subjects?.name ?? 'General'} · {formatInTimezone(s.start_time, 'd MMM, h:mm a', timezone)}
              </p>
            </div>
            <span className="tabular shrink-0 text-sm font-semibold text-ink">{formatDuration(s.duration_seconds)}</span>
            {s.session_type !== 'VIDEO' ? (
              <ConfirmButton
                variant="ghost"
                size="icon-sm"
                aria-label="Delete session"
                title="Delete this session?"
                description="Use this only for sessions recorded by mistake. Your daily totals will update."
                successMessage="Session deleted"
                action={deleteSessionAction.bind(null, s.id)}
              >
                <span aria-hidden="true" className="text-lg leading-none text-ink-faint">×</span>
              </ConfirmButton>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
