-- ════════════════════════════════════════════════════════════════════════════
-- Google Drive lectures
--
-- Lectures can now be hosted either on YouTube or as a publicly shared
-- ("Anyone with the link") Google Drive video file. `youtube_video_id` keeps its
-- name for compatibility but now holds the provider's video ID:
--   • youtube → the 11-character YouTube video ID
--   • drive   → the Google Drive file ID
-- Only IDs are stored — never URLs or iframe HTML.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.lectures
  add column if not exists video_provider text not null default 'youtube'
    check (video_provider in ('youtube', 'drive'));

alter table public.lectures drop constraint if exists lectures_youtube_video_id_check;
alter table public.lectures drop constraint if exists lectures_video_id_check;
alter table public.lectures add constraint lectures_video_id_check check (
  (video_provider = 'youtube' and youtube_video_id ~ '^[A-Za-z0-9_-]{11}$')
  or (video_provider = 'drive' and youtube_video_id ~ '^[A-Za-z0-9_-]{20,100}$')
);

comment on column public.lectures.youtube_video_id is
  'Provider video ID: 11-char YouTube ID, or Google Drive file ID when video_provider = ''drive''.';
