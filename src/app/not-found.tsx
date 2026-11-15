import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { LogoMark } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <main className="bg-jaali flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <LogoMark size={44} />
      <Compass className="mt-6 h-8 w-8 text-primary" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold text-ink">This page isn’t on the syllabus</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-secondary">The link may be broken, or the content was moved by the owner.</p>
      <ButtonLink href="/" className="mt-6">
        Back to Home
      </ButtonLink>
    </main>
  );
}
