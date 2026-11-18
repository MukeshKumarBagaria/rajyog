import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { EXAM_CATEGORIES, QUOTE_CATEGORIES, QUOTE_LANGUAGES } from '@/constants/app';
import { formatClock } from '@/lib/utils/format';
import { videoRefToInput } from '@/lib/youtube/video-id';
import type { ChapterRow, CutoffRow, LectureRow, QuoteRow, SubjectRow } from '@/types/database';

/* Server-renderable field sets used inside <FormDialog>. */

function ActiveCheckbox({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" name="is_active" defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--primary-strong)]" />
      Active (visible to all users)
    </label>
  );
}

export function SubjectFields({ subject }: { subject?: SubjectRow }) {
  return (
    <>
      {subject ? <input type="hidden" name="id" value={subject.id} /> : null}
      <Field label="Name" htmlFor="sub-name">
        <Input id="sub-name" name="name" required defaultValue={subject?.name} />
      </Field>
      <Field label="Slug" htmlFor="sub-slug" hint="Leave blank to generate from the name.">
        <Input id="sub-slug" name="slug" defaultValue={subject?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </Field>
      <Field label="Description" htmlFor="sub-desc">
        <Textarea id="sub-desc" name="description" rows={2} defaultValue={subject?.description ?? ''} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stage" htmlFor="sub-stage">
          <Select id="sub-stage" name="syllabus_stage" defaultValue={subject?.syllabus_stage ?? 'BOTH'}>
            <option value="BOTH">Prelims & Mains</option>
            <option value="PRELIMS">Prelims only</option>
            <option value="MAINS">Mains only</option>
          </Select>
        </Field>
        <Field label="Sort order" htmlFor="sub-sort">
          <Input id="sub-sort" name="sort_order" type="number" min={0} defaultValue={subject?.sort_order ?? 0} />
        </Field>
      </div>
      <ActiveCheckbox defaultChecked={subject?.is_active ?? true} />
    </>
  );
}

export function ChapterFields({
  chapter,
  subjects,
  subjectId,
  nextSort,
}: {
  chapter?: ChapterRow;
  subjects: Pick<SubjectRow, 'id' | 'name'>[];
  subjectId?: string;
  nextSort?: number;
}) {
  return (
    <>
      {chapter ? <input type="hidden" name="id" value={chapter.id} /> : null}
      <Field label="Subject" htmlFor="ch-subject">
        <Select id="ch-subject" name="subject_id" required defaultValue={chapter?.subject_id ?? subjectId ?? ''}>
          <option value="" disabled>
            Choose a subject
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title" htmlFor="ch-title">
        <Input id="ch-title" name="title" required defaultValue={chapter?.title} />
      </Field>
      <Field label="Description" htmlFor="ch-desc">
        <Textarea id="ch-desc" name="description" rows={2} defaultValue={chapter?.description ?? ''} />
      </Field>
      <Field label="Sort order" htmlFor="ch-sort">
        <Input id="ch-sort" name="sort_order" type="number" min={0} defaultValue={chapter?.sort_order ?? nextSort ?? 0} />
      </Field>
      <ActiveCheckbox defaultChecked={chapter?.is_active ?? true} />
    </>
  );
}

export function LectureFields({
  lecture,
  chapters,
  chapterId,
  nextSort,
}: {
  lecture?: LectureRow;
  chapters: { id: string; title: string; subjectName: string }[];
  chapterId?: string;
  nextSort?: number;
}) {
  return (
    <>
      {lecture ? <input type="hidden" name="id" value={lecture.id} /> : null}
      <Field label="Chapter" htmlFor="lec-chapter">
        <Select id="lec-chapter" name="chapter_id" required defaultValue={lecture?.chapter_id ?? chapterId ?? ''}>
          <option value="" disabled>
            Choose a chapter
          </option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subjectName} — {c.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title" htmlFor="lec-title">
        <Input id="lec-title" name="title" required defaultValue={lecture?.title} />
      </Field>
      <Field
        label="YouTube or Google Drive link"
        htmlFor="lec-video"
        hint="YouTube URL/ID, or a Drive file shared as “Anyone with the link”. Only the video ID is stored."
      >
        <Input
          id="lec-video"
          name="video"
          required
          defaultValue={lecture ? videoRefToInput(lecture.video_provider, lecture.youtube_video_id) : undefined}
          placeholder="https://youtu.be/… or https://drive.google.com/file/d/…"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Duration" htmlFor="lec-dur" hint="mm:ss — optional">
          <Input id="lec-dur" name="duration" defaultValue={lecture?.duration_seconds ? formatClock(lecture.duration_seconds) : ''} placeholder="45:30" />
        </Field>
        <Field label="Complete at %" htmlFor="lec-thr">
          <Input id="lec-thr" name="completion_threshold" type="number" min={50} max={100} defaultValue={Math.round(Number(lecture?.completion_threshold ?? 0.9) * 100)} />
        </Field>
        <Field label="Sort order" htmlFor="lec-sort">
          <Input id="lec-sort" name="sort_order" type="number" min={0} defaultValue={lecture?.sort_order ?? nextSort ?? 0} />
        </Field>
      </div>
      <Field label="Description" htmlFor="lec-desc">
        <Textarea id="lec-desc" name="description" rows={2} defaultValue={lecture?.description ?? ''} />
      </Field>
      <ActiveCheckbox defaultChecked={lecture?.is_active ?? true} />
    </>
  );
}

export function QuoteFields({ quote }: { quote?: QuoteRow }) {
  return (
    <>
      {quote ? <input type="hidden" name="id" value={quote.id} /> : null}
      <Field label="Message" htmlFor="q-text">
        <Textarea id="q-text" name="quote" rows={3} required defaultValue={quote?.quote} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Language" htmlFor="q-lang">
          <Select id="q-lang" name="language" defaultValue={quote?.language ?? 'en'}>
            {QUOTE_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="q-cat">
          <Select id="q-cat" name="category" defaultValue={quote?.category ?? 'consistency'}>
            {QUOTE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Attribution" htmlFor="q-attr" hint="Never attribute original text to a historical person.">
          <Input id="q-attr" name="attribution" defaultValue={quote?.attribution ?? 'Rajyog'} />
        </Field>
        <Field label="Show on date" htmlFor="q-date" hint="Optional">
          <Input id="q-date" name="display_date" type="date" defaultValue={quote?.display_date ?? ''} />
        </Field>
      </div>
      <ActiveCheckbox defaultChecked={quote?.is_active ?? true} />
    </>
  );
}

export function CutoffFields({ cutoff }: { cutoff?: CutoffRow }) {
  return (
    <>
      {cutoff ? <input type="hidden" name="id" value={cutoff.id} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Exam year" htmlFor="c-year">
          <Input id="c-year" name="exam_year" type="number" required min={1990} max={2100} defaultValue={cutoff?.exam_year} />
        </Field>
        <Field label="Stage" htmlFor="c-stage">
          <Select id="c-stage" name="exam_stage" defaultValue={cutoff?.exam_stage ?? 'PRELIMS'}>
            <option value="PRELIMS">Prelims</option>
            <option value="MAINS">Mains</option>
          </Select>
        </Field>
        <Field label="Category" htmlFor="c-cat">
          <Select id="c-cat" name="category" defaultValue={cutoff?.category ?? 'GEN'}>
            {EXAM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cutoff type" htmlFor="c-type" hint="e.g. Non-TSP, TSP">
          <Input id="c-type" name="cutoff_type" required defaultValue={cutoff?.cutoff_type ?? 'Non-TSP'} />
        </Field>
        <Field label="Cutoff marks" htmlFor="c-marks">
          <Input id="c-marks" name="cutoff_marks" type="number" step="0.01" required defaultValue={cutoff?.cutoff_marks} />
        </Field>
        <Field label="Exam total marks" htmlFor="c-total">
          <Input id="c-total" name="total_marks" type="number" step="0.01" required defaultValue={cutoff?.total_marks ?? 200} />
        </Field>
        <Field label="Pattern version" htmlFor="c-pattern">
          <Input id="c-pattern" name="exam_pattern_version" required defaultValue={cutoff?.exam_pattern_version ?? 'current'} />
        </Field>
        <Field label="Verified on" htmlFor="c-verified">
          <Input id="c-verified" name="verified_at" type="date" defaultValue={cutoff?.verified_at?.slice(0, 10) ?? ''} />
        </Field>
      </div>
      <Field label="Official source URL" htmlFor="c-src" hint="RPSC notification or official result PDF (https://).">
        <Input id="c-src" name="source_url" type="url" required defaultValue={cutoff?.source_url} placeholder="https://rpsc.rajasthan.gov.in/…" />
      </Field>
      <Field label="Notes" htmlFor="c-notes">
        <Textarea id="c-notes" name="notes" rows={2} defaultValue={cutoff?.notes ?? ''} />
      </Field>
    </>
  );
}
