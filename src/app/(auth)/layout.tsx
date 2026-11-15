import { Logo } from '@/components/ui/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-jaali relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary-light/70 to-transparent" aria-hidden="true" />
      <div className="relative w-full max-w-[400px] animate-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-ink-faint">A calm, private space for your RAS journey.</p>
      </div>
    </main>
  );
}
