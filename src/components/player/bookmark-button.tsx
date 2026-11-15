'use client';

import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleBookmarkAction } from '@/actions/library';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

export function BookmarkButton({ lectureId, initial }: { lectureId: string; initial: boolean }) {
  const [pending, start] = useTransition();
  const [bookmarked, setBookmarked] = useState(initial);

  return (
    <Button
      variant={bookmarked ? 'secondary' : 'outline'}
      size="sm"
      aria-pressed={bookmarked}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const previous = bookmarked;
          setBookmarked(!previous);
          const res = await toggleBookmarkAction(lectureId);
          if (!res.ok) {
            setBookmarked(previous);
            toast.error(res.error);
          } else {
            setBookmarked(res.data.bookmarked);
            toast.success(res.data.bookmarked ? 'Bookmarked' : 'Bookmark removed');
          }
        })
      }
    >
      <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} aria-hidden="true" />
      {bookmarked ? 'Bookmarked' : 'Bookmark'}
    </Button>
  );
}
