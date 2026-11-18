import { describe, expect, it } from 'vitest';
import { isValidVideoRef, parseBulkLectures, parseDriveFileId, parseDurationInput, parseVideoId, parseVideoRef } from '@/lib/youtube/video-id';
import { pickQuoteForDay } from '@/lib/quotes';
import { signUnlockToken, verifyUnlockToken } from '@/lib/auth/lock-token';
import { formatClock, formatDuration } from '@/lib/utils/format';

describe('YouTube ids', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('parses %s', (input, id) => expect(parseVideoId(input)).toBe(id));

  it.each(['', 'short', 'https://vimeo.com/123456', '<iframe src=x>', 'https://youtube.com/watch?v=bad"id'])(
    'rejects %s',
    (input) => expect(parseVideoId(input)).toBeNull(),
  );

  it('parses durations and bulk lines', () => {
    expect(parseDurationInput('45:30')).toBe(2730);
    expect(parseDurationInput('1:02:03')).toBe(3723);
    expect(parseDurationInput('abc')).toBeNull();
    const r = parseBulkLectures('# comment\nIntro | https://youtu.be/dQw4w9WgXcQ | 10:00\n\nBad | nope\n | dQw4w9WgXcQ');
    expect(r.items).toEqual([{ title: 'Intro', videoId: 'dQw4w9WgXcQ', provider: 'youtube', durationSeconds: 600, line: 2 }]);
    expect(r.errors.map((e) => e.line)).toEqual([4, 5]);
  });
});

describe('Google Drive ids', () => {
  const id = '1WdePmnjggj3gYNOvdTftcPHKl8GkiXIV';
  it.each([
    [id],
    [`https://drive.google.com/file/d/${id}/view?usp=sharing`],
    [`https://drive.google.com/file/d/${id}/preview`],
    [`https://drive.google.com/open?id=${id}`],
    [`https://drive.google.com/uc?id=${id}&export=download`],
    [`drive.usercontent.google.com/download?id=${id}`],
  ])('parses %s', (input) => expect(parseVideoRef(input)).toEqual({ provider: 'drive', id }));

  it('keeps YouTube links on YouTube and rejects foreign hosts', () => {
    expect(parseVideoRef('https://youtu.be/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseDriveFileId(`https://example.com/file/d/${id}/view`)).toBeNull();
    expect(parseDriveFileId('https://drive.google.com/file/d/short/view')).toBeNull();
    expect(parseVideoRef('https://drive.google.com/drive/folders/1s8HQi97vSCCL7p5Oa_YpPO1b988GzcDu')).toBeNull();
  });

  it('validates stored refs per provider', () => {
    expect(isValidVideoRef('drive', id)).toBe(true);
    expect(isValidVideoRef('youtube', id)).toBe(false);
    expect(isValidVideoRef('youtube', 'dQw4w9WgXcQ')).toBe(true);
    expect(isValidVideoRef('drive', 'dQw4w9WgXcQ')).toBe(false);
  });

  it('bulk-imports Drive links', () => {
    const r = parseBulkLectures(`Lokayukta | https://drive.google.com/file/d/${id}/view | 1:45:09`);
    expect(r.items).toEqual([{ title: 'Lokayukta', videoId: id, provider: 'drive', durationSeconds: 6309, line: 1 }]);
  });
});

describe('quote of the day', () => {
  const quotes = [
    { id: 'a', quote: 'A', language: 'en', attribution: null, category: 'exam', display_date: null },
    { id: 'b', quote: 'B', language: 'hi', attribution: null, category: 'exam', display_date: null },
    { id: 'c', quote: 'C', language: 'en', attribution: null, category: 'exam', display_date: '2026-11-15' },
  ];
  it('prefers a scheduled quote, is stable per day and respects language', () => {
    expect(pickQuoteForDay(quotes, '2026-11-15')?.id).toBe('c');
    expect(pickQuoteForDay(quotes, '2026-11-16')?.id).toBe(pickQuoteForDay(quotes, '2026-11-16')?.id);
    expect(pickQuoteForDay(quotes, '2026-11-16', 'hi')?.id).toBe('b');
    expect(pickQuoteForDay([], '2026-11-16')).toBeNull();
  });
});

describe('unlock token', () => {
  it('verifies only for the same user, secret and within max age', async () => {
    const t = await signUnlockToken('user-1', 'secret', 1_000_000);
    expect(await verifyUnlockToken(t, 'user-1', 'secret', 1_000_500)).toBe(true);
    expect(await verifyUnlockToken(t, 'user-2', 'secret', 1_000_500)).toBe(false);
    expect(await verifyUnlockToken(t, 'user-1', 'other', 1_000_500)).toBe(false);
    expect(await verifyUnlockToken(t.replace(/.$/, 'x'), 'user-1', 'secret', 1_000_500)).toBe(false);
    expect(await verifyUnlockToken(t, 'user-1', 'secret', 1_000_000 + 25 * 3600_000)).toBe(false);
  });
});

describe('formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(3 * 3600 + 20 * 60)).toBe('3h 20m');
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(3922)).toBe('1:05:22');
  });
});
