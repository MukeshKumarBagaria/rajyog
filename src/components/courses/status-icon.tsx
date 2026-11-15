import { CircleCheckBig, CircleDashed, CirclePlay } from 'lucide-react';
import type { LectureStatus } from '@/types/database';
import { cn } from '@/lib/utils/cn';

export function LectureStatusIcon({ status, className }: { status: LectureStatus; className?: string }) {
  if (status === 'COMPLETED') return <CircleCheckBig className={cn('h-5 w-5 text-success', className)} aria-label="Completed" />;
  if (status === 'IN_PROGRESS') return <CirclePlay className={cn('h-5 w-5 text-primary', className)} aria-label="In progress" />;
  return <CircleDashed className={cn('h-5 w-5 text-ink-faint', className)} aria-label="Not started" />;
}

export const STATUS_LABEL: Record<LectureStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
