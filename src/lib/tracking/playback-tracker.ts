import { mergeSegments, type Segment } from './segments';

/**
 * Pure, clock-injected playback tracker used by the lecture player.
 *
 * The player is sampled about once per second. Each sample reports the wall
 * clock, the content position and whether the video is *actually* playing in
 * a *visible* tab. From consecutive samples the tracker derives:
 *
 *  • watched content segments — only for continuous forward playback, so a
 *    seek (forward or backward) never credits the skipped range; and
 *  • verified active study seconds — wall-clock time while playing, visible
 *    and advancing (buffering, pauses, hidden tabs and stalls never count).
 *
 * Data accumulates until drain() hands it to the network layer; if a send
 * fails, restore() puts it back so nothing is lost or counted twice.
 */

export type TrackerSample = {
  /** Wall clock in milliseconds (performance.now() or Date.now()). */
  wallMs: number;
  /** Current content position in seconds. */
  position: number;
  /** Player reports PLAYING (not paused / buffering / ended). */
  playing: boolean;
  /** Document is visible. */
  visible: boolean;
  /** Current playback rate (1 = normal). */
  rate: number;
};

export type TrackerDrain = {
  segments: Segment[];
  activeSeconds: number;
};

/** Sampling gaps longer than this are treated as discontinuities (sleep, throttling). */
const MAX_SAMPLE_GAP_S = 5;
/** Allowed position overshoot vs. expected advance before a jump counts as a seek. */
const SEEK_TOLERANCE_S = 1.25;
/** Backward movement beyond this is a seek, not jitter. */
const BACKWARD_TOLERANCE_S = 0.35;
/** Below this fraction of the expected advance the player is considered stalled. */
const STALL_RATIO = 0.25;

export class PlaybackTracker {
  private last: { wallMs: number; position: number } | null = null;
  private open: Segment | null = null;
  private closed: Segment[] = [];
  private activeMs = 0;

  sample(s: TrackerSample): void {
    if (!s.playing || !s.visible || !Number.isFinite(s.position)) {
      this.closeOpen();
      this.last = null;
      return;
    }

    if (!this.last) {
      this.last = { wallMs: s.wallMs, position: s.position };
      this.open = [s.position, s.position];
      return;
    }

    const wallDelta = (s.wallMs - this.last.wallMs) / 1000;
    if (wallDelta <= 0) return;

    const posDelta = s.position - this.last.position;
    const rate = s.rate > 0 ? s.rate : 1;
    const expected = wallDelta * rate;

    if (wallDelta > MAX_SAMPLE_GAP_S) {
      // Timer throttled / device slept: we cannot vouch for this interval.
      this.restart(s);
      return;
    }

    const isForwardSeek = posDelta > expected + SEEK_TOLERANCE_S;
    const isBackwardSeek = posDelta < -BACKWARD_TOLERANCE_S;

    if (isForwardSeek || isBackwardSeek) {
      this.restart(s);
      return;
    }

    if (posDelta >= expected * STALL_RATIO) {
      // Continuous, advancing playback.
      if (!this.open) this.open = [this.last.position, this.last.position];
      this.open[1] = Math.max(this.open[1], s.position);
      this.activeMs += wallDelta * 1000;
    }
    // else: stalled (buffering without a state change) — neither counts.

    this.last = { wallMs: s.wallMs, position: s.position };
  }

  /** Call when the player pauses, ends, buffers or the tab hides. */
  pause(): void {
    this.closeOpen();
    this.last = null;
  }

  /** Takes everything accumulated since the last drain. */
  drain(): TrackerDrain {
    const segments = [...this.closed];
    if (this.open && this.open[1] > this.open[0]) {
      segments.push([this.open[0], this.open[1]]);
      this.open = [this.open[1], this.open[1]];
    }
    this.closed = [];

    const activeSeconds = Math.floor(this.activeMs / 1000);
    this.activeMs -= activeSeconds * 1000; // keep the sub-second remainder

    return { segments: mergeSegments(segments), activeSeconds };
  }

  /** Returns a failed drain to the buffer so it is retried with the next send. */
  restore(d: TrackerDrain): void {
    this.closed.push(...d.segments);
    this.activeMs += d.activeSeconds * 1000;
  }

  hasPending(): boolean {
    return this.closed.length > 0 || this.activeMs >= 1000 || Boolean(this.open && this.open[1] - this.open[0] >= 1);
  }

  /** Segments watched in this visit (including the open one), for UI preview. */
  peekSegments(): Segment[] {
    const all = [...this.closed];
    if (this.open && this.open[1] > this.open[0]) all.push([...this.open] as Segment);
    return mergeSegments(all);
  }

  private restart(s: TrackerSample) {
    this.closeOpen();
    this.last = { wallMs: s.wallMs, position: s.position };
    this.open = [s.position, s.position];
  }

  private closeOpen() {
    if (this.open && this.open[1] > this.open[0]) this.closed.push([this.open[0], this.open[1]]);
    this.open = null;
  }
}
