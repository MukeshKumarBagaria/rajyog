import { describe, expect, it } from 'vitest';
import { PlaybackTracker } from './playback-tracker';
import { coveragePercent, coveredSeconds, mergeSegments } from './segments';

function play(t: PlaybackTracker, fromWall: number, fromPos: number, seconds: number, rate = 1, visible = true) {
  for (let i = 0; i <= seconds; i++) {
    t.sample({ wallMs: (fromWall + i) * 1000, position: fromPos + i * rate, playing: true, visible, rate });
  }
}

describe('mergeSegments', () => {
  it('merges overlaps and touching ranges, clamps and drops junk', () => {
    expect(mergeSegments([[10, 20], [0, 5], [15, 30], [30.5, 40], [-5, 2], [50, 40]], 35)).toEqual([
      [0, 5],
      [10, 35],
    ]);
  });

  it('never double counts repeated playback', () => {
    expect(coveredSeconds([[0, 100], [0, 100], [50, 100]])).toBe(100);
  });

  it('computes coverage against duration', () => {
    expect(coveragePercent([[0, 450], [500, 950]], 1000)).toBeCloseTo(90);
  });
});

describe('PlaybackTracker', () => {
  it('records continuous playback as one segment and wall-clock active time', () => {
    const t = new PlaybackTracker();
    play(t, 0, 0, 60);
    const d = t.drain();
    expect(d.segments).toEqual([[0, 60]]);
    expect(d.activeSeconds).toBe(60);
  });

  it('does not credit a forward seek', () => {
    const t = new PlaybackTracker();
    play(t, 0, 0, 10); // 0→10
    play(t, 11, 900, 10); // jumped to 900
    const d = t.drain();
    expect(d.segments).toEqual([[0, 10], [900, 910]]);
    expect(coveredSeconds(d.segments)).toBe(20);
    expect(d.activeSeconds).toBe(20);
  });

  it('seeking straight to the end cannot complete a lecture', () => {
    const t = new PlaybackTracker();
    t.sample({ wallMs: 0, position: 0, playing: true, visible: true, rate: 1 });
    t.sample({ wallMs: 1000, position: 995, playing: true, visible: true, rate: 1 });
    t.sample({ wallMs: 2000, position: 996, playing: true, visible: true, rate: 1 });
    expect(coveragePercent(t.drain().segments, 1000)).toBeLessThan(1);
  });

  it('counts content at playback speed but study time at real time', () => {
    const t = new PlaybackTracker();
    play(t, 0, 0, 30, 2); // 30 s of wall time at 2x → 60 s content
    const d = t.drain();
    expect(d.segments).toEqual([[0, 60]]);
    expect(d.activeSeconds).toBe(30);
  });

  it('ignores hidden-tab time and paused time', () => {
    const t = new PlaybackTracker();
    play(t, 0, 0, 10);
    play(t, 11, 11, 20, 1, false); // hidden: nothing counts
    t.sample({ wallMs: 40_000, position: 31, playing: false, visible: true, rate: 1 }); // paused
    play(t, 100, 31, 5);
    const d = t.drain();
    expect(d.activeSeconds).toBe(15);
    expect(coveredSeconds(d.segments)).toBe(15);
  });

  it('does not count buffering stalls reported as playing', () => {
    const t = new PlaybackTracker();
    for (let i = 0; i <= 10; i++) t.sample({ wallMs: i * 1000, position: 5, playing: true, visible: true, rate: 1 });
    expect(t.drain()).toEqual({ segments: [], activeSeconds: 0 });
  });

  it('treats long sampling gaps (sleep/throttling) as discontinuities', () => {
    const t = new PlaybackTracker();
    play(t, 0, 0, 5);
    t.sample({ wallMs: 65_000, position: 65, playing: true, visible: true, rate: 1 });
    const d = t.drain();
    expect(d.activeSeconds).toBe(5);
  });

  it('drains incrementally and restores failed sends without duplication', () => {
    const t = new PlaybackTracker();
    play(t, 0, 0, 15);
    const first = t.drain();
    expect(first).toEqual({ segments: [[0, 15]], activeSeconds: 15 });
    t.restore(first); // network failed
    play(t, 16, 16, 14); // continues (sample at 16 continues from last at 15)
    const second = t.drain();
    expect(second.activeSeconds).toBe(30);
    expect(mergeSegments(second.segments)).toEqual([[0, 30]]);
    expect(t.drain()).toEqual({ segments: [], activeSeconds: 0 });
  });
});
