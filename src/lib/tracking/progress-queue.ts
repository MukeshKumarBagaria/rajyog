'use client';

import type { ProgressPayload } from '@/lib/validation/schemas';

/**
 * Durable outbox for lecture progress heartbeats.
 *
 * Every payload is written to localStorage BEFORE it is sent and removed only
 * after the server confirms it. Payloads that fail (offline, tab closed,
 * beacon not confirmed) are re-sent later in order. The server deduplicates
 * study time by (session, seq) and merges coverage idempotently, so a re-send
 * can never double count.
 */
const KEY = 'rj-progress-outbox';
const MAX_ITEMS = 200;

type Queued = ProgressPayload & { queuedAt: number };

function read(): Queued[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Queued[]) : [];
  } catch {
    return [];
  }
}

function write(items: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* storage full or unavailable — sending still works */
  }
}

const sameItem = (a: ProgressPayload, b: ProgressPayload) => a.sessionId === b.sessionId && a.seq === b.seq && a.lectureId === b.lectureId;

export function enqueue(payload: ProgressPayload) {
  write([...read(), { ...payload, queuedAt: Date.now() }]);
}

function remove(payload: ProgressPayload) {
  write(read().filter((q) => !sameItem(q, payload)));
}

async function post(payload: ProgressPayload): Promise<'ok' | 'retry' | 'drop'> {
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'same-origin',
    });
    if (res.ok) return 'ok';
    // 4xx other than auth/rate limits will never succeed — drop to avoid a poison queue.
    if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 408 && res.status !== 429) return 'drop';
    return 'retry';
  } catch {
    return 'retry';
  }
}

export type SendResult = { ok: boolean; data?: unknown };

/** Queues then sends one payload. Returns the server response on success. */
export async function sendProgress(payload: ProgressPayload): Promise<SendResult> {
  enqueue(payload);
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'same-origin',
    });
    if (res.ok) {
      remove(payload);
      return { ok: true, data: await res.json().catch(() => undefined) };
    }
    if (res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status)) remove(payload);
  } catch {
    /* stays queued */
  }
  return { ok: false };
}

/** Fire-and-forget send for page exit; stays queued until a later flush confirms. */
export function beaconProgress(payload: ProgressPayload) {
  enqueue(payload);
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/progress', blob)) void post(payload);
  } catch {
    /* stays queued */
  }
}

let flushing = false;

/** Re-sends queued payloads in order. Safe to call often. */
export async function flushOutbox() {
  if (flushing || typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushing = true;
  try {
    for (const item of read()) {
      // Very old entries (> 3 days) can no longer be attributed reliably.
      if (Date.now() - item.queuedAt > 3 * 86400_000) {
        remove(item);
        continue;
      }
      const { queuedAt: _q, ...payload } = item;
      const r = await post(payload);
      if (r === 'retry') break;
      remove(item);
    }
  } finally {
    flushing = false;
  }
}
