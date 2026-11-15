'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TimerMode = 'countdown' | 'stopwatch';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

/** A stopwatch left running is auto-finished after this long. */
export const STOPWATCH_MAX_SECONDS = 6 * 3600;

type FocusTimerState = {
  status: TimerStatus;
  mode: TimerMode;
  targetSeconds: number;
  accumulatedMs: number;
  runStartedAt: number | null;
  sessionStartedAt: string | null;
  sessionId: string | null;
  subjectId: string | null;
  studyType: string;
  configure: (mode: TimerMode, targetSeconds: number) => void;
  setSubject: (id: string | null) => void;
  setStudyType: (t: string) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  reset: () => void;
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/**
 * Manual / Pomodoro focus timer. Persisted to localStorage so it survives
 * refreshes and navigation; elapsed time is derived from timestamps, never
 * from tick counting, so throttled background tabs stay accurate.
 */
export const useFocusTimer = create<FocusTimerState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      mode: 'countdown',
      targetSeconds: 25 * 60,
      accumulatedMs: 0,
      runStartedAt: null,
      sessionStartedAt: null,
      sessionId: null,
      subjectId: null,
      studyType: 'Reading',
      configure: (mode, targetSeconds) => {
        if (get().status === 'running' || get().status === 'paused') return;
        set({ mode, targetSeconds, status: 'idle', accumulatedMs: 0, runStartedAt: null });
      },
      setSubject: (subjectId) => set({ subjectId }),
      setStudyType: (studyType) => set({ studyType }),
      start: () =>
        set({
          status: 'running',
          accumulatedMs: 0,
          runStartedAt: Date.now(),
          sessionStartedAt: new Date().toISOString(),
          sessionId: newId(),
        }),
      pause: () => {
        const s = get();
        if (s.status !== 'running' || !s.runStartedAt) return;
        set({ status: 'paused', accumulatedMs: s.accumulatedMs + (Date.now() - s.runStartedAt), runStartedAt: null });
      },
      resume: () => {
        if (get().status !== 'paused') return;
        set({ status: 'running', runStartedAt: Date.now() });
      },
      finish: () => {
        const s = get();
        const acc = s.accumulatedMs + (s.runStartedAt ? Date.now() - s.runStartedAt : 0);
        set({ status: 'finished', accumulatedMs: acc, runStartedAt: null });
      },
      reset: () =>
        set({ status: 'idle', accumulatedMs: 0, runStartedAt: null, sessionStartedAt: null, sessionId: null }),
    }),
    {
      name: 'rj-focus-timer',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export function elapsedSeconds(s: Pick<FocusTimerState, 'accumulatedMs' | 'runStartedAt' | 'mode' | 'targetSeconds'>, now = Date.now()): number {
  const raw = (s.accumulatedMs + (s.runStartedAt ? now - s.runStartedAt : 0)) / 1000;
  const cap = s.mode === 'countdown' ? s.targetSeconds : STOPWATCH_MAX_SECONDS;
  return Math.min(cap, Math.max(0, raw));
}

/** True while a manual timer is running — video tracking then skips study time to avoid double counting. */
export function isFocusTimerRunning(): boolean {
  return useFocusTimer.getState().status === 'running';
}
