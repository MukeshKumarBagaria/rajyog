-- ════════════════════════════════════════════════════════════════════════════
-- Rajasthan Polity · Google Drive lecture series (27 videos, 14 chapters)
--
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run. It is safe
-- to run more than once (nothing is duplicated). It:
--   1. applies migration 20261117000001_drive_videos (Google Drive support),
--   2. creates one chapter per topic, ordered as in the video series,
--   3. adds the lectures (Drive file IDs; durations read from the files),
--   4. hides the earlier placeholder chapters of Rajasthan Polity that have no
--      lectures (is_active = false — nothing is deleted).
--
-- Source: Google Drive folder "Polity", shared as "Anyone with the link".
-- The files must stay shared that way, or they will not play.
-- Generated from the folder listing — edit titles later in Admin → Lectures.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Schema: Google Drive lectures ─────────────────────────────────────
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

-- ─── 2–4. Content ─────────────────────────────────────────────────────────
create temporary table _drive_import (
  chapter_order int, chapter_title text, lecture_order int, lecture_title text, file_id text, duration int
) on commit drop;

insert into _drive_import values
    (1, 'Rajasthan Public Administration Commission (राजस्थान लोक प्रशासन आयोग)', 1, 'Lecture 01 · Rajasthan Public Administration Commission (राजस्थान लोक प्रशासन आयोग) — Part 1', '1WdePmnjggj3gYNOvdTftcPHKl8GkiXIV', 2517),
    (1, 'Rajasthan Public Administration Commission (राजस्थान लोक प्रशासन आयोग)', 2, 'Lecture 02 · Rajasthan Public Administration Commission (राजस्थान लोक प्रशासन आयोग) — Part 2', '10v-fG9Tht1g1B_LjybzSXXy8F5bfx4kj', 6676),
    (1, 'Rajasthan Public Administration Commission (राजस्थान लोक प्रशासन आयोग)', 3, 'Lecture 03 · Rajasthan Public Administration Commission (राजस्थान लोक प्रशासन आयोग) — Part 3', '12Xv2_NwNshDG8pgmKvRXbNP9EID7o0fu', 8100),
    (2, 'State Election Commission (राज्य चुनाव आयोग)', 1, 'Lecture 04 · State Election Commission (राज्य चुनाव आयोग)', '1nDLW-Yal0iedCqEe1IuMfYDl1geIaTVk', 11702),
    (3, 'Lokayukta (लोकायुक्त)', 1, 'Lecture 05 · Lokayukta (लोकायुक्त)', '1SkgX8yJ6RfawR4O5PU0qGAXen0G0Jo60', 6309),
    (3, 'Lokayukta (लोकायुक्त)', 2, 'Lecture 06 · Lokayukta: Service Conditions and Rajasthan Lokayuktas (लोकायुक्त: सेवा शर्तें और राजस्थान लोकायुक्त)', '1BxPgMGHfEARauxE94SucSmYXtDphVu4y', 10763),
    (3, 'Lokayukta (लोकायुक्त)', 3, 'Lecture 07 · Lokayukta''s Functions, Annual Report and Deputy Lokayukta; State Information Commission (लोकायुक्त के कार्य, वार्षिक प्रतिवेदन)', '1ut0Al-oIyNTMzvawbD0qMstEmz4ys033', 11143),
    (4, 'State Information Commission (राज्य सूचना आयोग)', 1, 'Lecture 08 · State Information Commission (राज्य सूचना आयोग)', '1VOxjulayjxVVAhIv9has95NYK5tQZYTN', 10872),
    (5, 'Revenue Board (राजस्व मंडल)', 1, 'Lecture 09 · Revenue Board (राजस्व मंडल) — Part 1', '1OwKIaMOh2xCsDJItneXijPAA2lRmTntY', 11388),
    (5, 'Revenue Board (राजस्व मंडल)', 2, 'Lecture 10 · Revenue Board (राजस्व मंडल) — Part 2', '1RhlXJPoEijVPPYS-5fqD94DY5jUGauu2', 10927),
    (6, 'State Women''s Commission & Human Rights Commission (राज्य महिला आयोग एवं राज्य मानवाधिकार आयोग)', 1, 'Lecture 11 · State Women''s Commission & Rajasthan Human Rights Commission (राज्य महिला आयोग एवं राजस्थान राज्य मानवाधिकार आयोग)', '1t7UWfoeQoHJHPLUDhIYgB7acaZ0lSGnP', 10632),
    (6, 'State Women''s Commission & Human Rights Commission (राज्य महिला आयोग एवं राज्य मानवाधिकार आयोग)', 2, 'Lecture 12 · Rajasthan Human Rights Commission (राजस्थान राज्य मानवाधिकार आयोग)', '1YSSN4AxVj0hofL1qR4Fv94MNjtXGQvGV', 11104),
    (7, 'Secretariat & Directorates (सचिवालय एवं निदेशालय)', 1, 'Lecture 13 · Secretariat (सचिवालय) — Part 1', '1abTeNBpLQ_NhlDWEb-sbgGFJcpMIspZV', 11038),
    (7, 'Secretariat & Directorates (सचिवालय एवं निदेशालय)', 2, 'Lecture 14 · Secretariat (सचिवालय) — Part 2', '1IxggLdaLoKHNP1m_rF5_JgVEt4fLIAet', 10987),
    (7, 'Secretariat & Directorates (सचिवालय एवं निदेशालय)', 3, 'Lecture 16 · Secretariat, Directorate and Executive Departments (सचिवालय, निदेशालय/संचालनालय, कार्यकारी विभाग)', '1xAgXiJ4E6bnRGEkbPqd-LcDiRU1a2DgQ', 7577),
    (8, 'Chief Secretary & Advocate General (मुख्य सचिव एवं महाधिवक्ता)', 1, 'Lecture 17 · Chief Secretary and Advocate General (मुख्य सचिव, महाधिवक्ता)', '19_0Zq1j46BkFcGDJ1RW6JeKSv9XrXTc-', 10336),
    (8, 'Chief Secretary & Advocate General (मुख्य सचिव एवं महाधिवक्ता)', 2, 'Lecture 18 · Advocate General and Rajasthan High Court (महाधिवक्ता, राजस्थान उच्च न्यायालय)', '1C92Jf-hFJBbzPof3qPr2YonbpKy05ms2', 9886),
    (9, 'Rajasthan High Court (राजस्थान उच्च न्यायालय)', 1, 'Lecture 19 · Rajasthan High Court and Divisional Commissioner System (राजस्थान उच्च न्यायालय एवं संभागीय आयुक्त प्रणाली)', '1wXPQXGf3qFC_rvPBQLyQhCWu_kd8ua6J', 11025),
    (10, 'Divisional Commissioner & District Administration (संभागीय आयुक्त प्रणाली एवं जिला प्रशासन)', 1, 'Lecture 20 · Divisional Commissioner System and District Administration (संभागीय आयुक्त प्रणाली एवं जिला प्रशासन)', '1tU7guUA7iuJmtnaDCfLp8yiCogJKh7B_', 11007),
    (10, 'Divisional Commissioner & District Administration (संभागीय आयुक्त प्रणाली एवं जिला प्रशासन)', 2, 'Lecture 21 · District Administration (जिला प्रशासन) — Part 1', '1YApnwkStWQaPrr8UOLQy79IUcfh7sOCn', 10822),
    (10, 'Divisional Commissioner & District Administration (संभागीय आयुक्त प्रणाली एवं जिला प्रशासन)', 3, 'Lecture 22 · District Administration (जिला प्रशासन) — Part 2', '1pb031Itms8leMAQjOCtlmBjtKrWxxPiX', 11436),
    (11, 'Executive Control (कार्यपालिका नियंत्रण)', 1, 'Lecture 23 · Executive Control (कार्यपालिका नियंत्रण)', '1kFymt1Zj4TisKfNU0dJjbK8B23vhD2CX', 10566),
    (12, 'Rajasthan Police (राजस्थान पुलिस)', 1, 'Lecture 24 · Basic Structure of Rajasthan Police (राजस्थान पुलिस की आधारभूत संरचना)', '1xkCkqjsaDXYIRy5dhA5QVmeybKXazGgN', 10840),
    (13, 'Governor (राज्यपाल)', 1, 'Lecture 25 · Role of the Governor (राज्यपाल की भूमिका) — Part 1', '1mOXMrulqtdfWWt9_VLnuMw7Kn6_rPRbP', 11342),
    (13, 'Governor (राज्यपाल)', 2, 'Lecture 26 · Role of the Governor (राज्यपाल की भूमिका) — Part 2', '1oAXjwkjCSBRcKp_t_TmZ2iERfQNPik2F', 10445),
    (13, 'Governor (राज्यपाल)', 3, 'Lecture 27 · Role of the Governor (राज्यपाल की भूमिका) — Part 3', '16X8Es6LKlnzUwnS2dKYhyTOasromoXQp', 10699),
    (14, 'Chief Minister & Council of Ministers (मुख्यमंत्री और मंत्रिपरिषद)', 1, 'Lecture 28 · Chief Minister and Council of Ministers (मुख्यमंत्री और मंत्रिपरिषद)', '1N6gO8QNd9QADFbESsKwu76g0Xz2iwWUu', 11421);

do $$
declare
  v_subject uuid;
  v_chapter uuid;
  r record;
begin
  select id into v_subject from public.subjects where slug = 'rajasthan-polity';
  if v_subject is null then
    raise exception 'Subject "rajasthan-polity" not found';
  end if;

  for r in select distinct chapter_order, chapter_title from _drive_import order by chapter_order loop
    select id into v_chapter from public.chapters where subject_id = v_subject and title = r.chapter_title limit 1;
    if v_chapter is null then
      insert into public.chapters (subject_id, title, sort_order, is_active)
      values (v_subject, r.chapter_title, r.chapter_order, true)
      returning id into v_chapter;
    else
      update public.chapters set sort_order = r.chapter_order, is_active = true where id = v_chapter;
    end if;

    insert into public.lectures (chapter_id, title, youtube_video_id, video_provider, duration_seconds, sort_order)
    select v_chapter, i.lecture_title, i.file_id, 'drive', i.duration, i.lecture_order
    from _drive_import i
    where i.chapter_title = r.chapter_title
      and not exists (select 1 from public.lectures l where l.youtube_video_id = i.file_id);
  end loop;

  -- Hide placeholder chapters that are not part of this series and have no lectures.
  update public.chapters c
     set is_active = false
   where c.subject_id = v_subject
     and c.title not in (select chapter_title from _drive_import)
     and not exists (select 1 from public.lectures l where l.chapter_id = c.id);
end
$$;

commit;

-- Check: should list 14 chapters / 27 lectures.
select c.sort_order, c.title, count(l.id) as lectures, sum(l.duration_seconds) / 60 as minutes
from public.chapters c
join public.subjects s on s.id = c.subject_id and s.slug = 'rajasthan-polity'
left join public.lectures l on l.chapter_id = c.id
where c.is_active
group by c.id
order by c.sort_order;
