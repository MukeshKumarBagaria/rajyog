'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <TriangleAlert className="mx-auto h-8 w-8 text-warning" aria-hidden="true" />
      <h1 className="mt-3 text-lg font-bold text-ink">Something went wrong</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Your data is safe. This is usually a temporary connection problem.
        {error.digest ? <span className="mt-2 block text-xs text-ink-faint">Reference: {error.digest}</span> : null}
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
