import { Quote } from 'lucide-react';
import type { QuoteLike } from '@/lib/quotes';

export function MotivationCard({ quote, greeting, name }: { quote: QuoteLike | null; greeting: string; name: string }) {
  return (
    <section
      aria-label="Daily motivation"
      className="bg-jaali relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-primary-light via-surface to-surface p-5 shadow-[var(--shadow-soft)] sm:p-7"
    >
      <p className="text-sm font-semibold text-primary-strong">
        {greeting}, {name.split(' ')[0]}
      </p>
      {quote ? (
        <figure className="mt-3 max-w-3xl">
          <Quote className="mb-2 h-5 w-5 text-secondary" aria-hidden="true" />
          <blockquote
            lang={quote.language === 'en' ? 'en' : 'hi'}
            className="text-lg font-semibold leading-relaxed text-ink sm:text-xl"
          >
            {quote.quote}
          </blockquote>
          {quote.attribution ? (
            <figcaption className="mt-2 text-xs font-medium text-ink-secondary">— {quote.attribution}</figcaption>
          ) : null}
        </figure>
      ) : (
        <p className="mt-3 text-lg font-semibold text-ink">One focused hour today is a step closer to your goal.</p>
      )}
    </section>
  );
}
