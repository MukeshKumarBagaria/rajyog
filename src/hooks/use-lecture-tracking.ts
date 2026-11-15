'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYouTubeApi, PlayerState, youtubeErrorMessage, type YTPlayer } from '@/lib/youtube/iframe-api';
import { PlaybackTracker } from '@/lib/tracking/playback-tracker';
import { mergeSegments, parseSegments, type Segment } from '@/lib/tracking/segments';
import { beaconProgress, flushOutbox, sendProgress } from '@/lib/tracking/progress-queue';
import { isFocusTimerRunning, useFocusTimer } from '@/stores/focus-timer-store';
import { signalActivity } from '@/components/layout/idle-lock';
import { PROGRESS_FLUSH_SECONDS } from '@/constants/app';
import type { LectureStatus } from '@/types/database';
import type { ProgressPayload } from '@/lib/validation/schemas';

type Options = {
  lectureId: string;
  videoId: string;
  durationSeconds: number | null;
  threshold: number; // 0–1
  initialSegments: Segment[];
  initialPosition: number;
  initialStatus: LectureStatus;
  initialPercent: number;
};

/** Prefer the player's real duration when it is within 0.5–1.5× of the stored one (mirrors the DB). */
const reconcileDuration = (current: number, reported: number) => {
  const d = Math.round(reported);
  if (!d) return current;
  if (!current) return d;
  return d >= current * 0.5 && d <= current * 1.5 ? d : current;
};

type ServerProgress = {
  watched_seconds: number;
  completion_percentage: number;
  status: LectureStatus;
  duration_seconds: number | null;
  segments: unknown;
};

const newSessionId = () => crypto.randomUUID();

/**
 * Embeds a YouTube lecture and tracks it reliably:
 *  • samples the player once per second into a PlaybackTracker (seek-, buffer-
 *    and hidden-tab-aware),
 *  • sends heartbeats every 15 s, on pause/end, when the tab hides and on exit,
 *  • persists unsent heartbeats in a durable outbox (offline-safe), and
 *  • yields to a running manual focus timer so time is never double counted.
 */
export function useLectureTracking(opts: Options) {
  const { lectureId, videoId, durationSeconds, threshold } = opts;

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [tracker] = useState(() => new PlaybackTracker());
  const sessionIdRef = useRef<string>('');
  const seqRef = useRef(0);
  const stateRef = useRef<number>(PlayerState.UNSTARTED);
  const lastSentPosRef = useRef(opts.initialPosition);

  const [ready, setReady] = useState(false);
  const [playerState, setPlayerState] = useState<number>(PlayerState.UNSTARTED);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>([1]);
  const [currentTime, setCurrentTime] = useState(opts.initialPosition);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [serverSegments, setServerSegments] = useState<Segment[]>(opts.initialSegments);
  const [liveSegments, setLiveSegments] = useState<Segment[]>([]);
  const [sessionSegments, setSessionSegments] = useState<Segment[]>([]);
  const [status, setStatus] = useState<LectureStatus>(opts.initialStatus);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const timerRunning = useFocusTimer((s) => s.status === 'running');

  const buildPayload = useCallback((): ProgressPayload | null => {
    const player = playerRef.current;
    const drained = tracker.drain();
    const position = player ? player.getCurrentTime() : lastSentPosRef.current;
    const moved = Math.abs(position - lastSentPosRef.current) >= 2;
    if (!drained.segments.length && drained.activeSeconds === 0 && !moved) return null;

    if (drained.segments.length) setSessionSegments((prev) => mergeSegments([...prev, ...drained.segments]));
    lastSentPosRef.current = position;
    const playerDuration = player?.getDuration?.() ?? 0;

    return {
      lectureId,
      segments: drained.segments,
      position: Math.max(0, Math.floor(position)),
      sessionId: sessionIdRef.current,
      // A running manual timer already counts this time — avoid double counting.
      activeSeconds: isFocusTimerRunning() ? 0 : drained.activeSeconds,
      seq: ++seqRef.current,
      duration: Math.round(playerDuration || durationSeconds || 0) || null,
    };
  }, [lectureId, durationSeconds, tracker]);

  const flush = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving('saving');
    const res = await sendProgress(payload);
    if (res.ok && res.data) {
      const d = res.data as ServerProgress;
      setServerSegments(parseSegments(d.segments));
      setStatus(d.status);
      if (d.duration_seconds) setDuration(d.duration_seconds);
      setSaving('saved');
    } else {
      setSaving(navigator.onLine ? 'idle' : 'offline');
    }
  }, [buildPayload]);

  const flushBeacon = useCallback(() => {
    const payload = buildPayload();
    if (payload) beaconProgress(payload);
  }, [buildPayload]);

  /** Closes the current watched interval at the player's present position. */
  const finalizeSample = useCallback(() => {
    const p = playerRef.current;
    if (p && stateRef.current === PlayerState.PLAYING) {
      tracker.sample({
        wallMs: performance.now(),
        position: p.getCurrentTime(),
        playing: true,
        visible: true,
        rate: p.getPlaybackRate(),
      });
    }
    tracker.pause();
  }, [tracker]);

  // Player lifecycle.
  useEffect(() => {
    sessionIdRef.current = newSessionId();
    seqRef.current = 0;
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const host = document.createElement('div');
    host.className = 'h-full w-full';
    container.appendChild(host);

    const dur = durationSeconds ?? 0;
    const start = opts.initialPosition > 5 && (!dur || opts.initialPosition < dur - 15) ? Math.floor(opts.initialPosition) : 0;

    void flushOutbox();

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(host, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            enablejsapi: 1,
            start,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              setReady(true);
              setRates(e.target.getAvailablePlaybackRates?.() ?? [1]);
              setRate(e.target.getPlaybackRate?.() ?? 1);
              const d = e.target.getDuration?.();
              if (d) setDuration((cur) => reconcileDuration(cur, d));
            },
            onStateChange: (e) => {
              const prev = stateRef.current;
              if (prev === PlayerState.PLAYING && e.data !== PlayerState.PLAYING) finalizeSample();
              stateRef.current = e.data;
              setPlayerState(e.data);

              if (e.data === PlayerState.PLAYING) {
                setEnded(false);
                const p = e.target;
                tracker.sample({
                  wallMs: performance.now(),
                  position: p.getCurrentTime(),
                  playing: true,
                  visible: document.visibilityState === 'visible',
                  rate: p.getPlaybackRate(),
                });
                const d = p.getDuration?.();
                if (d) setDuration((cur) => reconcileDuration(cur, d));
              } else if (e.data === PlayerState.PAUSED) {
                void flush();
              } else if (e.data === PlayerState.ENDED) {
                setEnded(true);
                void flush();
              }
            },
            onPlaybackRateChange: (e) => setRate(e.data),
            onError: (e) => setError(youtubeErrorMessage(e.data)),
          },
        });
      })
      .catch((err: Error) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
      finalizeSample();
      void flush();
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
      container.innerHTML = '';
    };
    // The player is created once per lecture; initial values are intentionally not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, lectureId]);

  // 1 Hz sampling + periodic heartbeat.
  useEffect(() => {
    let ticks = 0;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const playing = stateRef.current === PlayerState.PLAYING;
      const t = p.getCurrentTime();
      tracker.sample({
        wallMs: performance.now(),
        position: t,
        playing,
        visible: document.visibilityState === 'visible',
        rate: p.getPlaybackRate(),
      });
      setCurrentTime(t);
      if (playing) {
        signalActivity();
        setLiveSegments(tracker.peekSegments());
        ticks++;
        if (ticks % PROGRESS_FLUSH_SECONDS === 0) void flush();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [flush, tracker]);

  // Hidden tab / page exit / reconnect.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        finalizeSample();
        flushBeacon();
      }
    };
    const onPageHide = () => {
      finalizeSample();
      flushBeacon();
    };
    const onOnline = () => void flushOutbox();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
    };
  }, [finalizeSample, flushBeacon]);

  const segments = mergeSegments([...serverSegments, ...sessionSegments, ...liveSegments], duration || null);
  const covered = segments.reduce((a, [s, e]) => a + (e - s), 0);
  const percent = duration > 0 ? Math.min(100, (covered / duration) * 100) : 0;
  const effectiveStatus: LectureStatus = status === 'COMPLETED' || (duration > 0 && percent >= threshold * 100) ? 'COMPLETED' : covered > 0 ? 'IN_PROGRESS' : status;

  return {
    containerRef,
    ready,
    error,
    playerState,
    isPlaying: playerState === PlayerState.PLAYING,
    ended,
    rate,
    rates,
    currentTime,
    duration,
    segments,
    percent,
    status: effectiveStatus,
    saving,
    timerRunning,
    setRate: (r: number) => playerRef.current?.setPlaybackRate(r),
    seekBy: (delta: number) => {
      const p = playerRef.current;
      if (p) p.seekTo(Math.max(0, p.getCurrentTime() + delta), true);
    },
    seekTo: (t: number) => playerRef.current?.seekTo(Math.max(0, t), true),
    play: () => playerRef.current?.playVideo(),
  };
}
