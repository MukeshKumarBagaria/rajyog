'use client';

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { thumbnailUrl } from '@/lib/youtube/video-id';
import { cn } from '@/lib/utils/cn';

/** YouTube thumbnail with a calm fallback when the image can't load (offline, blocked). */
export function VideoThumb({ videoId, className, showPlay = true }: { videoId: string; className?: string; showPlay?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative aspect-video overflow-hidden bg-gradient-to-br from-primary-light to-secondary/60', className)}>
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- already-optimised YouTube JPEG; avoids image-optimisation quota
        <img
          src={thumbnailUrl(videoId)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : null}
      {showPlay ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
          <PlayCircle className="h-9 w-9 text-white drop-shadow" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}
