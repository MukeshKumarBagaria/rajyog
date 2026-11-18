import Link from 'next/link';
import { CirclePlay, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState, ProgressBar } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { formatClock } from '@/lib/utils/format';
import { VideoThumb } from '@/components/ui/video-thumb';
import type { ContinueItem } from '@/services/progress.service';

export function ContinueCard({ items }: { items: ContinueItem[] }) {
  const [main, ...rest] = items;
  return (
    <Card className="flex flex-col">
      <CardHeader icon={<CirclePlay className="h-4 w-4" />} title="Continue learning" description="Pick up exactly where you left off" />
      <CardContent className="flex flex-1 flex-col">
        {!main ? (
          <EmptyState
            icon={<PlayCircle className="h-5 w-5" />}
            title="No lectures watched yet"
            description="Start your first lecture — your place is saved automatically."
            action={
              <ButtonLink href="/courses" size="sm">
                Browse courses
              </ButtonLink>
            }
          />
        ) : (
          <>
            <Link href={`/lecture/${main.lectureId}`} className="group flex gap-4">
              <VideoThumb videoId={main.youtubeVideoId} provider={main.videoProvider} className="w-36 shrink-0 rounded-xl sm:w-44" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-primary-strong">{main.subjectName}</p>
                <p className="truncate text-xs text-ink-secondary">{main.chapterTitle}</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{main.lectureTitle}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={main.percent} size="sm" className="flex-1" label="Watched" />
                  <span className="tabular text-[11px] font-semibold text-ink-secondary">{Math.round(main.percent)}%</span>
                </div>
              </div>
            </Link>
            <ButtonLink href={`/lecture/${main.lectureId}`} className="mt-4 w-full">
              <PlayCircle className="h-4 w-4" />
              {main.positionSeconds > 5 ? `Resume at ${formatClock(main.positionSeconds)}` : 'Start lecture'}
            </ButtonLink>
            {rest.length ? (
              <ul className="mt-4 space-y-1 border-t border-line pt-3">
                {rest.map((i) => (
                  <li key={i.lectureId}>
                    <Link href={`/lecture/${i.lectureId}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-muted">
                      <span className="truncate text-ink">{i.lectureTitle}</span>
                      <span className="tabular shrink-0 text-xs text-ink-secondary">{Math.round(i.percent)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
