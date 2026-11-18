# Video tracking

Lectures come from one of two providers (`lectures.video_provider`):

* **YouTube** — embedded with the official **YouTube IFrame Player API**
  (`youtube-nocookie.com` host, related videos limited, annotations off).
* **Google Drive** — a video file shared as *Anyone with the link* (MKV/MP4,
  H.264 + AAC). It plays in a native `<video>` element
  (`src/lib/video/html5-player.ts`, which exposes the same small API as the
  YouTube player, so tracking is identical). Drive won't serve file bytes to a
  browser directly, so the player streams through
  `/api/video/drive/[fileId]`: a signed-in-only proxy that forwards Range
  requests to Drive in 8 MB chunks and only serves files that belong to a
  lecture. If the browser can't decode the file (e.g. MKV in Safari/iOS), the
  page falls back to Drive's own embedded player: playback works there, but
  coverage isn't tracked.

Tracking lives in three layers:

| Layer | File | Responsibility |
|---|---|---|
| Sampling | `src/lib/tracking/playback-tracker.ts` | Pure, clock-injected state machine (unit-tested) |
| Player glue | `src/hooks/use-lecture-tracking.ts` | Creates the player, samples it at 1 Hz, sends heartbeats |
| Persistence | `src/lib/tracking/progress-queue.ts` → `/api/progress` → `record_lecture_progress()` | Durable outbox + idempotent server merge |

## Two different quantities

* **Coverage** (`watched_segments`, `watched_seconds`) — which parts of the video
  content were actually played. Used for completion.
* **Study time** (`study_sessions.duration_seconds`) — real wall-clock seconds of
  active viewing. At 2× speed, 30 minutes of study covers 60 minutes of content.

## Sampling rules

Every second the hook reports `{ wallMs, position, playing, visible, rate }`.

| Situation | Coverage | Study time |
|---|---|---|
| Playing, visible, position advancing ≈ elapsed × rate | ✔ extends the open interval | ✔ |
| Forward jump > expected + 1.25 s (seek ahead) | ✘ new interval starts at the new position | ✘ |
| Backward jump > 0.35 s (seek back) | ✘ new interval | ✘ |
| Position not advancing while "playing" (buffering) | ✘ | ✘ |
| Paused / buffering / ended state | interval closed | ✘ |
| Tab hidden | interval closed | ✘ |
| Sampling gap > 5 s (device asleep, throttled timers) | discontinuity | ✘ |

State changes away from PLAYING take one final sample first, so the last
second before a pause is not lost.

## Heartbeats

* Every 15 s of playback, on pause/end, when the tab hides and on page exit.
* Each heartbeat carries the **new** intervals since the last one, the resume
  position, the active seconds, the player's duration and an increasing `seq`
  for this viewing session (a UUID per page visit).
* Payloads are written to a localStorage outbox before sending and removed only
  after a 2xx response. `pagehide` / hidden tabs use `navigator.sendBeacon`; those
  entries stay in the outbox and are re-sent (harmlessly) on the next visit or
  when the browser comes back online.

## Server merge (`record_lecture_progress`)

1. Locks the user's progress row (concurrent tabs are serialised).
2. Unions stored + new intervals (`merge_segments`), clamps to the duration,
   and recomputes unique watched seconds — replays can never double count.
3. Completion = unique coverage ≥ `completion_threshold` (default 90 %).
   Once completed, a lecture stays completed.
4. Study time: applied only if `seq` is greater than the session's `last_seq`,
   capped at 600 s per heartbeat and never more than the session's wall-clock
   span. A table check constraint enforces active ≤ wall-clock as well.

### Duration

Admins may leave the duration blank — it is filled from the player on first
play. If an admin-entered duration differs from the player's real duration,
the player's value is used for completion when it lies within 0.5–1.5× of the
stored one (a mistyped duration can't make completion impossible, and an absurd
client value is ignored).

## Avoiding double counting with the focus timer

When the manual focus timer is running, the lecture page shows a notice and
sends `activeSeconds = 0` (coverage is still recorded), because the timer is
already counting that time.

## Auto-lock

Playback dispatches an activity signal every second, so the optional PIN
auto-lock never interrupts a lecture.
