'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-warning-light px-4 py-2.5 text-[13px] font-medium text-warning-ink">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      You are offline. Progress is kept on this device and will sync when you reconnect.
    </div>
  );
}
