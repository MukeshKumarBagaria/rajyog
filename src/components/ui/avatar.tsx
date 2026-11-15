import { initials } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export function Avatar({ name, src, size = 36, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light font-semibold text-primary-strong ring-2 ring-surface',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      aria-hidden={!src}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
        <img src={src} alt={name ? `${name}'s profile picture` : 'Profile picture'} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
