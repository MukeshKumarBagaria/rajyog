'use client';

import { PlayerState, type YTPlayer } from '@/lib/youtube/iframe-api';

/**
 * Wraps a native <video> element in the same small surface as the YouTube
 * IFrame player (YTPlayer + YT-style state codes), so useLectureTracking can
 * drive either one with identical tracking logic.
 */

export type Html5PlayerEvents = {
  onReady?: (p: YTPlayer) => void;
  onStateChange?: (state: number, p: YTPlayer) => void;
  onPlaybackRateChange?: (rate: number) => void;
  /** Fired when the browser cannot load or decode the source. */
  onError?: (message: string) => void;
};

export const HTML5_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

/** Time allowed for metadata to arrive before giving up on the native player. */
const LOAD_TIMEOUT_MS = 25_000;

export function createHtml5Player(host: HTMLElement, src: string, startSeconds: number, events: Html5PlayerEvents): YTPlayer {
  const video = document.createElement('video');
  video.className = 'h-full w-full bg-black';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('controlsList', 'nodownload');

  let state: number = PlayerState.UNSTARTED;
  let ready = false;
  let destroyed = false;

  const api: YTPlayer = {
    playVideo: () => void video.play().catch(() => undefined),
    pauseVideo: () => video.pause(),
    seekTo: (s) => {
      video.currentTime = Math.max(0, Math.min(s, Number.isFinite(video.duration) ? video.duration - 0.5 : s));
    },
    getCurrentTime: () => video.currentTime || 0,
    getDuration: () => (Number.isFinite(video.duration) ? video.duration : 0),
    getPlayerState: () => state,
    getPlaybackRate: () => video.playbackRate || 1,
    setPlaybackRate: (r) => {
      video.playbackRate = r;
    },
    getAvailablePlaybackRates: () => HTML5_RATES,
    destroy: () => {
      destroyed = true;
      window.clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    },
  };

  const setState = (s: number) => {
    if (destroyed || s === state) return;
    state = s;
    events.onStateChange?.(s, api);
  };

  const fail = (message: string) => {
    if (destroyed) return;
    window.clearTimeout(timeout);
    events.onError?.(message);
  };

  const timeout = window.setTimeout(() => {
    if (!ready) fail('The video took too long to start.');
  }, LOAD_TIMEOUT_MS);

  video.addEventListener('loadedmetadata', () => {
    if (destroyed || ready) return;
    // A video track with no dimensions means the codec could not be decoded.
    if (video.videoWidth === 0 && video.videoHeight === 0) return fail('This browser cannot play this video format.');
    ready = true;
    window.clearTimeout(timeout);
    if (startSeconds > 0) video.currentTime = startSeconds;
    events.onReady?.(api);
    setState(PlayerState.CUED);
  });
  video.addEventListener('playing', () => setState(PlayerState.PLAYING));
  video.addEventListener('pause', () => {
    if (!video.ended) setState(PlayerState.PAUSED);
  });
  video.addEventListener('waiting', () => setState(PlayerState.BUFFERING));
  video.addEventListener('seeking', () => {
    if (!video.paused) setState(PlayerState.BUFFERING);
  });
  video.addEventListener('ended', () => setState(PlayerState.ENDED));
  video.addEventListener('ratechange', () => events.onPlaybackRateChange?.(video.playbackRate));
  video.addEventListener('error', () => {
    const code = video.error?.code;
    fail(
      code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || code === MediaError.MEDIA_ERR_DECODE
        ? 'This browser cannot play this video format.'
        : 'The video could not be loaded from Google Drive.',
    );
  });

  host.appendChild(video);
  video.src = src;
  return api;
}
